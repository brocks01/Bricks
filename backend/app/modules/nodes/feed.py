"""What the other modules tell the tree. Each call here is "something the person really did": a walk, a day they moved, a service they gave, a gathering they said
they would go to. It hangs in its area as a node and grows a green leaf when it is closed.

Every call is wrapped in a savepoint and swallows its own failure: the tree must never be the reason a walk is not saved or an RSVP fails.
"""
import logging
from datetime import datetime, timezone

from sqlalchemy import Connection, text

from . import service

log = logging.getLogger(__name__)

AREAS = {
    "move": "Moving",
    "community": "Community",
    "give": "Giving back",
}


def _safe(conn: Connection, what: str, fn) -> None:
    try:
        with conn.begin_nested():
            fn()
    except Exception:  # noqa: BLE001 - see the module note
        log.warning("nodes feed %s failed", what, exc_info=True)


def walked(conn: Connection, me: str) -> None:
    _safe(conn, "walk", lambda: service.earn(conn, me, "move", AREAS["move"], "Walk", kind="walk"))


def moved_on(conn: Connection, me: str, day: str) -> None:
    """The daily check-in answered yes: one leaf per day, however many times the answer is changed."""
    def go():
        title = f"Moved on {day}"
        if conn.execute(text("select 1 from nodes where user_id = :u and kind = 'checkin' and title = :t and not archived"), {"u": me, "t": title}).first():
            return
        service.earn(conn, me, "move", AREAS["move"], title, kind="checkin")
    _safe(conn, "checkin", go)


def helped(conn: Connection, me: str, title: str) -> None:
    _safe(conn, "helped", lambda: service.earn(conn, me, "give", AREAS["give"], title[:200] or "Helped", kind="service"))


def going(conn: Connection, me: str, activity_id: str, is_going: bool) -> None:
    """Saying "I am going" plants an open event under Community; changing your mind takes it out. It is closed once the gathering has passed (sync_events)."""
    def go():
        have = conn.execute(text("select nid from nodes where user_id = :u and kind = 'gathering' and ref->>'id' = :a and not archived"), {"u": me, "a": activity_id}).scalar()
        if is_going and not have:
            a = conn.execute(text("select title, starts_at from activities where id = :a"), {"a": activity_id}).first()
            if not a:
                return
            area = service.ensure_builtin(conn, me, "community", "area", AREAS["community"], parent_key="")
            service.attach(conn, me, "event", a.title, parent_id=area["nid"], kind="gathering", badge={"status": "open", "due": a.starts_at.isoformat()},
                           ref={"module": "communities", "model": "activity", "id": activity_id}, actor="system")
        elif not is_going and have:
            service.archive(conn, me, have, actor="system")
    _safe(conn, "going", go)


def sync_events(conn: Connection, me: str) -> None:
    """Gatherings the person said they would go to, now in the past, become closed: the leaf turns green."""
    def go():
        rows = conn.execute(text(
            "select n.nid from nodes n join activities a on a.id::text = n.ref->>'id' "
            "where n.user_id = :u and n.kind = 'gathering' and not n.archived and n.badge->>'status' = 'open' "
            "and coalesce(a.ends_at, a.starts_at + interval '2 hours') < :now"), {"u": me, "now": datetime.now(timezone.utc)}).all()
        for r in rows:
            service.set_badge(conn, me, r.nid, {"status": "closed", "own": 1}, actor="system")
    _safe(conn, "sync", go)
