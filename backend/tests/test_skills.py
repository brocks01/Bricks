"""Backend skills: everything a person can ask Wisdom to do, with no app: through the API, a chat, a phone call or the command line."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.skills import registry

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
            conn.execute(text("delete from family_members where user_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from families where created_by in (select id from users where email = :e)"), {"e": e})
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
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"], "email": email}


def skill(p, name, /, **args):
    return client.post(f"/v1/skills/{name}", json={"args": args}, headers=p["h"]).json()


def gathering(p, title="Kopi and stories", minutes=30):
    cid = client.post("/v1/communities", json={"name": f"Skill Heights {uuid.uuid4().hex[:4]}"}, headers=p["h"]).json()["id"]
    with engine().begin() as conn:
        conn.execute(text("insert into activities (community_id, organiser_id, title, starts_at) values (:c, :o, :t, now() + make_interval(mins => :m))"), {"c": cid, "o": p["id"], "t": title, "m": minutes})
    return cid


def test_the_list_and_a_signed_in_person_are_required():
    p = person()
    names = {s["name"] for s in client.get("/v1/skills", headers=p["h"]).json()["skills"]}
    assert {"my_day", "my_tree", "checkin_today", "habit_done", "gathering_going", "tell_family"} <= names
    assert client.get("/v1/skills").status_code in (401, 403)


def test_an_unknown_skill_and_missing_arguments_are_answers_not_crashes():
    p = person()
    assert skill(p, "fly_to_the_moon")["error"] == "unknown_skill"
    assert skill(p, "gathering_going", title="x")["error"] == "missing"


def test_checkin_then_my_day_and_my_tree_tell_the_same_story():
    p = person()
    assert skill(p, "checkin_today", moved=True)["saved"] is True
    day = skill(p, "my_day")
    assert day["moved_today_answered"] is True and day["days_in_a_row"] == 1
    assert skill(p, "my_tree")["roots_health"] >= 1


def test_a_reminder_is_ticked_by_its_words_and_an_unknown_one_lists_the_choices():
    p = person()
    start = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    for title in ("Blood pressure tablet", "Blood sugar test"):
        assert client.post("/v1/calendar/items", json={"kind": "medicine", "title": title, "starts_at": start, "repeat": "daily"}, headers=p["h"]).status_code in (200, 201)
    # two reminders share the words "blood": the skill asks which, it does not guess
    amb = skill(p, "tick_reminder", title="blood")
    assert amb["error"] == "which_one" and len(amb["options"]) == 2
    assert skill(p, "tick_reminder", title="pressure")["done"] == "Blood pressure tablet"
    assert skill(p, "tick_reminder", title="the dentist")["error"] == "not_found"
    left = [t for t in skill(p, "my_day")["things_today"] if not t["done"]]
    assert [t["title"] for t in left] == ["Blood sugar test"]


def test_gathering_going_and_im_here_grow_the_tree():
    p = person()
    gathering(p)
    assert skill(p, "my_day")["next_gathering"]["title"] == "Kopi and stories"
    assert skill(p, "gathering_going", title="kopi", going=True)["going"] is True
    assert skill(p, "im_here")["checked_in"] == "Kopi and stories"
    assert skill(p, "my_tree")["leaves"] >= 1
    far = person()
    gathering(far, "Later bingo", minutes=60 * 6)
    assert skill(far, "im_here")["error"] == "not_open_yet"  # opens an hour before it starts


def test_habits_goals_and_steps():
    p = person()
    skill(p, "add_goal", title="Learn to video call my grandchildren")
    assert skill(p, "add_goal_step", goal="video call", step="Open the camera")["to"] == "Learn to video call my grandchildren"
    goal = skill(p, "my_tree")["goals"][0]
    assert goal["steps_left"] == ["Open the camera"] and goal["percent"] == 0
    assert skill(p, "close_step", step="camera")["done"] == "Open the camera"
    g2 = skill(p, "my_tree")["goals"][0]
    assert g2["percent"] >= 99 and g2["steps_left"] == []
    assert client.post("/v1/nodes/habit", json={"title": "Water the plants", "kind": "daily"}, headers=p["h"]).status_code == 200
    h = skill(p, "habit_done", name="plants")
    assert h["done_today"] is True and h["streak"] == 1
    assert skill(p, "habit_done", name="plants", undo=True)["done_today"] is False
    assert skill(p, "habit_done", name="skydiving")["error"] == "not_found"


def test_the_vision_is_saved_and_shown():
    p = person()
    assert skill(p, "set_vision", text="Teach kolam to ten children by December")["saved"].startswith("Teach kolam")
    assert skill(p, "my_tree")["vision"].startswith("Teach kolam")


def test_market_events_going_and_a_stall_for_seniors_only():
    senior, young = person("60plus"), person("under40")
    with engine().begin() as conn:
        conn.execute(text("delete from market_events where title = 'Skill Silver Market'"))  # left over from an interrupted run
        eid = str(conn.execute(text("insert into market_events (title, venue_name, venue_kind, area_name, starts_at, ends_at, stalls_total) values ('Skill Silver Market', 'Tampines Mall', 'mall', 'Tampines', now() + interval '3 days', now() + interval '3 days 5 hours', 2) returning id")).scalar_one())
    EVENTS.append(eid)
    assert any(e["title"] == "Skill Silver Market" for e in skill(senior, "market_events")["events"])
    r = skill(young, "market_going", title="silver market", going=True)
    assert r.get("going") is True, r
    assert skill(young, "take_stall", event="silver market", selling="Cookies")["error"] == "sellers_are_seniors"
    got = skill(senior, "take_stall", event="silver market", selling="Pineapple tarts", slot="first")
    assert got["at"] == "Tampines Mall" and got["stall"] == "Pineapple tarts"


def test_telling_the_family_needs_a_yes_first():
    mum, son = person(), person()
    with engine().begin() as conn:
        fid = conn.execute(text("insert into families (name, created_by) values ('Skill Family', :u) returning id"), {"u": son["id"]}).scalar_one()
        for u, role in ((son["id"], "owner"), (mum["id"], "member")):
            conn.execute(text("insert into family_members (family_id, user_id, role) values (:f, :u, :r)"), {"f": fid, "u": u, "r": role})
    assert skill(mum, "tell_family", message="I feel dizzy")["error"] == "needs_confirmation"
    assert skill(mum, "tell_family", message="I feel dizzy", confirmed=True)["family_told"] == 1
    assert client.get("/v1/health/help/inbox", headers=son["h"]).json()["alerts"][0]["message"] == "I feel dizzy"


def test_one_person_cannot_touch_another_persons_things():
    a, b = person(), person()
    gathering(a, "Private garden")
    assert skill(b, "gathering_going", title="private garden", going=True)["error"] == "not_found"  # b is not in a's community


def test_declarations_are_valid_for_the_model():
    decls = registry.declarations()
    assert len(decls) == len(registry.SKILLS)
    for d in decls:
        assert d["name"] and d["description"]
        for k in d.get("parameters", {}).get("required", []):
            assert k in d["parameters"]["properties"]


def test_every_skill_is_also_a_phone_tool_that_acts_for_the_person_on_the_call():
    import asyncio

    from app.modules.voice import tools

    assert {"my_day", "habit_done", "tell_family"} <= set(tools.names())
    assert tools.pick(["my_day", "web_search", "nope"]) == ["my_day", "web_search"]
    assert [d["name"] for d in tools.declarations(["checkin_today"])] == ["checkin_today"]
    assert "confirmed true" in tools.hints(["tell_family"])[0]
    p = person()
    done = asyncio.run(tools.run("checkin_today", {"moved": True}, {}, p["id"]))
    assert done["saved"] is True and skill(p, "my_day")["moved_today_answered"] is True  # the call changed the same data the app reads
    assert asyncio.run(tools.run("checkin_today", {"moved": True}, {}, None))["error"] == "no_person"  # a call with nobody linked changes nothing
    assert asyncio.run(tools.run("tell_family", {}, {}, p["id"]))["error"] == "needs_confirmation"
