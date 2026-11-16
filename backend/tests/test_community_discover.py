"""Finding communities: the ranking (interests, distance, the area fallback), search, who is left out, the card, the WhatsApp privacy rule and the leader's details.
Each test searches for its own unique word, so communities from other tests or from a seed never get in the way. Google is never called."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.geo import service as geo

client = TestClient(app)
EMAILS: list[str] = []
LINK = "https://chat.whatsapp.com/AbCdEfGhIj1234"


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        conn.execute(text("delete from geo_places where key like 'disc %'"))
        for e in EMAILS:
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person(area: str | None = None, interests: list[str] | None = None, gender: str | None = None) -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    h = {"Authorization": f"Bearer {s['access_token']}"}
    if gender:
        client.put("/v1/onboarding/basics", json={"answers": {"gender": gender}}, headers=h)
    with engine().begin() as conn:
        conn.execute(text("update users set area_name = :a, interests = cast(:i as text[]) where id = :u"), {"a": area, "i": interests or [], "u": s["user"]["id"]})
    return {"h": h, "id": s["user"]["id"]}


def community(lead: dict, name: str, area: str | None = None, address: str | None = None, interests: list[str] | None = None, audience: str = "all", members: int = 0) -> str:
    cid = client.post("/v1/communities", json={"name": name, "privacy": "open"}, headers=lead["h"]).json()["id"]
    with engine().begin() as conn:
        conn.execute(text("update communities set area_name = :ar, address = :ad, interests = cast(:i as text[]), audience = :au where id = :c"),
                     {"ar": area, "ad": address, "i": interests or [], "au": audience, "c": cid})
    for _ in range(members):
        client.post(f"/v1/communities/{cid}/join", headers=person()["h"])
    return cid


def names(me: dict, q: str, limit: int = 10) -> list[str]:
    r = client.get(f"/v1/communities/recommended?q={q}&limit={limit}", headers=me["h"])
    assert r.status_code == 200
    return [c["name"] for c in r.json()["communities"]]


def test_shared_interests_rank_first_and_the_reason_says_so(monkeypatch):
    monkeypatch.delenv("GOOGLE_MAPS_API_KEY", raising=False)
    tag, lead = uuid.uuid4().hex[:8], person()
    community(lead, f"Big Club {tag}", members=3)
    community(lead, f"Walkers {tag}", interests=["walking", "music"])
    me = person(interests=["walking"])
    assert names(me, tag) == [f"Walkers {tag}", f"Big Club {tag}"]
    card = client.get(f"/v1/communities/recommended?q=Walkers {tag}", headers=me["h"]).json()["communities"][0]
    assert {"kind": "interest", "key": "walking"} in card["reasons"]


def test_the_same_area_wins_without_a_maps_key(monkeypatch):
    monkeypatch.delenv("GOOGLE_MAPS_API_KEY", raising=False)
    tag, lead = uuid.uuid4().hex[:8], person()
    community(lead, f"Far Away {tag}", area="Woodlands, Singapore", members=2)
    community(lead, f"Next Door {tag}", area="Bishan, Singapore")
    me = person(area="Bishan")
    assert names(me, tag)[0] == f"Next Door {tag}"
    card = client.get(f"/v1/communities/recommended?q=Next Door {tag}", headers=me["h"]).json()["communities"][0]
    assert card["distance_km"] is None and card["reasons"][0]["kind"] == "near"


def test_nearer_ranks_higher_with_a_key(monkeypatch):
    places = {"disc home": (1.3508, 103.8485), "disc one km": (1.3598, 103.8485), "disc twelve km": (1.3508, 103.9565)}
    monkeypatch.setenv("GOOGLE_MAPS_API_KEY", "test-key")
    monkeypatch.setattr(geo, "_fetch_geocode", lambda a: {"status": "OK", "results": [{"geometry": {"location": dict(zip(("lat", "lng"), places[geo.normalise(a)]))}}]})
    tag, lead = uuid.uuid4().hex[:8], person()
    community(lead, f"Twelve {tag}", address="disc twelve km", members=2)
    community(lead, f"One {tag}", address="disc one km")
    me = person(area="disc home")
    found = client.get(f"/v1/communities/recommended?q={tag}", headers=me["h"]).json()["communities"]
    assert [c["name"] for c in found] == [f"One {tag}", f"Twelve {tag}"]
    assert 0.9 < found[0]["distance_km"] < 1.1 and 11 < found[1]["distance_km"] < 13


def test_left_out_my_own_the_wrong_audience_and_invite_only_and_the_limit():
    tag, lead = uuid.uuid4().hex[:8], person()
    mine = community(lead, f"Mine {tag}")
    community(lead, f"Women Only {tag}", audience="women")
    community(lead, f"Men Only {tag}", audience="men")
    secret = community(lead, f"Secret {tag}")
    with engine().begin() as conn:
        conn.execute(text("update communities set privacy = 'invite' where id = :c"), {"c": secret})
    man = person(gender="man")
    client.post(f"/v1/communities/{mine}/join", headers=man["h"])
    assert sorted(names(man, tag)) == [f"Men Only {tag}"]
    unknown = person()  # no gender declared: both stay, the join will ask
    assert sorted(names(unknown, tag)) == sorted([f"Mine {tag}", f"Women Only {tag}", f"Men Only {tag}"])
    assert len(names(unknown, tag, limit=2)) == 2


def test_search_finds_by_name_area_and_description():
    tag, lead = uuid.uuid4().hex[:8], person()
    cid = community(lead, f"Kopi Corner {tag}", area=f"Ang Mo Kio {tag}")
    with engine().begin() as conn:
        conn.execute(text("update communities set description = :d where id = :c"), {"d": f"Chess and kopi {tag}x", "c": cid})
    me = person()
    assert names(me, f"ang mo kio {tag}") == [f"Kopi Corner {tag}"]
    assert names(me, f"{tag}x") == [f"Kopi Corner {tag}"]
    assert names(me, f"nothing-{tag}") == []


def test_the_whatsapp_link_reaches_members_only_and_only_a_lead_sets_it():
    tag, lead = uuid.uuid4().hex[:8], person()
    cid = community(lead, f"Chat Group {tag}")
    r = client.patch(f"/v1/communities/{cid}/details", json={"whatsapp_url": LINK, "address": "1 Bishan Road", "interests": ["chess"]}, headers=lead["h"])
    assert r.status_code == 200 and r.json()["community"]["whatsapp_url"] == LINK and r.json()["community"]["address"] == "1 Bishan Road"
    stranger = person()
    card = client.get(f"/v1/communities/recommended?q={tag}", headers=stranger["h"]).json()["communities"][0]
    assert card["has_whatsapp"] is True and card["whatsapp_url"] is None and card["faces"] == []
    about = client.get(f"/v1/communities/{cid}/about", headers=stranger["h"]).json()
    assert about["community"]["whatsapp_url"] is None and LINK not in str(about)
    client.post(f"/v1/communities/{cid}/join", headers=stranger["h"])
    mine = client.get("/v1/communities/cards/mine", headers=stranger["h"]).json()["communities"]
    assert [c["whatsapp_url"] for c in mine if c["id"] == cid] == [LINK]
    # a member who is not the lead may not change it; a bad link and an unknown interest are refused
    assert client.patch(f"/v1/communities/{cid}/details", json={"whatsapp_url": None}, headers=stranger["h"]).status_code == 403
    assert client.patch(f"/v1/communities/{cid}/details", json={"whatsapp_url": "https://evil.example.com/x"}, headers=lead["h"]).status_code == 422
    assert client.patch(f"/v1/communities/{cid}/details", json={"interests": ["skydiving"]}, headers=lead["h"]).status_code == 422
    assert client.get(f"/v1/communities/{uuid.uuid4()}/about", headers=stranger["h"]).status_code == 404


def test_the_card_has_the_next_event_and_a_member_sees_faces():
    tag, lead = uuid.uuid4().hex[:8], person()
    with engine().begin() as conn:
        conn.execute(text("update users set display_name = 'Meena Pillai' where id = :u"), {"u": lead["id"]})
    cid = community(lead, f"Morning Walk {tag}")
    client.post(f"/v1/communities/{cid}/activities", json={"title": "Walk round the park", "starts_at": "2099-01-01T07:00:00+08:00", "location": "Bishan Park"}, headers=lead["h"])
    card = client.get("/v1/communities/cards/mine", headers=lead["h"]).json()["communities"]
    card = next(c for c in card if c["id"] == cid)
    assert card["next_event"]["title"] == "Walk round the park" and card["next_event"]["place"] == "Bishan Park"
    assert card["is_member"] and card["faces"] == [{"name": "Meena", "avatar_url": None}]
    stranger = person()  # someone who is not in it sees the leader's first name, never the members
    seen = client.get(f"/v1/communities/{cid}/about", headers=stranger["h"]).json()
    assert seen["community"]["faces"] == [] and seen["community"]["leader"] == "Meena" and seen["events"][0]["title"] == "Walk round the park"


def test_a_gathering_says_when_i_checked_in():
    from datetime import datetime, timedelta, timezone

    tag, lead = uuid.uuid4().hex[:8], person()
    cid = community(lead, f"Here Now {tag}")
    start = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    aid = client.post(f"/v1/communities/{cid}/activities", json={"title": "Tai chi now", "starts_at": start}, headers=lead["h"]).json()["id"]
    before = client.get(f"/v1/communities/{cid}/activities?when=upcoming", headers=lead["h"]).json()["activities"]
    assert [a["i_attended"] for a in before if a["id"] == aid] == [False]
    assert client.post(f"/v1/communities/activities/{aid}/checkin", json={}, headers=lead["h"]).status_code == 200
    after = client.get(f"/v1/communities/{cid}/activities?when=upcoming", headers=lead["h"]).json()["activities"]
    assert [a["i_attended"] for a in after if a["id"] == aid] == [True]
