"""Wisdom, Teach: what an elder needs to run their mentoring. Their teaching profile, the sessions of an accepted introduction (a time and a
place, rescheduled, completed or cancelled) and the learner's review afterwards. Plain functions over one connection, like service.py.

Rules:
- only the two people of an introduction see or change its sessions;
- a reschedule tells both people, through the same notify path as every other Wisdom notice;
- completing a session logs it (so the counts in service.py stay true) and grows ONE leaf for each of the two people, however often it is completed;
- only the learner reviews, once per session, with a score from 1 to 5 and a short note."""
import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import Connection, text

from ..nodes import feed
from .service import WisdomError, _first, _iso, _tell

_TIME = re.compile(r"^([01]?\d|2[0-3]):([0-5]\d)$")


def _hhmm(v, field: str) -> str | None:
    s = str(v or "").strip()
    if not s:
        return None
    m = _TIME.match(s)
    if not m:
        raise WisdomError(f"bad_{field}", 422)
    return f"{int(m.group(1)):02d}:{m.group(2)}"


def _is_uuid(v) -> bool:
    try:
        uuid.UUID(str(v))
        return True
    except ValueError:
        return False


def _when(v) -> datetime:
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        raise WisdomError("bad_starts_at", 422) from None
    if d.tzinfo is None:
        raise WisdomError("bad_starts_at", 422)
    return d


# ---------- the teaching profile ----------
def teaching_profile(conn: Connection, me: str) -> dict:
    r = conn.execute(text("select * from wisdom_teaching_profiles where user_id = :u"), {"u": me}).first()
    if r is None:
        return {"expertise": None, "bio": None, "days": None, "start_time": None, "end_time": None, "saved": False}
    return {"expertise": r.expertise, "bio": r.bio, "days": r.days, "start_time": r.start_time.strftime("%H:%M") if r.start_time else None,
            "end_time": r.end_time.strftime("%H:%M") if r.end_time else None, "saved": True}


def save_teaching_profile(conn: Connection, me: str, data: dict) -> dict:
    """Saves what is given; a field left out keeps its value, an empty one is cleared."""
    now = teaching_profile(conn, me)
    limits = {"expertise": 120, "bio": 1000, "days": 40}
    out = dict(now)
    for k, n in limits.items():
        if k in data:
            v = str(data.get(k) or "").strip()
            if len(v) > n:
                raise WisdomError(f"bad_{k}", 422)
            out[k] = v or None
    for k in ("start_time", "end_time"):
        if k in data:
            out[k] = _hhmm(data.get(k), k)
    if out["start_time"] and out["end_time"] and out["end_time"] <= out["start_time"]:
        raise WisdomError("bad_end_time", 422)
    conn.execute(text("insert into wisdom_teaching_profiles (user_id, expertise, bio, days, start_time, end_time) values (:u, :e, :b, :d, cast(:s as time), cast(:t as time)) "
                      "on conflict (user_id) do update set expertise = excluded.expertise, bio = excluded.bio, days = excluded.days, "
                      "start_time = excluded.start_time, end_time = excluded.end_time, updated_at = now()"),
                 {"u": me, "e": out["expertise"], "b": out["bio"], "d": out["days"], "s": out["start_time"], "t": out["end_time"]})
    return teaching_profile(conn, me)


# ---------- sessions ----------
_MEET = ("select m.*, c.mentor_id, c.learner_id, c.group_name, c.learner_count, "
         "r.score as review_score, r.note as review_note "
         "from wisdom_meetings m join wisdom_connections c on c.id = m.connection_id "
         "left join wisdom_reviews r on r.meeting_id = m.id and r.learner_id = c.learner_id ")


def _session(conn: Connection, r, me: str) -> dict:
    mentor = str(r.mentor_id) == me
    other = str(r.learner_id) if mentor else str(r.mentor_id)
    return {"id": str(r.id), "connection_id": str(r.connection_id), "title": r.title, "starts_at": _iso(r.starts_at), "minutes": r.minutes, "place": r.place,
            "status": r.status, "with_name": (r.group_name if mentor and r.group_name else _first(conn, other)), "role": "teacher" if mentor else "learner",
            "group_name": r.group_name, "learner_count": r.learner_count, "completed_at": _iso(r.completed_at),
            "review": {"score": r.review_score, "note": r.review_note} if r.review_score is not None else None,
            "can_review": (not mentor) and r.status == "completed" and r.review_score is None}


def _mine(conn: Connection, me: str, session_id: str, lock: bool = False):
    r = None
    if _is_uuid(session_id):  # a malformed id is the same as one that is not there
        r = conn.execute(text(_MEET + "where m.id = cast(:m as uuid) and c.status = 'accepted' and (c.mentor_id = :u or c.learner_id = :u)" + (" for update of m" if lock else "")),
                         {"m": session_id, "u": me}).first()
    if r is None:
        raise WisdomError("not_found", 404)
    return r


def sessions(conn: Connection, me: str, connection_id: str | None = None) -> list[dict]:
    """Every session of the person's accepted introductions (or of one), coming up first in time order, then the past ones newest first."""
    rows = conn.execute(text(_MEET + "where c.status = 'accepted' and (c.mentor_id = :u or c.learner_id = :u) and (:c = '' or m.connection_id::text = :c) "
                             "order by (m.status = 'scheduled') desc, case when m.status = 'scheduled' then m.starts_at end asc, m.starts_at desc limit 200"),
                        {"u": me, "c": connection_id or ""}).all()
    return [_session(conn, r, me) for r in rows]


