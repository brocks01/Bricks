"""Goals of the person's own, repeating habits that grow stronger (the stem), and the roots (health) of the tree."""
import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.nodes import service

client = TestClient(app)
EMAILS: list[str] = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person() -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"]}


def tree(p):
    return client.get("/v1/nodes/tree", headers=p["h"]).json()


# ---------- the strength of a habit (pure) ----------
D = date(2026, 11, 15)


def days(*offsets):
    return {D - timedelta(days=o) for o in offsets}


def test_a_daily_habit_is_stronger_with_more_days_and_the_streak_counts_back_from_today():
    none = service.habit_stats(set(), "daily", D)
    assert none == {"strength": 0.0, "streak": 0, "done_today": False}
    week = service.habit_stats(days(*range(7)), "daily", D)
    assert week["streak"] == 7 and week["done_today"] is True and week["strength"] == pytest.approx(7 / 28)
    assert service.habit_stats(days(*range(28)), "daily", D)["strength"] == 1.0
    assert service.habit_stats(days(*range(40)), "daily", D)["strength"] == 1.0  # never above 1


def test_a_gap_restarts_the_streak_gently_and_yesterday_still_counts_until_today_ends():
    yesterday_on = service.habit_stats(days(1, 2, 3), "daily", D)
    assert yesterday_on["streak"] == 3 and yesterday_on["done_today"] is False  # today is still open
    broken = service.habit_stats(days(0, 1, 5, 6, 7), "daily", D)
    assert broken["streak"] == 2 and broken["strength"] == pytest.approx(5 / 28)  # the strength remembers the good days
    assert service.habit_stats(days(2, 3), "daily", D)["streak"] == 0


def test_a_weekly_habit_counts_weeks_with_at_least_one():
    st = service.habit_stats(days(0, 8, 15, 22), "weekly", D)  # one in each of the last four weeks
    assert st["strength"] == 1.0 and st["streak"] == 4
    st2 = service.habit_stats(days(8, 15), "weekly", D)  # nothing this week yet, so it counts from last week
    assert st2["streak"] == 2 and st2["strength"] == 0.5 and st2["done_today"] is False


# ---------- goals, habits and the tree through the API ----------
def test_a_person_adds_a_goal_adds_steps_and_closes_them_to_grow_leaves():
    p = person()
    g = client.post("/v1/nodes/goal", json={"title": "Learn to video call my grandchildren"}, headers=p["h"]).json()
    assert g["type"] == "goal" and g["path"][0] == "R1"
    s1 = client.post("/v1/nodes", json={"type": "task", "title": "Install the app", "parent_id": g["nid"]}, headers=p["h"]).json()
    s2 = client.post("/v1/nodes", json={"type": "task", "title": "Make the first call", "parent_id": g["nid"]}, headers=p["h"]).json()
    client.post(f"/v1/nodes/{s1['nid']}/badge", json={"badge": {"status": "closed"}}, headers=p["h"])
    t = tree(p)
    goal = next(n for n in t["nodes"] if n["nid"] == g["nid"])
    assert goal["progress"] == 0.5 and t["leaves"] == 1 and t["level"] == 1
    client.post(f"/v1/nodes/{s2['nid']}/badge", json={"badge": {"status": "closed"}}, headers=p["h"])
    client.post(f"/v1/nodes/{g['nid']}/badge", json={"badge": {"status": "closed"}}, headers=p["h"])
    assert tree(p)["leaves"] == 3


