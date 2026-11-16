"""Everyday skills: what is on and its details, find and join a community, reminders, a walk. All by voice or chat, with the same rules as the app."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app

client = TestClient(app)
EMAILS: list[str] = []
EVENTS: list[str] = []
COMMUNITIES: list[str] = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EVENTS:
            conn.execute(text("delete from market_events where id = :e"), {"e": e})
        for c in COMMUNITIES:
            conn.execute(text("delete from communities where id = :c"), {"c": c})
        for e in EMAILS:
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person() -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"]}


def skill(p, name, /, **args):
    return client.post(f"/v1/skills/{name}", json={"args": args}, headers=p["h"]).json()


def community(p, name):
    cid = client.post("/v1/communities", json={"name": name}, headers=p["h"]).json()["id"]
    COMMUNITIES.append(cid)
    return cid


def test_whats_on_and_event_details_know_the_name_the_place_the_time_and_who_is_going():
    p = person()
    cid = community(p, f"Tampines Walkers {uuid.uuid4().hex[:4]}")
    with engine().begin() as conn:
        conn.execute(text("insert into activities (community_id, organiser_id, title, description, location, starts_at, capacity) values (:c, :o, 'Sunday park walk', 'An easy walk then kopi', 'Bedok Reservoir gate 2', now() + interval '2 days', 20)"), {"c": cid, "o": p["id"]})
        conn.execute(text("delete from market_events where title = 'Everyday Silver Market'"))
        eid = str(conn.execute(text("insert into market_events (title, description, venue_name, venue_kind, address, area_name, starts_at, ends_at, stalls_total) values ('Everyday Silver Market', 'Cookies and crafts', 'Tampines Mall', 'mall', '4 Tampines Central', 'Tampines', now() + interval '4 days', now() + interval '4 days 5 hours', 6) returning id")).scalar_one())
    EVENTS.append(eid)
    on = skill(p, "whats_on")["events"]
    assert [e["title"] for e in on if e["title"] in ("Sunday park walk", "Everyday Silver Market")] == ["Sunday park walk", "Everyday Silver Market"]
    walk = skill(p, "event_details", title="park walk")
    assert walk["where"] == "Bedok Reservoir gate 2" and walk["about"] == "An easy walk then kopi" and walk["places"] == 20 and walk["rsvp_with"] == "gathering_going" and walk["i_am_going"] is False
    assert skill(p, "gathering_going", title="park walk", going=True)["going"] is True
    walk = skill(p, "event_details", title="park walk")
    assert walk["i_am_going"] is True and walk["going"] == 1
    market = skill(p, "event_details", title="silver market")
    assert market["where"] == "Tampines Mall" and market["address"] == "4 Tampines Central" and market["stalls_left"] == 6 and market["rsvp_with"] == "market_going"
    assert skill(p, "event_details", title="the moon landing")["error"] == "not_found"


def test_find_join_and_leave_a_community_by_words():
    lead, me = person(), person()
    name = f"Gardening Friends {uuid.uuid4().hex[:4]}"
    cid = community(lead, name)
    with engine().begin() as conn:
        conn.execute(text("update communities set privacy = 'open' where id = :c"), {"c": cid})
    found = skill(me, "find_communities", search="gardening")["communities"]
    mine = next(c for c in found if c["name"] == name)
    assert mine["already_in"] is False and mine["can_join"] is True
    assert skill(me, "join_community", name=name)["joined"] == name
    assert skill(me, "join_community", name=name)["error"] == "not_found"  # already in, so there is nothing to join
    assert name in [c["community"] for c in skill(me, "my_communities")["communities"]]
    assert skill(me, "leave_community", name="gardening friends")["left"] == name
    assert name not in [c["community"] for c in skill(me, "my_communities")["communities"]]


def test_a_reminder_is_added_listed_not_doubled_and_cancelled_by_words():
    p = person()
    r = skill(p, "add_reminder", title="Blood pressure tablet", time="08:00", kind="medicine", repeat="daily")
    assert r["added"] == "Blood pressure tablet" and r["repeat"] == "daily"
    assert skill(p, "add_reminder", title="blood pressure tablet", time="08:00", kind="medicine", repeat="daily")["already_there"]
    assert skill(p, "add_reminder", title="x", time="25:00")["error"] == "bad_time"
    mine = skill(p, "my_reminders", days=3)["reminders"]
    assert any(m["title"] == "Blood pressure tablet" for m in mine) and len([m for m in mine if m["title"] == "Blood pressure tablet"]) >= 2
    with engine().connect() as conn:  # it is the same item the app shows
        assert conn.execute(text("select count(*) from calendar_items where person_id = :u and title = 'Blood pressure tablet' and kind = 'medicine'"), {"u": p["id"]}).scalar_one() == 1
    assert skill(p, "cancel_reminder", title="pressure")["cancelled"] == "Blood pressure tablet"
    assert skill(p, "my_reminders", days=3)["reminders"] == []


def test_a_walk_is_logged_and_grows_the_tree_and_bad_numbers_are_refused():
    p = person()
    assert skill(p, "log_walk", minutes="30", distance_km="2.5", steps="3200")["logged"] == "30 minutes"
    assert client.get("/v1/health/walks", headers=p["h"]).json()["walks"][0]["distance_m"] == 2500
    assert skill(p, "log_walk", minutes="abc")["error"] == "bad_walk"
    assert skill(p, "log_walk", minutes="0")["error"] == "bad_walk"
