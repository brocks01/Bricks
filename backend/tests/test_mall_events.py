"""Market events in a mall or a community centre: communities go together, members say they are going, seniors take stalls."""
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


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EVENTS:
            conn.execute(text("delete from market_events where id = :e"), {"e": e})
        for e in EMAILS:
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person(band=None) -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    if band:
        with engine().begin() as conn:
            conn.execute(text("update users set age_band = :b where id = :u"), {"b": band, "u": s["user"]["id"]})
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"]}


def event(title="Silver Makers Market", stalls=2, days=4):
    with engine().begin() as conn:
        eid = str(conn.execute(text("insert into market_events (title, venue_name, venue_kind, area_name, starts_at, ends_at, stalls_total) values (:t, 'Northpoint City', 'mall', 'Yishun', :s, :e, :n) returning id"),
                                {"t": title, "s": datetime.now(timezone.utc) + timedelta(days=days), "e": datetime.now(timezone.utc) + timedelta(days=days, hours=5), "n": stalls}).scalar_one())
    EVENTS.append(eid)
    return eid


def community(lead, *members):
    cid = client.post("/v1/communities", json={"name": f"Mall Heights {uuid.uuid4().hex[:4]}"}, headers=lead["h"]).json()["id"]
    code = client.get(f"/v1/communities/{cid}", headers=lead["h"]).json()["community"]["invite_code"]
    for m in members:
        client.post("/v1/communities/join", json={"code": code}, headers=m["h"])
    return cid


def test_the_list_shows_the_venue_and_nothing_about_other_peoples_communities_going():
    p = person()
    eid = event()
    ev = next(e for e in client.get("/v1/market/events", headers=p["h"]).json()["events"] if e["id"] == eid)
    assert ev["venue_name"] == "Northpoint City" and ev["venue_kind"] == "mall" and ev["stalls_left"] == 2 and ev["going_count"] == 0 and ev["i_going"] is False and ev["my_communities"] == []


def test_a_lead_plans_the_visit_members_go_together_and_the_count_shows_for_the_community():
    lead, m1, m2, outsider = person(), person(), person(), person()
    cid = community(lead, m1, m2)
    eid = event()
    assert client.post(f"/v1/market/events/{eid}/communities/{cid}", json={"on": True}, headers=m1["h"]).json()["detail"]["code"] == "not_a_lead"  # members cannot plan
    assert client.post(f"/v1/market/events/{eid}/communities/{cid}", json={"on": True}, headers=lead["h"]).json() == {"planned": True}
    assert client.post(f"/v1/market/events/{eid}/going", json={"going": True}, headers=m1["h"]).json() == {"going": True, "with": cid}
    client.post(f"/v1/market/events/{eid}/going", json={"going": True}, headers=m2["h"])
    ev = next(e for e in client.get("/v1/market/events", headers=m1["h"]).json()["events"] if e["id"] == eid)
    assert ev["going_count"] == 2 and ev["i_going"] is True and ev["my_communities"][0]["going"] == 2 and ev["going_with"] == cid
    assert [c["going"] for c in client.get(f"/v1/market/community-events/{cid}", headers=m2["h"]).json()["events"][0]["my_communities"]] == [2]
    assert client.get(f"/v1/market/community-events/{cid}", headers=outsider["h"]).status_code == 403  # a community's plans are for its members
    client.post(f"/v1/market/events/{eid}/going", json={"going": False}, headers=m2["h"])
    assert next(e for e in client.get("/v1/market/events", headers=m1["h"]).json()["events"] if e["id"] == eid)["going_count"] == 1


def test_someone_not_in_a_planning_community_just_goes_on_their_own():
    p = person()
    eid = event()
    assert client.post(f"/v1/market/events/{eid}/going", json={"going": True}, headers=p["h"]).json() == {"going": True, "with": None}


def test_cancelling_the_plan_takes_the_community_out_and_keeps_the_people_going_alone():
    lead, m1 = person(), person()
    cid = community(lead, m1)
    eid = event()
    client.post(f"/v1/market/events/{eid}/communities/{cid}", json={"on": True}, headers=lead["h"])
    client.post(f"/v1/market/events/{eid}/going", json={"going": True}, headers=m1["h"])
    client.post(f"/v1/market/events/{eid}/communities/{cid}", json={"on": False}, headers=lead["h"])
    ev = next(e for e in client.get("/v1/market/events", headers=m1["h"]).json()["events"] if e["id"] == eid)
    assert ev["my_communities"] == [] and ev["i_going"] is True and ev["going_with"] is None


def test_seniors_take_stalls_up_to_the_number_available_and_a_younger_person_cannot():
    s1, s2, s3, young = person("60plus"), person("60plus"), person("60plus"), person("under40")
    eid = event(stalls=2)
    body = {"selling": "Pineapple tarts", "slot": "first", "kind": "goods"}
    assert client.post(f"/v1/market/events/{eid}/stall", json=body, headers=young["h"]).json()["detail"]["code"] == "sellers_are_seniors"
    assert client.post(f"/v1/market/events/{eid}/stall", json=body, headers=s1["h"]).status_code == 200
    assert client.post(f"/v1/market/events/{eid}/stall", json={"selling": "Calligraphy lessons for children", "kind": "skill", "helper_name": "Neighbour Mei Ling"}, headers=s2["h"]).status_code == 200
    assert client.post(f"/v1/market/events/{eid}/stall", json={"selling": "Hand-sewn bags"}, headers=s3["h"]).json()["detail"]["code"] == "no_stalls_left"
    detail = client.get(f"/v1/market/events/{eid}", headers=s1["h"]).json()
    assert detail["stalls_left"] == 0 and {s["selling"] for s in detail["stalls"]} == {"Pineapple tarts", "Calligraphy lessons for children"}
    assert next(s for s in detail["stalls"] if s["mine"])["slot"] == "first" and detail["i_going"] is True  # a stall also means they are going
    client.post(f"/v1/market/events/{eid}/stall", json={"selling": "Pineapple tarts and kuih raya", "slot": "whole"}, headers=s1["h"])  # change my own stall: still two
    assert client.get(f"/v1/market/events/{eid}", headers=s1["h"]).json()["stalls_taken"] == 2
    assert client.delete(f"/v1/market/events/{eid}/stall", headers=s2["h"]).json() == {"cancelled": True}
    assert client.get(f"/v1/market/events/{eid}", headers=s3["h"]).json()["stalls_left"] == 1


def test_a_cancelled_or_missing_event_is_not_found():
    p = person()
    assert client.get(f"/v1/market/events/{uuid.uuid4()}", headers=p["h"]).status_code == 404
    assert client.get("/v1/market/events/not-an-id", headers=p["h"]).status_code == 404
