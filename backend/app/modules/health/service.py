"""Health: a daily check-in, walks, a private health card and a Help alert to the family. WELLNESS ONLY.
Nothing here diagnoses, scores or interprets a reading, tells anyone what a number means medically, or claims to treat anything; the app says so on its screens.
That keeps it a wellness tool rather than a medical device (Singapore HSA treats software meant only to encourage a healthy lifestyle as not a medical device).
The camera exercise coach runs on the phone and sends nothing here; only the walk and check-in numbers the person saves come to the server."""
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import Connection, text


class HealthError(Exception):
    def __init__(self, code: str, status: int = 400):
        super().__init__(code)
        self.code, self.status = code, status


def _tz(conn: Connection, me: str) -> int:
    return conn.execute(text("select coalesce(tz_offset_min, 480) from users where id = :u"), {"u": me}).scalar_one()


def today_for(conn: Connection, me: str) -> date:
    """The person's own calendar day: Singapore is not India is not the server."""
    return (datetime.now(timezone.utc) + timedelta(minutes=_tz(conn, me))).date()


def _iso(d):
    return d.isoformat() if d else None


# ---------- check-in ----------
def checkin(conn: Connection, me: str, moved: bool, feeling: int | None) -> dict:
    day = today_for(conn, me)
    conn.execute(
        text("insert into health_checkins (user_id, day, moved, feeling) values (:u, :d, :m, :f) "
             "on conflict (user_id, day) do update set moved = excluded.moved, feeling = excluded.feeling"),
        {"u": me, "d": day, "m": moved, "f": feeling})
    if moved:
        from ..nodes import feed
        feed.moved_on(conn, me, day.isoformat())
    return {"day": day.isoformat(), "moved": moved, "feeling": feeling}


def _streak(conn: Connection, me: str, today: date) -> int:
    """Days in a row they moved, counted back from today (or yesterday if today is not answered yet). A 'no' ends it, gently: no scolding anywhere."""
    rows = {r.day: r.moved for r in conn.execute(text("select day, moved from health_checkins where user_id = :u and day >= :s"), {"u": me, "s": today - timedelta(days=60)})}
    d = today if today in rows else today - timedelta(days=1)
    n = 0
    while rows.get(d) is True:
        n += 1
        d -= timedelta(days=1)
    return n


def week(conn: Connection, me: str) -> list[dict]:
    today = today_for(conn, me)
    start = today - timedelta(days=6)
    checks = {r.day: r for r in conn.execute(text("select day, moved, feeling from health_checkins where user_id = :u and day >= :s"), {"u": me, "s": start})}
    tz = _tz(conn, me)
    mins: dict[date, int] = {}
    for r in conn.execute(text("select started_at, moving_s from health_walks where user_id = :u and started_at >= :s"), {"u": me, "s": datetime.now(timezone.utc) - timedelta(days=8)}):
        d = (r.started_at + timedelta(minutes=tz)).date()
        mins[d] = mins.get(d, 0) + round(r.moving_s / 60)
    for r in conn.execute(text("select logged_on, sum(minutes) as m from activity_logs where user_id = :u and logged_on >= :s group by logged_on"), {"u": me, "s": start}):
        mins[r.logged_on] = mins.get(r.logged_on, 0) + int(r.m)
    out = []
    for i in range(7):
        d = start + timedelta(days=i)
        c = checks.get(d)
        out.append({"day": d.isoformat(), "moved": c.moved if c else None, "feeling": c.feeling if c else None, "minutes": mins.get(d, 0)})
    return out


def status(conn: Connection, me: str) -> dict:
    today = today_for(conn, me)
    c = conn.execute(text("select moved, feeling from health_checkins where user_id = :u and day = :d"), {"u": me, "d": today}).first()
    return {"day": today.isoformat(), "answered": c is not None, "moved": c.moved if c else None, "feeling": c.feeling if c else None, "streak": _streak(conn, me, today), "week": week(conn, me)}


# ---------- walks ----------
def save_walk(conn: Connection, me: str, b: dict) -> dict:
    if b["moving_s"] > b["duration_s"]:
        raise HealthError("moving_longer_than_walk", 422)
    if b["started_at"] > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise HealthError("in_the_future", 422)
    pace = round(b["moving_s"] / (b["distance_m"] / 1000)) if b["distance_m"] >= 100 else None
    r = conn.execute(
        text("insert into health_walks (user_id, started_at, duration_s, moving_s, distance_m, steps, avg_pace_s_km) values (:u, :s, :d, :m, :dist, :st, :p) returning id"),
        {"u": me, "s": b["started_at"], "d": b["duration_s"], "m": b["moving_s"], "dist": b["distance_m"], "st": b["steps"], "p": pace}).one()
    from ..nodes import feed
    feed.walked(conn, me)
    return {"id": str(r.id), "avg_pace_s_km": pace}


def list_walks(conn: Connection, me: str, limit: int = 30) -> dict:
    rows = conn.execute(
        text("select id, started_at, duration_s, moving_s, distance_m, steps, avg_pace_s_km from health_walks where user_id = :u order by started_at desc limit :n"),
        {"u": me, "n": max(1, min(limit, 100))}).all()
    now = datetime.now(timezone.utc)

    def total(a: datetime, b: datetime) -> dict:
        r = conn.execute(text("select count(*) as n, coalesce(sum(distance_m), 0) as d, coalesce(sum(steps), 0) as s, coalesce(sum(moving_s), 0) as m from health_walks where user_id = :u and started_at >= :a and started_at < :b"), {"u": me, "a": a, "b": b}).one()
        return {"walks": r.n, "distance_m": int(r.d), "steps": int(r.s), "minutes": round(r.m / 60)}

    return {
        "walks": [{"id": str(r.id), "started_at": _iso(r.started_at), "duration_s": r.duration_s, "moving_s": r.moving_s, "distance_m": r.distance_m, "steps": r.steps, "avg_pace_s_km": r.avg_pace_s_km} for r in rows],
        "this_week": total(now - timedelta(days=7), now + timedelta(minutes=5)),
        "last_week": total(now - timedelta(days=14), now - timedelta(days=7)),
    }


