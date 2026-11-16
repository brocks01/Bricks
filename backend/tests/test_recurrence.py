"""Repeating events (a daily jog, a weekday commute group, a weekly kopi, a monthly market day), the standing that grows from showing up, and what Wisdom shows each kind of person."""
import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules import recurrence
from app.modules.skills import registry

client = TestClient(app)
EMAILS: list[str] = []
UTC = timezone.utc


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        conn.execute(text("delete from market_events where title like 'Recurrence %'"))
        conn.execute(text("delete from recurrences where template ->> 'title' like 'Recurrence %' or created_by in (select id from users where email like 'test-%@example.com')"))
        for e in EMAILS:
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person(name="Rajan Pillai") -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    h = {"Authorization": f"Bearer {s['access_token']}"}
    client.patch("/v1/me", json={"display_name": name, "age_band": "60plus"}, headers=h)
    return {"h": h, "id": s["user"]["id"]}


def skill(p, name, /, **args):
    return client.post(f"/v1/skills/{name}", json={"args": args}, headers=p["h"]).json()


def tomorrow_at(hh, mm=0) -> datetime:
    """Tomorrow at hh:mm Singapore time, as UTC."""
    local = datetime.now(UTC) + timedelta(hours=8) + timedelta(days=1)
    return local.replace(hour=hh, minute=mm, second=0, microsecond=0) - timedelta(hours=8)


# ---------- the rules, no database ----------
def test_the_rules_of_a_series():
    mon = date(2026, 11, 16)  # a Monday
    end = date(2026, 11, 29)
    assert len(recurrence.dates("daily", mon, None, None, mon, end)) == 14
    wk = recurrence.dates("weekdays", mon, None, None, mon, end)
    assert len(wk) == 10 and all(d.weekday() < 5 for d in wk)
    assert [d.day for d in recurrence.dates("weekly", mon, [0, 2], None, mon, end)] == [16, 18, 23, 25]
    assert [d.day for d in recurrence.dates("weekly", mon, None, None, mon, end)] == [16, 23]  # the first event's own day
    jan31 = date(2026, 1, 31)
    assert [d.isoformat() for d in recurrence.dates("monthly", jan31, None, None, jan31, date(2026, 4, 30))] == ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]
    first_sunday = date(2026, 12, 6)  # the first Sunday of December
    assert [d.isoformat() for d in recurrence.dates("monthly", first_sunday, None, 1, first_sunday, date(2027, 2, 28))] == ["2026-12-06", "2027-01-03", "2027-02-07"]
    assert len(recurrence.dates("daily", mon, None, None, mon, end, until=date(2026, 11, 20))) == 5
    with pytest.raises(recurrence.RepeatError):
        recurrence.check_rule("yearly", None, None)
    with pytest.raises(recurrence.RepeatError):
        recurrence.check_rule("weekly", [9], None)


# ---------- community events that repeat ----------
def community(p) -> str:
    return client.post("/v1/communities", json={"name": f"Morning Joggers {uuid.uuid4().hex[:4]}"}, headers=p["h"]).json()["id"]


def test_a_daily_jog_makes_the_coming_weeks_and_is_made_once_and_can_be_stopped():
    lead = person()
    cid = community(lead)
    start = tomorrow_at(6, 30)
    r = client.post(f"/v1/communities/{cid}/activities", headers=lead["h"], json={"title": "Recurrence Morning jog", "category": "Exercise", "location": "Bishan Park gate 2", "starts_at": start.isoformat(),
                                                                                  "ends_at": (start + timedelta(hours=1)).isoformat(), "repeat": "daily"})
    assert r.status_code == 200 and r.json()["repeat"] == "daily" and r.json()["made"] >= 40
    listed = client.get(f"/v1/communities/{cid}/activities", headers=lead["h"]).json()
    acts = listed["activities"] if isinstance(listed, dict) else listed
    assert len(acts) >= 40 and acts[0]["repeat"] == "daily" and acts[0]["location"] == "Bishan Park gate 2"
    assert recurrence.run_once() >= 0
    with engine().connect() as conn:
        n = conn.execute(text("select count(*) from activities where community_id = :c"), {"c": cid}).scalar_one()
    assert n == len(acts)  # running the roller again makes nothing twice
    one = acts[3]["id"]
    assert client.post(f"/v1/communities/activities/{one}/going", headers=lead["h"]).status_code in (200, 201, 422)
    ended = client.post(f"/v1/communities/activities/{one}/end-series", headers=lead["h"]).json()
    assert ended["ended"] is True and ended["cancelled"] >= 39
    assert client.post(f"/v1/communities/activities/{one}/end-series", headers=lead["h"]).status_code == 404
    after = client.get(f"/v1/communities/{cid}/activities", headers=lead["h"]).json()
    assert len(after["activities"] if isinstance(after, dict) else after) == 0


