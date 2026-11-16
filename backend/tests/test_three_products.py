"""Three products, three pains: Communities (belonging: a circle's feeling, audience, hosts and import), Wisdom (three domains, free or paid, support requests), Marketplace (opportunities near a person, hosted by others)."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app

client = TestClient(app)
EMAILS: list[str] = []
UTC = timezone.utc
TAG = uuid.uuid4().hex[:6]


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        conn.execute(text("delete from market_events where title like :t"), {"t": f"TP{TAG}%"})
        conn.execute(text("delete from communities where name like :t"), {"t": f"TP{TAG}%"})
        conn.execute(text("delete from hosts where name like :t"), {"t": f"TP{TAG}%"})
        for e in EMAILS:
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person(name="Rajan Pillai", band="60plus", gender=None, admin=False) -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    h = {"Authorization": f"Bearer {s['access_token']}"}
    client.patch("/v1/me", json={"display_name": name, "age_band": band}, headers=h)
    if gender:
        client.put("/v1/onboarding/basics", json={"answers": {"gender": gender}}, headers=h)
    if admin:
        with engine().begin() as conn:
            conn.execute(text("update users set is_platform_admin = true where id = :u"), {"u": s["user"]["id"]})
    return {"h": h, "id": s["user"]["id"]}


def skill(p, name, /, **args):
    return client.post(f"/v1/skills/{name}", json={"args": args}, headers=p["h"]).json()


def host(admin, name="Ang Mo Kio AAC", kind="aac", area="Ang Mo Kio") -> str:
    return client.post("/v1/hosts", json={"name": f"TP{TAG} {name}", "kind": kind, "area_name": area}, headers=admin["h"]).json()["id"]


# ---------- Wisdom ----------
def test_wisdom_has_three_domains_and_an_offer_can_be_free_or_paid_with_a_price_note():
    mentor, learner = person("Hari Menon"), person("Aarav Nair", band="40to59")
    assert client.post("/v1/wisdom/capsules", json={"title": "Chhath at the ghat", "body": "We prepared thekua for two days and sang at dawn by the river, all the women together.", "kind": "cultural"}, headers=mentor["h"]).status_code == 201
    assert client.post("/v1/wisdom/capsules", json={"title": "Old kind", "body": "A long enough body text for this old kind.", "kind": "recipe"}, headers=mentor["h"]).status_code == 422
    assert client.post("/v1/wisdom/capsules", json={"title": "No kind given", "body": "A long enough body text without a kind."}, headers=mentor["h"]).status_code == 201
    kinds = {c["kind"] for c in client.get("/v1/wisdom/capsules/mine", headers=mentor["h"]).json()["capsules"]}
    assert kinds == {"cultural", "social"}  # the default domain is social
    free = client.post("/v1/wisdom/offers", json={"title": "Fixing car engines", "domain": "professional", "mode": "paid", "price_note": "$30 an hour, first call free"}, headers=mentor["h"])
    assert free.status_code == 201
    found = client.get("/v1/wisdom/offers", params={"domain": "professional", "mode": "paid"}, headers=learner["h"]).json()["offers"]
    assert found[0]["price_note"] == "$30 an hour, first call free" and found[0]["domain"] == "professional" and found[0]["mode"] == "paid"
    assert client.get("/v1/wisdom/offers", params={"domain": "cultural"}, headers=learner["h"]).json()["offers"] == [] or all(o["domain"] == "cultural" for o in client.get("/v1/wisdom/offers", params={"domain": "cultural"}, headers=learner["h"]).json()["offers"])
    assert client.post("/v1/wisdom/offers", json={"title": "Bad domain", "domain": "sports"}, headers=mentor["h"]).status_code == 422
    said = skill(learner, "find_a_mentor", search="engines", domain="professional", mode="paid")["offers"]
    assert said[0]["mode"] == "paid"


def test_an_elder_asks_for_a_hand_and_the_next_generation_answers_after_confirming_15_plus():
    elder, youth = person("Meena Iyer"), person("Tia Lim", band="under40")
    assert skill(elder, "ask_for_help", topic="Set up video calls with my grandchildren")["posted"]
    learn = client.post("/v1/wisdom/requests", json={"topic": "How to start a bakery", "kind": "learn"}, headers=person("Zara Khan", band="40to59")["h"])
    assert learn.status_code == 201
    needs = client.get("/v1/wisdom/requests", params={"kind": "support"}, headers=youth["h"]).json()["requests"]
    assert any(r["topic"].startswith("Set up video calls") and r["kind"] == "support" for r in needs) and all(r["kind"] == "support" for r in needs)
    assert skill(youth, "who_needs_help", search="video")["requests"][0]["by"] == "Meena"
    target = next(r for r in needs if r["topic"].startswith("Set up video calls"))
    refused = client.post(f"/v1/wisdom/requests/{target['id']}/answer", json={}, headers=youth["h"])
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == "confirm_age_15"
    assert skill(youth, "save_answer", section="learn", field="age_15_plus", value="yes")["saved"] == "age_15_plus"
    ok = client.post(f"/v1/wisdom/requests/{target['id']}/answer", json={"message": "I can come on Saturday"}, headers=youth["h"])
    assert ok.status_code == 201
    waiting = client.get("/v1/wisdom/connections", headers=elder["h"]).json()["connections"][0]
    assert waiting["waiting_for_me"] is True and waiting["with"] == "Tia"
    assert client.post(f"/v1/wisdom/connections/{waiting['id']}/decide", json={"accept": True}, headers=elder["h"]).json()["status"] == "accepted"
    assert "help" in client.get("/v1/profile", headers=youth["h"]).json()["roles"]


# ---------- Communities ----------
def test_a_circle_has_a_feeling_and_an_audience_and_a_gendered_circle_needs_the_persons_own_answer():
    admin = person("Platform Admin", admin=True)
    made = client.post("/v1/communities", json={"name": f"TP{TAG} Bihari men in Singapore", "circle": "origin", "audience": "men", "privacy": "open"}, headers=admin["h"])
    assert made.status_code == 200
    cid = made.json()["id"]
    explore = client.get("/v1/communities/explore", params={"q": f"TP{TAG} Bihari"}, headers=admin["h"]).json()["communities"]
    assert explore[0]["circle"] == "origin" and explore[0]["audience"] == "men" and explore[0]["source"] == "people"
    unknown, woman, man = person("Ravi Kumar"), person("Sunita Devi", gender="woman"), person("Mohan Lal", gender="man")
    assert client.post(f"/v1/communities/{cid}/join", headers=unknown["h"]).json()["detail"]["code"] == "gender_needed"  # not asked inferred: the person is asked
    refused = client.post(f"/v1/communities/{cid}/join", headers=woman["h"])
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == "audience_men"
    assert client.post(f"/v1/communities/{cid}/join", headers=man["h"]).status_code == 200
    assert skill(woman, "join_community", name=f"TP{TAG} Bihari men in Singapore")["error"] == "audience_men"
    for_all = client.post("/v1/communities", json={"name": f"TP{TAG} Chhath for everyone", "circle": "faith", "privacy": "open"}, headers=admin["h"]).json()["id"]
    assert client.post(f"/v1/communities/{for_all}/join", headers=woman["h"]).status_code == 200


def test_an_active_ageing_centres_community_is_imported_once_and_updated_when_imported_again():
    admin, other = person("Platform Admin", admin=True), person("Ravi Kumar")
    hid = host(admin)
    body = {"host_id": hid, "external_ref": "aac-amk-taichi", "name": f"TP{TAG} Tai chi at AMK", "description": "Mornings at the centre", "area_name": "Ang Mo Kio", "circle": "interest", "audience": "all"}
    assert client.post("/v1/communities/import", json=body, headers=other["h"]).status_code == 403
    first = client.post("/v1/communities/import", json=body, headers=admin["h"]).json()
    assert first["created"] is True
    again = client.post("/v1/communities/import", json={**body, "description": "Mornings and evenings"}, headers=admin["h"]).json()
    assert again == {"id": first["id"], "created": False}
    row = client.get(f"/v1/communities/explore", params={"q": f"TP{TAG} Tai chi"}, headers=admin["h"]).json()["communities"]
    assert len(row) == 1 and row[0]["source"] == "imported" and row[0]["description"] == "Mornings and evenings"
    assert client.post("/v1/communities/import", json={**body, "host_id": str(uuid.uuid4())}, headers=admin["h"]).status_code in (404, 422)


# ---------- Marketplace ----------
def tomorrow(hh=9) -> datetime:
    local = datetime.now(UTC) + timedelta(hours=8) + timedelta(days=1)
    return local.replace(hour=hh, minute=0, second=0, microsecond=0) - timedelta(hours=8)


def test_opportunities_near_a_person_come_from_hosts_with_what_they_can_do_and_importing_updates_in_place():
    admin, member = person("Platform Admin", admin=True), person("Meena Iyer")
    hid = host(admin, "Tampines Hub", kind="mall", area="Tampines")
    start = tomorrow()
    market = {"title": f"TP{TAG} Saturday market", "venue_name": "Tampines Hub", "starts_at": start.isoformat(), "ends_at": (start + timedelta(hours=5)).isoformat(), "host_id": hid, "kind": "market_day",
              "intents": ["earn", "enjoy"], "area_name": "Tampines", "external_ref": "ref-market-1", "external_url": "https://example.org/market"}
    assert client.post("/v1/market/events", json=market, headers=member["h"]).status_code == 403
    made = client.post("/v1/market/events", json=market, headers=admin["h"])
    assert made.status_code == 201 and made.json()["created"] is True
    volunteer = {"title": f"TP{TAG} Befriending volunteers", "venue_name": "AMK Active Ageing Centre", "starts_at": start.isoformat(), "host_id": hid, "kind": "volunteer", "intents": ["volunteer", "contribute"],
                 "area_name": "Ang Mo Kio", "external_ref": "ref-vol-1"}
    assert client.post("/v1/market/events", json=volunteer, headers=admin["h"]).status_code == 201
    again = client.post("/v1/market/events", json={**market, "title": f"TP{TAG} Saturday market (updated)"}, headers=admin["h"]).json()
    assert again == {"id": made.json()["id"], "created": False}
    allv = [e for e in client.get("/v1/market/events", params={"limit": 30}, headers=member["h"]).json()["events"] if e["title"].startswith(f"TP{TAG}")]
    assert len(allv) == 2
    m = next(e for e in allv if e["kind"] == "market_day")
    assert m["title"].endswith("(updated)") and m["host"] == f"TP{TAG} Tampines Hub" and m["host_kind"] == "mall" and m["source"] == "imported" and m["external_url"] == "https://example.org/market" and "earn" in m["intents"]
    vol = [e for e in client.get("/v1/market/events", params={"limit": 30, "intent": "volunteer"}, headers=member["h"]).json()["events"] if e["title"].startswith(f"TP{TAG}")]
    assert [e["kind"] for e in vol] == ["volunteer"]
    near = [e for e in client.get("/v1/market/events", params={"limit": 30, "area": "tampines"}, headers=member["h"]).json()["events"] if e["title"].startswith(f"TP{TAG}")]
    assert [e["kind"] for e in near] == ["market_day"]
    said = skill(member, "market_events", intent="volunteer")["events"]
    assert any(e["title"].startswith(f"TP{TAG}") and e["what_you_can_do"] == ["volunteer", "contribute"] and e["host"].endswith("Tampines Hub") for e in said)
    bad = client.post("/v1/market/events", json={**market, "external_ref": "x", "intents": ["steal"]}, headers=admin["h"])
    assert bad.status_code == 422 or bad.status_code == 400


def test_only_admins_make_hosts_and_anyone_signed_in_can_list_them():
    admin, other = person("Platform Admin", admin=True), person("Ravi Kumar")
    assert client.post("/v1/hosts", json={"name": f"TP{TAG} Not allowed"}, headers=other["h"]).status_code == 403
    hid = host(admin, "Bishan Mall", kind="mall", area="Bishan")
    names = [h["name"] for h in client.get("/v1/hosts", headers=other["h"]).json()["hosts"]]
    assert f"TP{TAG} Bishan Mall" in names and hid
