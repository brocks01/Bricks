"""Grow: one person's own aspirations, health readings, activity and contributions, and a gentle overview of them.
Plain functions over one database connection. Everything here belongs to the signed-in person and is never shown to anyone else."""
import uuid
from datetime import date, timedelta

from sqlalchemy import Connection, text

ASPIRATION_KINDS = ("travel", "hobby", "health", "family", "own")
HEALTH_KINDS = ("heart_rate", "sleep_hours", "weight_kg", "blood_pressure")
ACTIVITY_KINDS = ("walk", "jog", "yoga", "exercise", "other")
CONTRIBUTION_KINDS = ("time", "skill", "goods", "money")


class GrowError(Exception):
    def __init__(self, code: str, status: int = 400):
        super().__init__(code)
        self.code, self.status = code, status


def _uuid(value: str) -> str:
    try:
        return str(uuid.UUID(value))
    except ValueError:
        raise GrowError("not_found", 404)


# ---- Aspirations ----

def aspirations(conn: Connection, user_id: str) -> list[dict]:
    rows = conn.execute(text("select id, title, category, note, done_at is not null as done, created_at from aspirations where user_id = :u order by (done_at is not null), created_at desc"), {"u": user_id}).mappings().all()
    return [dict(r) for r in rows]


def add_aspiration(conn: Connection, user_id: str, title: str, category: str, note: str | None) -> dict:
    if category not in ASPIRATION_KINDS:
        raise GrowError("bad_category")
    return dict(conn.execute(text("insert into aspirations (user_id, title, category, note) values (:u, :t, :c, :n) returning id, title, category, note, false as done, created_at"), {"u": user_id, "t": title.strip(), "c": category, "n": (note or "").strip() or None}).mappings().one())


def set_aspiration_done(conn: Connection, user_id: str, aid: str, done: bool) -> dict:
    r = conn.execute(text("update aspirations set done_at = case when :d then coalesce(done_at, now()) end where id = :i and user_id = :u returning id, done_at is not null as done"), {"d": done, "i": _uuid(aid), "u": user_id}).mappings().first()
    if r is None:
        raise GrowError("not_found", 404)
    return dict(r)


def delete_aspiration(conn: Connection, user_id: str, aid: str) -> dict:
    n = conn.execute(text("delete from aspirations where id = :i and user_id = :u"), {"i": _uuid(aid), "u": user_id}).rowcount
    if not n:
        raise GrowError("not_found", 404)
    return {"deleted": True}


# ---- Health ----

def add_reading(conn: Connection, user_id: str, kind: str, value: float, value2: float | None) -> dict:
    if kind not in HEALTH_KINDS:
        raise GrowError("bad_kind")
    if kind == "blood_pressure" and not value2:
        raise GrowError("need_two_values")
    if kind != "blood_pressure":
        value2 = None
    return dict(conn.execute(text("insert into health_readings (user_id, kind, value, value2) values (:u, :k, :v, :v2) returning id, kind, value, value2, recorded_at"), {"u": user_id, "k": kind, "v": value, "v2": value2}).mappings().one())


def health(conn: Connection, user_id: str) -> dict:
    """The latest reading of each kind, and the recent records (newest first)."""
    latest = {}
    for k in HEALTH_KINDS:
        r = conn.execute(text("select id, value, value2, recorded_at from health_readings where user_id = :u and kind = :k order by recorded_at desc limit 1"), {"u": user_id, "k": k}).mappings().first()
        latest[k] = dict(r) if r else None
    recent = conn.execute(text("select id, kind, value, value2, recorded_at from health_readings where user_id = :u order by recorded_at desc limit 30"), {"u": user_id}).mappings().all()
    return {"latest": latest, "recent": [dict(r) for r in recent]}


def delete_reading(conn: Connection, user_id: str, rid: str) -> dict:
    n = conn.execute(text("delete from health_readings where id = :i and user_id = :u"), {"i": _uuid(rid), "u": user_id}).rowcount
    if not n:
        raise GrowError("not_found", 404)
    return {"deleted": True}


# ---- Activity ----

def add_activity(conn: Connection, user_id: str, kind: str, minutes: int, on: date | None) -> dict:
    if kind not in ACTIVITY_KINDS:
        raise GrowError("bad_kind")
    on = on or date.today()
    if on > date.today():
        raise GrowError("in_the_future")
    return dict(conn.execute(text("insert into activity_logs (user_id, kind, minutes, logged_on) values (:u, :k, :m, :d) returning id, kind, minutes, logged_on"), {"u": user_id, "k": kind, "m": minutes, "d": on}).mappings().one())