def test_a_weekly_kopi_on_chosen_days_and_a_monthly_one_and_only_a_lead_can_start_or_stop_a_series():
    lead, member = person(), person("Meena Iyer")
    cid = community(lead)
    start = tomorrow_at(15)
    weekly = client.post(f"/v1/communities/{cid}/activities", headers=lead["h"], json={"title": "Recurrence Kopi and stories", "starts_at": start.isoformat(), "repeat": "weekly", "repeat_days": [1, 4]})
    assert weekly.status_code == 200
    with engine().connect() as conn:
        days = {r.d for r in conn.execute(text("select extract(isodow from starts_at + interval '8 hours') as d from activities where series_id = :s"), {"s": weekly.json()["series_id"]})}
    assert days <= {2, 5}  # Tuesday and Friday (isodow 2 and 5)
    monthly = client.post(f"/v1/communities/{cid}/activities", headers=lead["h"], json={"title": "Recurrence Monthly supper", "starts_at": start.isoformat(), "repeat": "monthly", "week_of_month": 1})
    assert monthly.status_code == 200 and 1 <= monthly.json()["made"] <= 3
    bad = client.post(f"/v1/communities/{cid}/activities", headers=lead["h"], json={"title": "Recurrence Bad", "starts_at": start.isoformat(), "repeat": "weekly", "repeat_days": [8]})
    assert bad.status_code in (400, 422)
    # a plain one-off still works exactly as before
    single = client.post(f"/v1/communities/{cid}/activities", headers=lead["h"], json={"title": "Recurrence One off", "starts_at": start.isoformat()})
    assert single.status_code == 200 and "series_id" not in single.json()


# ---------- market days that repeat ----------
def test_a_monthly_market_day_is_made_by_an_admin_and_shows_it_repeats():
    admin, other = person("Platform Admin"), person("Ravi Kumar")
    with engine().begin() as conn:
        conn.execute(text("update users set is_platform_admin = true where id = :u"), {"u": admin["id"]})
    body = {"title": "Recurrence Market Day", "description": "Cookies, plants and crafts", "venue_name": "AMK Hub", "venue_kind": "mall", "starts_at": tomorrow_at(9).isoformat(),
            "ends_at": (tomorrow_at(9) + timedelta(hours=6)).isoformat(), "stalls_total": 10, "repeat": "monthly", "week_of_month": 1}
    assert client.post("/v1/market/events", json=body, headers=other["h"]).status_code == 403
    made = client.post("/v1/market/events", json=body, headers=admin["h"])
    assert made.status_code == 201 and made.json()["made"] >= 3
    events = [e for e in client.get("/v1/market/events", headers=other["h"]).json()["events"] if e["title"] == "Recurrence Market Day"]
    assert len(events) >= 3 and events[0]["repeat"] == "monthly" and events[0]["week_of_month"] == 1 and events[0]["stalls_left"] == 10
    weekly = client.post("/v1/market/events", json={**body, "title": "Recurrence Saturday Market", "repeat": "weekly", "week_of_month": None}, headers=admin["h"])
    assert weekly.status_code == 201 and weekly.json()["made"] >= 15
    stop = client.post(f"/v1/market/events/{made.json()['id']}/end-series", headers=admin["h"]).json()
    assert stop["ended"] is True and stop["cancelled"] >= 3
    assert client.post("/v1/market/events", json={**body, "repeat": "daily"}, headers=admin["h"]).status_code in (400, 422)