def test_a_habit_gets_stronger_each_day_it_is_done_and_it_is_idempotent_within_a_day():
    p = person()
    h = client.post("/v1/nodes/habit", json={"title": "Water the balcony plants", "kind": "daily"}, headers=p["h"]).json()
    assert h["type"] == "habit" and h["kind"] == "daily"
    r1 = client.post(f"/v1/nodes/{h['nid']}/log", json={}, headers=p["h"]).json()
    r2 = client.post(f"/v1/nodes/{h['nid']}/log", json={}, headers=p["h"]).json()  # same day twice: no double count
    assert r1["streak"] == 1 and r2["streak"] == 1 and r2["done_today"] is True and r2["strength"] == pytest.approx(1 / 28)
    # earlier days, so the stem has something to grow from
    with engine().begin() as conn:
        for o in range(1, 10):
            conn.execute(text("insert into node_repeats (user_id, nid, day) values (:u, :n, :d) on conflict do nothing"), {"u": p["id"], "n": h["nid"], "d": service._today(conn, p["id"]) - timedelta(days=o)})
    r3 = client.post(f"/v1/nodes/{h['nid']}/log", json={}, headers=p["h"]).json()
    assert r3["streak"] == 10 and r3["strength"] == pytest.approx(10 / 28)
    t = tree(p)
    hab = next(x for x in t["habits"] if x["nid"] == h["nid"])
    assert hab["streak"] == 10 and hab["kind"] == "daily" and hab["done_today"] is True
    node = next(n for n in t["nodes"] if n["nid"] == h["nid"])
    assert node["badge"]["value"] == pytest.approx(10 / 28)  # the stem's thickness comes from here
    undone = client.post(f"/v1/nodes/{h['nid']}/log", json={"undo": True}, headers=p["h"]).json()
    assert undone["done_today"] is False and undone["streak"] == 9


def test_only_a_habit_can_be_logged_and_another_person_cannot():
    a, b = person(), person()
    g = client.post("/v1/nodes/goal", json={"title": "A goal"}, headers=a["h"]).json()
    assert client.post(f"/v1/nodes/{g['nid']}/log", json={}, headers=a["h"]).json()["detail"]["code"] == "not_a_habit"
    h = client.post("/v1/nodes/habit", json={"title": "Stretch"}, headers=a["h"]).json()
    assert client.post(f"/v1/nodes/{h['nid']}/log", json={}, headers=b["h"]).status_code == 404


def test_a_yes_check_in_and_a_walk_keep_two_habits_the_app_makes_itself():
    p = person()
    client.post("/v1/health/checkin", json={"moved": True}, headers=p["h"])
    started = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    client.post("/v1/health/walks", json={"started_at": started, "duration_s": 1800, "moving_s": 1620, "distance_m": 2400, "steps": 3100}, headers=p["h"])
    t = tree(p)
    by = {h["title"]: h for h in t["habits"]}
    assert by["Move every day"]["streak"] == 1 and by["Move every day"]["kind"] == "daily"
    assert by["Walk every week"]["streak"] == 1 and by["Walk every week"]["kind"] == "weekly" and by["Walk every week"]["strength"] == 0.25
    assert t["leaves"] == 2  # a check-in leaf and a walk leaf, as before


def test_the_roots_are_the_persons_health_and_grow_with_it():
    p = person()
    assert tree(p)["roots"] == {"strength": 0.0, "moved_days": 0, "walks": 0}
    with engine().begin() as conn:
        today = service._today(conn, p["id"])
        for o in range(14):
            conn.execute(text("insert into health_checkins (user_id, day, moved) values (:u, :d, true) on conflict do nothing"), {"u": p["id"], "d": today - timedelta(days=o)})
        for o in range(6):
            conn.execute(text("insert into health_walks (user_id, started_at, duration_s, moving_s, distance_m, steps) values (:u, :s, 1800, 1700, 2000, 2500)"), {"u": p["id"], "s": datetime.now(timezone.utc) - timedelta(days=o + 1)})
    r = tree(p)["roots"]
    assert r["moved_days"] == 14 and r["walks"] == 6 and r["strength"] == pytest.approx(0.6 * 14 / 28 + 0.4 * 6 / 12)


def test_the_level_rises_every_ten_leaves():
    p = person()
    with engine().begin() as conn:
        for i in range(10):
            service.earn(conn, p["id"], "give", "Giving back", f"Help {i}")
    t = tree(p)
    assert t["leaves"] == 10 and t["level"] == 2