def delete_walk(conn: Connection, me: str, walk_id: str) -> dict:
    try:
        n = conn.execute(text("delete from health_walks where id = :i and user_id = :u"), {"i": walk_id, "u": me}).rowcount
    except Exception:  # noqa: BLE001 - not a uuid
        raise HealthError("not_found", 404) from None
    if not n:
        raise HealthError("not_found", 404)
    return {"deleted": True}


def summary(conn: Connection, me: str) -> dict:
    """The small picture for Home and the top of Health: today's check-in, the streak, this week against last, in words a person can use. No scores, no 'good' or 'bad'."""
    s = status(conn, me)
    w = list_walks(conn, me, 1)
    minutes_week = sum(d["minutes"] for d in s["week"])
    return {"answered": s["answered"], "moved": s["moved"], "streak": s["streak"], "week_minutes": minutes_week, "week_steps": w["this_week"]["steps"],
            "week_distance_m": w["this_week"]["distance_m"], "week_walks": w["this_week"]["walks"], "last_week_walks": w["last_week"]["walks"],
            "last_week_minutes": w["last_week"]["minutes"], "has_card": conn.execute(text("select 1 from health_cards where user_id = :u"), {"u": me}).first() is not None}


# ---------- health card (private to the person) ----------
def get_card(conn: Connection, me: str) -> dict:
    r = conn.execute(text("select blood_group, conditions, medicines, allergies, contact_name, contact_phone from health_cards where user_id = :u"), {"u": me}).first()
    return {"blood_group": r.blood_group, "conditions": r.conditions, "medicines": r.medicines, "allergies": r.allergies, "contact_name": r.contact_name, "contact_phone": r.contact_phone} if r else \
        {"blood_group": None, "conditions": None, "medicines": None, "allergies": None, "contact_name": None, "contact_phone": None}


def put_card(conn: Connection, me: str, b: dict) -> dict:
    conn.execute(
        text("insert into health_cards (user_id, blood_group, conditions, medicines, allergies, contact_name, contact_phone) values (:u, :bg, :c, :m, :a, :cn, :cp) "
             "on conflict (user_id) do update set blood_group = excluded.blood_group, conditions = excluded.conditions, medicines = excluded.medicines, allergies = excluded.allergies, "
             "contact_name = excluded.contact_name, contact_phone = excluded.contact_phone, updated_at = now()"),
        {"u": me, "bg": b.get("blood_group"), "c": b.get("conditions"), "m": b.get("medicines"), "a": b.get("allergies"), "cn": b.get("contact_name"), "cp": b.get("contact_phone")})
    return get_card(conn, me)


# ---------- help ----------
def send_help(conn: Connection, me: str, message: str | None) -> dict:
    """Records the alert; the family's phones show it. The app also offers to call 995 (Singapore) or 112 (India): the person decides, we never place an emergency call ourselves."""
    recent = conn.execute(text("select 1 from health_help_alerts where user_id = :u and status = 'open' and created_at > now() - interval '2 minutes'"), {"u": me}).first()
    if recent:
        raise HealthError("already_sent", 409)
    r = conn.execute(text("insert into health_help_alerts (user_id, message) values (:u, :m) returning id"), {"u": me, "m": message}).one()
    n = conn.execute(
        text("select count(distinct fm2.user_id) from family_members fm join family_members fm2 on fm2.family_id = fm.family_id and fm2.status = 'active' and fm2.user_id <> :u "
             "where fm.user_id = :u and fm.status = 'active'"), {"u": me}).scalar_one()
    return {"id": str(r.id), "family_told": n}


def help_inbox(conn: Connection, me: str) -> list[dict]:
    """Open alerts from the people in my family."""
    rows = conn.execute(
        text("select a.id, a.message, a.created_at, u.display_name from health_help_alerts a join users u on u.id = a.user_id where a.status = 'open' and a.user_id <> :u and exists "
             "(select 1 from family_members m1 join family_members m2 on m2.family_id = m1.family_id and m2.status = 'active' and m2.user_id = a.user_id where m1.user_id = :u and m1.status = 'active') "
             "order by a.created_at desc limit 20"), {"u": me}).all()
    return [{"id": str(r.id), "from": r.display_name or "", "message": r.message, "at": _iso(r.created_at)} for r in rows]


def close_help(conn: Connection, me: str, alert_id: str) -> dict:
    """The person who sent it, or a family member, closes it ("I am fine" / "I am on my way")."""
    try:
        r = conn.execute(text("select user_id from health_help_alerts where id = :i and status = 'open'"), {"i": alert_id}).first()
    except Exception:  # noqa: BLE001
        raise HealthError("not_found", 404) from None
    if r is None:
        raise HealthError("not_found", 404)
    mine = str(r.user_id) == me
    kin = conn.execute(
        text("select 1 from family_members m1 join family_members m2 on m2.family_id = m1.family_id and m2.status = 'active' and m2.user_id = :o where m1.user_id = :u and m1.status = 'active'"),
        {"o": r.user_id, "u": me}).first()
    if not (mine or kin):
        raise HealthError("not_yours", 403)
    conn.execute(text("update health_help_alerts set status = 'closed', closed_at = now() where id = :i"), {"i": alert_id})
    return {"closed": True}