def delete_activity(conn: Connection, user_id: str, aid: str) -> dict:
    n = conn.execute(text("delete from activity_logs where id = :i and user_id = :u"), {"i": _uuid(aid), "u": user_id}).rowcount
    if not n:
        raise GrowError("not_found", 404)
    return {"deleted": True}


def activity(conn: Connection, user_id: str) -> dict:
    """The last seven days as minutes per day (oldest first), this week's total, the days active in a row, and the recent entries."""
    today = date.today()
    since = today - timedelta(days=6)
    per_day = {r.d: r.m for r in conn.execute(text("select logged_on as d, sum(minutes) as m from activity_logs where user_id = :u and logged_on >= :s group by logged_on"), {"u": user_id, "s": since})}
    days = [{"date": (since + timedelta(days=i)).isoformat(), "minutes": int(per_day.get(since + timedelta(days=i), 0))} for i in range(7)]
    active = {r[0] for r in conn.execute(text("select distinct logged_on from activity_logs where user_id = :u and logged_on >= :s"), {"u": user_id, "s": today - timedelta(days=60)})}
    streak, d = 0, today if today in active else today - timedelta(days=1)  # today not logged yet does not break a streak
    while d in active:
        streak += 1
        d -= timedelta(days=1)
    recent = conn.execute(text("select id, kind, minutes, logged_on from activity_logs where user_id = :u order by logged_on desc, created_at desc limit 20"), {"u": user_id}).mappings().all()
    return {"days": days, "week_minutes": sum(x["minutes"] for x in days), "streak": streak, "recent": [dict(r) for r in recent]}


# ---- Contributions (what the person gave to their communities) ----

def contributions(conn: Connection, user_id: str) -> dict:
    totals = conn.execute(text("select count(*) as n, coalesce(sum(hours), 0) as hours, count(distinct community_id) as communities from contributions where user_id = :u"), {"u": user_id}).one()
    recent = conn.execute(
        text("select c.id, c.kind, c.description, c.hours, c.created_at, c.community_id, m.name as community_name from contributions c join communities m on m.id = c.community_id where c.user_id = :u order by c.created_at desc limit 30"),
        {"u": user_id},
    ).mappings().all()
    communities = conn.execute(
        text("select m.id, m.name from communities m join memberships ms on ms.community_id = m.id where ms.user_id = :u and ms.status = 'active' and m.status = 'active' order by ms.joined_at"), {"u": user_id}
    ).mappings().all()
    return {"count": totals.n, "hours": float(totals.hours), "communities_count": totals.communities, "recent": [{**dict(r), "hours": float(r["hours"]) if r["hours"] is not None else None} for r in recent], "my_communities": [dict(r) for r in communities]}


def add_contribution(conn: Connection, user_id: str, community_id: str, kind: str, description: str, hours: float | None) -> dict:
    if kind not in CONTRIBUTION_KINDS:
        raise GrowError("bad_kind")
    cid = _uuid(community_id)
    if conn.execute(text("select 1 from memberships where community_id = :c and user_id = :u and status = 'active'"), {"c": cid, "u": user_id}).first() is None:
        raise GrowError("not_a_member", 403)
    r = conn.execute(text("insert into contributions (community_id, user_id, kind, description, hours) values (:c, :u, :k, :d, :h) returning id, kind, description, hours, created_at"), {"c": cid, "u": user_id, "k": kind, "d": description.strip(), "h": hours}).mappings().one()
    return {**dict(r), "hours": float(r["hours"]) if r["hours"] is not None else None}


# ---- Progress: a gentle overview of the above. Counts and totals, never a score. ----

def progress(conn: Connection, user_id: str) -> dict:
    act = activity(conn, user_id)
    month = date.today().replace(day=1)
    return {
        "activity": {"week_minutes": act["week_minutes"], "streak": act["streak"], "days": act["days"]},
        "health": {"readings_this_month": conn.execute(text("select count(*) from health_readings where user_id = :u and recorded_at >= :m"), {"u": user_id, "m": month}).scalar_one()},
        "aspirations": {
            "total": conn.execute(text("select count(*) from aspirations where user_id = :u"), {"u": user_id}).scalar_one(),
            "done": conn.execute(text("select count(*) from aspirations where user_id = :u and done_at is not null"), {"u": user_id}).scalar_one(),
        },
        "explore": {
            "started": conn.execute(text("select count(*) from explore_progress where user_id = :u"), {"u": user_id}).scalar_one(),
            "completed": conn.execute(text("select count(*) from explore_progress where user_id = :u and completed_at is not null"), {"u": user_id}).scalar_one(),
        },
        "contributions": {"count": conn.execute(text("select count(*) from contributions where user_id = :u"), {"u": user_id}).scalar_one(), "hours": float(conn.execute(text("select coalesce(sum(hours), 0) from contributions where user_id = :u"), {"u": user_id}).scalar_one())},
    }