def schedule(conn: Connection, me: str, connection_id: str, data: dict) -> dict:
    """Either side plans a session of an accepted introduction."""
    c = conn.execute(text("select * from wisdom_connections where id::text = :c and status = 'accepted' and (mentor_id = :u or learner_id = :u)"), {"c": connection_id, "u": me}).first()
    if c is None:
        raise WisdomError("not_found", 404)
    title = str(data.get("title") or "").strip()
    if not 2 <= len(title) <= 120:
        raise WisdomError("bad_title", 422)
    place = str(data.get("place") or "").strip()[:200] or None
    try:
        minutes = int(data.get("minutes") or 60)
        assert 10 <= minutes <= 600
    except (TypeError, ValueError, AssertionError):
        raise WisdomError("bad_minutes", 422) from None
    r = conn.execute(text("insert into wisdom_meetings (connection_id, title, starts_at, minutes, place, created_by) values (:c, :t, :s, :n, :p, :u) returning id"),
                     {"c": str(c.id), "t": title, "s": _when(data.get("starts_at")), "n": minutes, "p": place, "u": me}).one()
    other = str(c.learner_id) if str(c.mentor_id) == me else str(c.mentor_id)
    _tell(other, f"{_first(conn, me)} planned a Wisdom session with you: “{title}”. Open Wisdom to see the time.")
    return _session(conn, _mine(conn, me, str(r.id)), me)


def reschedule(conn: Connection, me: str, session_id: str, starts_at) -> dict:
    """A new time for a session that has not happened yet. Both people are told."""
    r = _mine(conn, me, session_id, lock=True)
    if r.status != "scheduled":
        raise WisdomError("not_scheduled", 409)
    when = _when(starts_at)
    conn.execute(text("update wisdom_meetings set starts_at = :s where id = :m"), {"s": when, "m": str(r.id)})
    line = f"The Wisdom session “{r.title}” has a new time. Open Wisdom to see it."
    _tell(str(r.mentor_id), line)
    _tell(str(r.learner_id), line)
    return _session(conn, _mine(conn, me, session_id), me)


def complete(conn: Connection, me: str, session_id: str) -> dict:
    """The session happened. It is logged once, and each of the two people gets one leaf for showing up."""
    r = _mine(conn, me, session_id, lock=True)
    if r.status == "cancelled":
        raise WisdomError("not_scheduled", 409)
    if r.status == "scheduled":
        sid = conn.execute(text("insert into wisdom_sessions (connection_id, logged_by, minutes, occurred_at) values (:c, :u, :n, least(:at, now())) returning id"),
                           {"c": str(r.connection_id), "u": me, "n": r.minutes, "at": r.starts_at}).scalar()
        conn.execute(text("update wisdom_meetings set status = 'completed', completed_at = now(), session_id = :s where id = :m"), {"s": sid, "m": str(r.id)})
    mentor, learner = str(r.mentor_id), str(r.learner_id)
    at = min(r.starts_at, datetime.now(timezone.utc))
    feed.showed_up(conn, mentor, "wisdom", str(r.id), r.title, at, source_name=r.group_name or _first(conn, learner))
    feed.showed_up(conn, learner, "wisdom", str(r.id), r.title, at, source_name=_first(conn, mentor))
    return _session(conn, _mine(conn, me, session_id), me)


def cancel(conn: Connection, me: str, session_id: str) -> dict:
    r = _mine(conn, me, session_id, lock=True)
    if r.status != "scheduled":
        raise WisdomError("not_scheduled", 409)
    conn.execute(text("update wisdom_meetings set status = 'cancelled' where id = :m"), {"m": str(r.id)})
    other = str(r.learner_id) if str(r.mentor_id) == me else str(r.mentor_id)
    _tell(other, f"The Wisdom session “{r.title}” will not happen. Open Wisdom to plan another time.")
    return _session(conn, _mine(conn, me, session_id), me)


def review(conn: Connection, me: str, session_id: str, score, note: str | None = None) -> dict:
    """The learner's score from 1 to 5 and a short note, after a completed session. Once."""
    r = _mine(conn, me, session_id)
    if str(r.learner_id) != me:
        raise WisdomError("not_the_learner", 403)
    if r.status != "completed":
        raise WisdomError("not_completed", 409)
    try:
        score = int(score)
        assert 1 <= score <= 5
    except (TypeError, ValueError, AssertionError):
        raise WisdomError("bad_score", 422) from None
    line = str(note or "").strip()
    if len(line) > 500:
        raise WisdomError("bad_note", 422)
    res = conn.execute(text("insert into wisdom_reviews (meeting_id, learner_id, score, note) values (:m, :u, :s, :n) on conflict (meeting_id, learner_id) do nothing"),
                       {"m": str(r.id), "u": me, "s": score, "n": line or None})
    if res.rowcount == 0:
        raise WisdomError("already_reviewed", 409)
    return _session(conn, _mine(conn, me, session_id), me)


def upcoming_sessions(conn: Connection, user_id: str, until: datetime) -> list[dict]:
    """For Home (contract point 5): the person's scheduled sessions from now until `until`, soonest first. Each carries the page that opens it."""
    rows = conn.execute(text(_MEET + "where m.status = 'scheduled' and c.status = 'accepted' and (c.mentor_id = :u or c.learner_id = :u) "
                             "and m.starts_at >= now() - interval '1 hour' and m.starts_at <= :until order by m.starts_at limit 50"), {"u": user_id, "until": until}).all()
    out = []
    for r in rows:
        s = _session(conn, r, user_id)
        out.append({**{k: s[k] for k in ("id", "title", "starts_at", "place", "with_name", "role")}, "open_key": "wisdom.session", "open_params": {"id": s["id"]}})
    return out