# ---------- standing: only showing up counts ----------
def test_standing_counts_check_ins_streaks_and_levels():
    me, friend = person("Meena Iyer"), person("Ravi Kumar")
    cid = community(me)
    with engine().begin() as conn:
        conn.execute(text("insert into memberships (community_id, user_id) values (:c, :u)"), {"c": cid, "u": friend["id"]})
        today = datetime.now(UTC) + timedelta(hours=8)
        ids = []
        for back in range(0, 12):  # twelve days in a row, the last one today
            at = (today - timedelta(days=back)).replace(hour=7, minute=0, second=0, microsecond=0) - timedelta(hours=8)
            a = conn.execute(text("insert into activities (community_id, organiser_id, title, starts_at, status) values (:c, :o, 'Standing jog', :s, 'done') returning id"), {"c": cid, "o": me["id"], "s": at}).scalar()
            ids.append((a, at))
        for a, at in ids:
            conn.execute(text("insert into activity_participants (activity_id, user_id, status, checked_in_at) values (:a, :u, 'attended', :t)"), {"a": a, "u": me["id"], "t": at})
        for a, at in ids[:2]:
            conn.execute(text("insert into activity_participants (activity_id, user_id, status, checked_in_at) values (:a, :u, 'attended', :t)"), {"a": a, "u": friend["id"], "t": at})
    s = client.get(f"/v1/communities/{cid}/standing", headers=me["h"]).json()
    assert s["day_streak"] == 12 and s["total"] == 12 and s["week_streak"] >= 2
    assert s["this_month"] >= 1 and s["level"] in ("newcomer", "regular", "stalwart")
    top = s["regulars"][0]
    assert top["name"] == "Meena" and top["me"] is True and top["times"] >= 1
    assert "Ravi" in [r["name"] for r in s["regulars"]] or s["this_month"] == 0
    # a person who never came has nothing, and someone outside the community cannot look
    f = client.get(f"/v1/communities/{cid}/standing", headers=friend["h"]).json()
    assert f["total"] == 2 and f["day_streak"] == 2
    stranger = person("Priya Nair")
    assert client.get(f"/v1/communities/{cid}/standing", headers=stranger["h"]).status_code in (403, 404)
    said = skill(me, "my_standing")
    assert said["community"].startswith("Morning Joggers") and said["day_streak"] == 12 and said["level"] in ("regular", "stalwart", "newcomer")


# ---------- what Wisdom shows each kind of person ----------
def test_wisdom_parts_follow_what_the_person_came_to_do():
    server, learner, both = person("Hari Menon"), person("Aarav Nair"), person("Zara Khan")

    def roles(p, r):
        client.put("/v1/onboarding/purpose", json={"answers": {"roles": r}}, headers=p["h"])
        return client.get("/v1/profile", headers=p["h"]).json()

    s = roles(server, ["help"])
    assert s["focus"] == "serve" and s["wisdom"] == {"parts": ["mine", "learners"], "default": "mine"}
    assert "community" not in s["surfaces"] and "wisdom_help" in s["surfaces"]
    l = roles(learner, ["learn"])
    assert l["focus"] == "learn" and l["wisdom"] == {"parts": ["stories", "mentors"], "default": "stories"}
    b = roles(both, ["share", "learn"])
    assert b["focus"] == "both" and b["wisdom"]["parts"] == ["stories", "mentors", "mine"] and b["wisdom"]["default"] == "stories"
    c = roles(person("Priya Nair"), ["connect"])
    assert c["focus"] == "connect" and c["wisdom"] == {"parts": ["stories"], "default": "stories"} and "community" in c["surfaces"]
