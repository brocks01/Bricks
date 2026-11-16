"""The Marketplace in the revamp: search, recommended for you (interests, distance, soon), "I went" / "I didn't go" and the counts for hosts."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app

client = TestClient(app)
EMAILS: list[str] = []
EVENTS: list[str] = []
HOSTS: list[str] = []
PLACES: list[str] = []
TAG = uuid.uuid4().hex[:6]  # every place and title in this file carries it, so tests never meet another run's data


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EVENTS:
            conn.execute(text("delete from market_events where id = :e"), {"e": e})
        for h in HOSTS:
            conn.execute(text("delete from hosts where id = :h"), {"h": h})
        for k in PLACES:
            conn.execute(text("delete from geo_places where key = :k"), {"k": k})
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person(area=None, interests=(), admin=False) -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    with engine().begin() as conn:
        conn.execute(text("update users set area_name = :a, interests = :i, is_platform_admin = :ad where id = :u"), {"a": area, "i": list(interests), "ad": admin, "u": s["user"]["id"]})
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"]}


def event(title, hours=72, area="Nowhere", address=None, interests=(), host=None, venue="Community Hall"):
    with engine().begin() as conn:
        eid = str(conn.execute(text(
            "insert into market_events (title, venue_name, area_name, address, starts_at, interests, host_id) values (:t, :v, :ar, :ad, now() + make_interval(hours => :h), :i, :ho) returning id"),
            {"t": f"{title} {TAG}", "v": venue, "ar": area, "ad": address, "h": hours, "i": list(interests), "ho": host}).scalar_one())
    EVENTS.append(eid)
    return eid


def host(name):
    with engine().begin() as conn:
        hid = str(conn.execute(text("insert into hosts (name, kind) values (:n, 'aac') returning id"), {"n": f"{name} {TAG}"}).scalar_one())
    HOSTS.append(hid)
    return hid


def place(address, lat, lng):
    key = " ".join(address.lower().split())
    PLACES.append(key)
    with engine().begin() as conn:
        conn.execute(text("insert into geo_places (key, lat, lng, found) values (:k, :la, :ln, true) on conflict (key) do update set lat = excluded.lat, lng = excluded.lng, found = true"),
                     {"k": key, "la": lat, "ln": lng})


def going(p, eid, on=True):
    assert client.post(f"/v1/market/events/{eid}/going", json={"going": on}, headers=p["h"]).status_code == 200


def shift(eid, hours):
    """Move an event so it started `hours` ago (the person already said they were going while it was upcoming)."""
    with engine().begin() as conn:
        conn.execute(text("update market_events set starts_at = now() - make_interval(hours => :h) where id = :e"), {"h": hours, "e": eid})


def answer(p, eid, attended):
    return client.post(f"/v1/market/events/{eid}/attendance", json={"attended": attended}, headers=p["h"])


def leaves(p):
    return client.get("/v1/nodes/wisdom", headers=p["h"]).json()["leaves"]


def mine(p):
    r = client.get("/v1/market/mine", headers=p["h"])
    assert r.status_code == 200, r.text
    return {k: [e["id"] for e in v] for k, v in r.json().items()}


def test_the_answer_needs_going_and_the_right_time():
    p = person()
    stranger = event("Not going")
    shift(stranger, 2)
    assert answer(p, stranger, True).status_code == 409 and answer(p, stranger, True).json()["detail"]["code"] == "not_going"
    soon = event("Not started")
    going(p, soon)
    assert answer(p, soon, True).json()["detail"]["code"] == "not_started"
    old = event("Long ago")
    going(p, old)
    shift(old, 31 * 24)
    assert answer(p, old, True).json()["detail"]["code"] == "too_late"
    assert client.delete(f"/v1/market/events/{old}/attendance", headers=p["h"]).status_code == 409
    assert client.post(f"/v1/market/events/{old}/attendance", json={"attended": True, "source": "fax"}, headers=p["h"]).status_code == 422
    assert leaves(p) == 0


def test_change_and_undo_and_the_leaf_follows_the_answer():
    p = person()
    hid = host("Tampines West AAC")
    eid = event("Makers' Market Day", host=hid)
    going(p, eid)
    shift(eid, 3)
    assert mine(p)["to_answer"] == [eid]
    assert answer(p, eid, True).json() == {"attended": True}
    assert leaves(p) == 1
    leaf = client.get("/v1/nodes/wisdom", headers=p["h"]).json()["events"][0]
    assert leaf["source"] == "market" and leaf["ref_id"] == eid and leaf["source_name"] == f"Tampines West AAC {TAG}"
    assert answer(p, eid, True).status_code == 200 and leaves(p) == 1  # the same answer twice: still one leaf
    m = client.get("/v1/market/mine", headers=p["h"]).json()
    assert [e["id"] for e in m["answered"]] == [eid] and m["answered"][0]["attended"] is True and m["to_answer"] == []
    assert answer(p, eid, False).json() == {"attended": False} and leaves(p) == 0  # changed to "I didn't go": the leaf goes
    assert answer(p, eid, True).status_code == 200 and leaves(p) == 1
    assert client.delete(f"/v1/market/events/{eid}/attendance", headers=p["h"]).json() == {"attended": None}
    assert leaves(p) == 0 and mine(p)["to_answer"] == [eid]
    with engine().begin() as conn:
        src = conn.execute(text("select count(*) from market_event_attendance where event_id = :e"), {"e": eid}).scalar()
    assert src == 0
    assert client.post(f"/v1/market/events/{eid}/attendance", json={"attended": True, "source": "agent"}, headers=p["h"]).status_code == 200
    with engine().begin() as conn:
        assert conn.execute(text("select source from market_event_attendance where event_id = :e and user_id = :u"), {"e": eid, "u": p["id"]}).scalar() == "agent"


def test_my_market_days_are_upcoming_waiting_or_answered():
    p = person()
    up, wait, done, other = event("Upcoming day"), event("Waiting day"), event("Answered day"), event("Somebody else's day")
    for e in (up, wait, done):
        going(p, e)
    shift(wait, 5)
    shift(done, 30)
    shift(other, 5)
    answer(p, done, False)
    m = mine(p)
    assert m["upcoming"] == [up] and m["to_answer"] == [wait] and m["answered"] == [done]
    assert mine(person()) == {"upcoming": [], "to_answer": [], "answered": []}


def test_summaries_are_counts_for_admins_and_the_events_own_host_only():
    a, b, c = person(), person(), person()
    owner, editor, other_owner, nobody, admin = person(), person(), person(), person(), person(admin=True)
    hid, other = host("Bedok AAC"), host("Jurong AAC")
    with engine().begin() as conn:
        for u, h, role in ((owner, hid, "owner"), (editor, hid, "editor"), (other_owner, other, "owner")):
            conn.execute(text("insert into host_members (host_id, user_id, role) values (:h, :u, :r)"), {"h": h, "u": u["id"], "r": role})
    eid = event("Bedok market day", host=hid)
    for p in (a, b, c):
        going(p, eid)
    shift(eid, 4)
    answer(a, eid, True)
    answer(b, eid, False)
    for who in (owner, editor, admin):
        r = client.get(f"/v1/market/events/{eid}/attendance-summary", headers=who["h"])
        assert r.status_code == 200, r.text
        s = r.json()
        assert (s["going"], s["went"], s["didnt_go"], s["no_answer"], s["turn_up_rate"]) == (3, 1, 1, 1, 0.333)
    for who in (other_owner, nobody, a):
        assert client.get(f"/v1/market/events/{eid}/attendance-summary", headers=who["h"]).status_code == 403
    assert client.get("/v1/market/attendance/summary", headers=owner["h"]).status_code == 403
    since = (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()
    r = client.get("/v1/market/attendance/summary", params={"from": since}, headers=admin["h"])
    assert r.status_code == 200, r.text
    row = next(e for e in r.json()["events"] if e["id"] == eid)
    assert row["went"] == 1 and r.json()["totals"]["going"] >= 3
    flat = str(r.json()) + str(client.get(f"/v1/market/events/{eid}/attendance-summary", headers=admin["h"]).json())
    assert "@example.com" not in flat and a["id"] not in flat and "display_name" not in flat  # counts only, never who


def test_search_finds_words_in_the_title_the_venue_the_area_and_the_host():
    p = person()
    hid = host("Silver Threads")
    e1 = event("Batik painting morning", venue="Kampung Admiralty")
    e2 = event("Gardening swap", area=f"Woodlands{TAG}")
    e3 = event("Chess afternoon", host=hid)
    q = lambda word: [e["id"] for e in client.get("/v1/market/events", params={"q": word, "limit": 30}, headers=p["h"]).json()["events"]]  # noqa: E731
    assert q(f"batik painting morning {TAG}") == [e1]
    assert e1 in q("kampung admiralty") and e2 in q(f"woodlands{TAG}") and e3 in q(f"silver threads {TAG}")
    assert q(f"no such words {TAG}") == []
    r = [e["id"] for e in client.get("/v1/market/events/recommended", params={"q": f"chess afternoon {TAG}"}, headers=p["h"]).json()["events"]]
    assert r == [e3]


def test_recommended_ranks_by_interests_nearness_and_area_and_leaves_out_what_i_am_going_to():
    area = f"Tampines{TAG}"
    p = person(area=area, interests=("cooking", "music"))
    place(f"{area}, Singapore", 1.3530, 103.9450)
    place(f"1 Near Street {TAG}", 1.3560, 103.9450)  # about 0.3 km
    place(f"9 Middle Road {TAG}", 1.3830, 103.9450)  # about 3.3 km
    place(f"99 Far Road {TAG}", 1.4500, 103.9450)  # about 11 km
    plain = event("Plain day", hours=24 * 20)
    cook = event("Cooking and songs", hours=24 * 20, interests=("cooking", "music"))
    near = event("Near day", hours=24 * 20, address=f"1 Near Street {TAG}")
    middle = event("Middle day", hours=24 * 20, address=f"9 Middle Road {TAG}")
    far = event("Far day", hours=24 * 20, address=f"99 Far Road {TAG}")
    same_area = event("Same area day", hours=24 * 20, area=area)
    soon = event("Soon day", hours=24 * 2)
    mine_ = event("I am going", hours=24 * 3, interests=("cooking",))
    going(p, mine_)
    got = client.get("/v1/market/events/recommended", params={"q": TAG, "limit": 50}, headers=p["h"]).json()["events"]
    ids = [e["id"] for e in got]
    by = {e["id"]: e for e in got}
    assert mine_ not in ids  # what the person is already going to is left out
    assert ids[0] == cook and by[cook]["score"] == 4 and by[cook]["reasons"] == ["cooking", "music"]  # two shared interests, +2 each
    assert by[near]["score"] == 3 and by[middle]["score"] == 2 and by[far]["score"] == 1 and by[plain]["score"] == 0  # nearer raises
    assert ids.index(near) < ids.index(middle) < ids.index(far) < ids.index(plain)
    assert by[near]["distance_km"] == pytest.approx(0.3, abs=0.1) and by[near]["reasons"][0] == "near" and by[plain]["distance_km"] is None
    assert by[same_area]["score"] == 2 and by[same_area]["reasons"] == ["near"]  # no coordinates, the same area name
    assert by[soon]["score"] == 1 and by[soon]["reasons"] == ["soon"]
    assert by[soon]["interests"] == [] and by[cook]["interests"] == ["cooking", "music"]
    vol = client.get("/v1/market/events/recommended", params={"q": TAG, "intent": "volunteer"}, headers=p["h"]).json()["events"]
    assert vol == []  # the intent filter still works (these test events are for earning and enjoying)


def test_an_event_takes_only_the_eight_interests():
    admin = person(admin=True)
    body = {"title": f"Tai chi in the park {TAG}", "venue_name": "Tampines Eco Green", "starts_at": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(), "interests": ["taichi", "walking", "taichi"]}
    r = client.post("/v1/market/events", json=body, headers=admin["h"])
    assert r.status_code == 201, r.text
    EVENTS.append(r.json()["id"])
    assert client.get(f"/v1/market/events/{r.json()['id']}", headers=admin["h"]).json()["interests"] == ["walking", "taichi"]
    assert client.post("/v1/market/events", json={**body, "interests": ["knitting"]}, headers=admin["h"]).status_code == 422
