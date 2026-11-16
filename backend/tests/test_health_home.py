"""Health (check-in, streak, walks, card, help to the family) and the Home summary."""
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
            conn.execute(text("delete from families where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from family_members where user_id in (select id from users where email = :e)"), {"e": e})
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person() -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"]}


def walk(**kw):
    return {"started_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(), "duration_s": 1800, "moving_s": 1620, "distance_m": 2400, "steps": 3100, **kw}


def test_checkin_is_once_a_day_and_the_streak_counts_days_in_a_row():
    p = person()
    s = client.get("/v1/health/status", headers=p["h"]).json()
    assert s["answered"] is False and s["streak"] == 0 and len(s["week"]) == 7
    assert client.post("/v1/health/checkin", json={"moved": True, "feeling": 4}, headers=p["h"]).json()["moved"] is True
    assert client.post("/v1/health/checkin", json={"moved": True, "feeling": 9}, headers=p["h"]).status_code == 422  # feeling is 1 to 5
    assert client.get("/v1/health/status", headers=p["h"]).json()["streak"] == 1
    # the same day answered again replaces the answer, it does not add a day
    client.post("/v1/health/checkin", json={"moved": False}, headers=p["h"])
    s = client.get("/v1/health/status", headers=p["h"]).json()
    assert s["moved"] is False and s["streak"] == 0
    # past days: moved yesterday and the day before, today still open -> a streak of 2
    with engine().begin() as conn:
        conn.execute(text("delete from health_checkins where user_id = :u"), {"u": p["id"]})
        for d in (1, 2):
            conn.execute(text("insert into health_checkins (user_id, day, moved) values (:u, (now() at time zone 'utc' + interval '8 hours')::date - :d, true)"), {"u": p["id"], "d": d})
    s = client.get("/v1/health/status", headers=p["h"]).json()
    assert s["answered"] is False and s["streak"] == 2
    assert [d["moved"] for d in s["week"]][-3:] == [True, True, None]


def test_walks_are_saved_listed_and_totalled_by_week():
    p = person()
    assert client.post("/v1/health/walks", json=walk(moving_s=2000), headers=p["h"]).json()["detail"]["code"] == "moving_longer_than_walk"
    assert client.post("/v1/health/walks", json=walk(started_at=(datetime.now(timezone.utc) + timedelta(days=1)).isoformat()), headers=p["h"]).json()["detail"]["code"] == "in_the_future"
    assert client.post("/v1/health/walks", json=walk(distance_m=999999999), headers=p["h"]).status_code == 422
    r = client.post("/v1/health/walks", json=walk(), headers=p["h"]).json()
    assert r["avg_pace_s_km"] == 675  # 1620 s over 2.4 km
    client.post("/v1/health/walks", json=walk(started_at=(datetime.now(timezone.utc) - timedelta(days=9)).isoformat()), headers=p["h"])
    out = client.get("/v1/health/walks", headers=p["h"]).json()
    assert len(out["walks"]) == 2 and out["this_week"]["walks"] == 1 and out["this_week"]["steps"] == 3100 and out["last_week"]["walks"] == 1
    summ = client.get("/v1/health/summary", headers=p["h"]).json()
    assert summ["week_walks"] == 1 and summ["week_minutes"] == 27 and summ["week_distance_m"] == 2400
    assert client.delete(f"/v1/health/walks/{r['id']}", headers=p["h"]).json() == {"deleted": True}
    assert client.delete(f"/v1/health/walks/{r['id']}", headers=p["h"]).status_code == 404
    assert client.delete("/v1/health/walks/not-a-uuid", headers=p["h"]).status_code == 404
    # nobody else sees or removes my walks
    other = person()
    assert client.get("/v1/health/walks", headers=other["h"]).json()["walks"] == []


def test_health_card_is_private_to_its_owner():
    p, other = person(), person()
    assert client.get("/v1/health/card", headers=p["h"]).json()["blood_group"] is None
    body = {"blood_group": "O+", "conditions": "High blood pressure", "medicines": "Amlodipine 5 mg morning", "allergies": "Penicillin", "contact_name": "Raj", "contact_phone": "+65 9000 0000"}
    assert client.put("/v1/health/card", json=body, headers=p["h"]).json()["medicines"] == "Amlodipine 5 mg morning"
    assert client.put("/v1/health/card", json={"blood_group": "Z+"}, headers=p["h"]).status_code == 422
    assert client.get("/v1/health/card", headers=other["h"]).json()["blood_group"] is None
    assert client.get("/v1/health/summary", headers=p["h"]).json()["has_card"] is True


def test_help_reaches_the_family_and_only_the_family():
    mum, son, stranger = person(), person(), person()
    with engine().begin() as conn:
        fid = conn.execute(text("insert into families (name, created_by) values ('Help Family', :u) returning id"), {"u": son["id"]}).scalar_one()
        for u, role in ((son["id"], "owner"), (mum["id"], "member")):
            conn.execute(text("insert into family_members (family_id, user_id, role) values (:f, :u, :r)"), {"f": fid, "u": u, "r": role})
    sent = client.post("/v1/health/help", json={"message": "I feel dizzy"}, headers=mum["h"]).json()
    assert sent["family_told"] == 1
    assert client.post("/v1/health/help", json={}, headers=mum["h"]).json()["detail"]["code"] == "already_sent"  # no flood
    box = client.get("/v1/health/help/inbox", headers=son["h"]).json()["alerts"]
    assert len(box) == 1 and box[0]["message"] == "I feel dizzy"
    assert client.get("/v1/health/help/inbox", headers=stranger["h"]).json()["alerts"] == []
    assert client.get("/v1/home/summary", headers=son["h"]).json()["help_alerts"] == 1
    assert client.post(f"/v1/health/help/{sent['id']}/close", headers=stranger["h"]).status_code == 403
    assert client.post(f"/v1/health/help/{sent['id']}/close", headers=son["h"]).json() == {"closed": True}
    assert client.get("/v1/health/help/inbox", headers=son["h"]).json()["alerts"] == []
    assert client.post("/v1/health/help/not-a-uuid/close", headers=son["h"]).status_code == 404


def test_home_summary_brings_the_other_tabs_together():
    p = person()
    s = client.get("/v1/home/summary", headers=p["h"]).json()
    assert set(s) == {"health", "communities", "market", "help_alerts"}
    assert s["communities"] == {"max": 3, "used": 0, "left": 3} and s["market"] == {"waiting_for_me": 0, "my_listings": 0} and s["health"]["streak"] == 0
    assert client.get("/v1/home/summary").status_code in (401, 403)


# ---------- Home: the upcoming events from Communities, the Marketplace and Wisdom ----------
def circle_with(member, name):
    lead = person()
    cid = client.post("/v1/communities", json={"name": name}, headers=lead["h"]).json()["id"]
    code = client.get(f"/v1/communities/{cid}", headers=lead["h"]).json()["community"]["invite_code"]
    assert client.post("/v1/communities/join", json={"code": code}, headers=member["h"]).status_code == 200
    return lead, cid


def gathering(cid, lead, title, hours):
    with engine().begin() as conn:
        return str(conn.execute(text("insert into activities (community_id, organiser_id, title, starts_at, location) values (:c, :o, :t, now() + make_interval(hours => :h), 'Bishan Community Club') returning id"),
                                {"c": cid, "o": lead["id"], "t": title, "h": hours}).scalar_one())


def market_event(title, hours):
    with engine().begin() as conn:
        eid = str(conn.execute(text("insert into market_events (title, venue_name, area_name, starts_at) values (:t, 'Our Tampines Hub', 'Tampines', now() + make_interval(hours => :h)) returning id"),
                               {"t": title, "h": hours}).scalar_one())
    EVENTS.append(eid)
    return eid


def upcoming(p, **q):
    r = client.get("/v1/home/upcoming", params=q, headers=p["h"])
    assert r.status_code == 200, r.text
    return r.json()


def test_upcoming_brings_the_sources_together_in_time_order():
    me = person()
    lead, cid = circle_with(me, f"Home Walkers {uuid.uuid4().hex[:4]}")
    walk = gathering(cid, lead, "Morning walk", 50)
    tea = gathering(cid, lead, "Tea and stories", 2)
    client.post(f"/v1/communities/activities/{walk}/going", json={"going": True}, headers=me["h"])
    day = market_event("Tampines Makers Market Day", 26)
    other = market_event("A market day I am not going to", 30)
    assert client.post(f"/v1/market/events/{day}/going", json={"going": True}, headers=me["h"]).status_code == 200
    u = upcoming(me)
    assert [e["title"] for e in u["events"]] == ["Tea and stories", "Tampines Makers Market Day", "Morning walk"] and u["total"] == 3
    by = {e["title"]: e for e in u["events"]}
    assert by["Morning walk"]["source"] == "community" and by["Morning walk"]["going"] is True and by["Tea and stories"]["going"] is False
    assert by["Morning walk"]["open_key"] == "community.event" and by["Morning walk"]["open_params"] == {"id": cid, "eid": walk}
    assert by["Morning walk"]["place"] == "Bishan Community Club" and by["Morning walk"]["from_name"].startswith("Home Walkers")
    m = by["Tampines Makers Market Day"]
    assert m["source"] == "market" and m["going"] is True and m["open_key"] == "market.day" and m["open_params"] == {"id": day} and m["place"] == "Our Tampines Hub, Tampines"
    assert other not in [e["id"] for e in u["events"]]  # a market event shows only once the person said they are going
    assert [e["title"] for e in upcoming(me, limit=1)["events"]] == ["Tea and stories"] and upcoming(me, limit=1)["total"] == 3


def test_upcoming_never_shows_another_persons_events_and_a_community_left_disappears():
    me, stranger = person(), person()
    lead, cid = circle_with(me, f"Home Singers {uuid.uuid4().hex[:4]}")
    gathering(cid, lead, "Choir practice", 5)
    day = market_event("Somebody else's market day", 5)
    client.post(f"/v1/market/events/{day}/going", json={"going": True}, headers=stranger["h"])
    assert [e["title"] for e in upcoming(me)["events"]] == ["Choir practice"]
    assert upcoming(stranger)["events"][0]["title"] == "Somebody else's market day" and len(upcoming(stranger)["events"]) == 1
    assert client.post(f"/v1/communities/{cid}/leave", headers=me["h"]).status_code == 200
    assert upcoming(me)["events"] == []
    assert client.get("/v1/home/upcoming").status_code in (401, 403)


def test_upcoming_keeps_to_its_window():
    me = person()
    lead, cid = circle_with(me, f"Home Window {uuid.uuid4().hex[:4]}")
    gathering(cid, lead, "Started an hour ago", -1)
    gathering(cid, lead, "Yesterday", -24)
    gathering(cid, lead, "In three weeks", 21 * 24)
    gathering(cid, lead, "In six weeks", 42 * 24)
    assert [e["title"] for e in upcoming(me)["events"]] == ["Started an hour ago", "In three weeks"]  # 30 days by default
    assert [e["title"] for e in upcoming(me, days=7)["events"]] == ["Started an hour ago"]
    assert [e["title"] for e in upcoming(me, days=92)["events"]][-1] == "In six weeks"
    assert len(upcoming(me, days=5000)["events"]) == 3  # capped at 92 days, not refused
