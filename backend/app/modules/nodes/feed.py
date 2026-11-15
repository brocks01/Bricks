"""What the other modules tell the tree. Each call here is "something the person really did": a walk, a day they moved, a service they gave, a gathering they said
they would go to. It hangs in its area as a node and grows a green leaf when it is closed.

Every call is wrapped in a savepoint and swallows its own failure: the tree must never be the reason a walk is not saved or an RSVP fails.
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import Connection, text

from . import service

log = logging.getLogger(__name__)

AREAS = {
    "move": "Moving",
    "community": "Community",
    "give": "Giving back",
    "care": "Looking after me",
    "aspire": "My aspirations",
}


def _safe(conn: Connection, what: str, fn) -> None:
    try:
        with conn.begin_nested():
            fn()
    except Exception:  # noqa: BLE001 - see the module note
        log.warning("nodes feed %s failed", what, exc_info=True)


def _habit(conn: Connection, me: str, key: str, title: str, kind: str) -> None:
    h = service.ensure_habit(conn, me, key, title, kind, "move", AREAS["move"])
    service.habit_log(conn, me, h["nid"])


def walked(conn: Connection, me: str) -> None:
    _safe(conn, "walk", lambda: service.earn(conn, me, "move", AREAS["move"], "Walk", kind="walk"))
    _safe(conn, "walk-habit", lambda: _habit(conn, me, "habit:walk", "Walk every week", "weekly"))


def moved_on(conn: Connection, me: str, day: str) -> None:
    """The daily check-in answered yes: one leaf per day, however many times the answer is changed."""
    def go():
        title = f"Moved on {day}"
        if conn.execute(text("select 1 from nodes where user_id = :u and kind = 'checkin' and title = :t and not archived"), {"u": me, "t": title}).first():
            return
        service.earn(conn, me, "move", AREAS["move"], title, kind="checkin")
    _safe(conn, "checkin", go)
    _safe(conn, "checkin-habit", lambda: _habit(conn, me, "habit:move", "Move every day", "daily"))


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
    """A leaf turns green only when the person (or their Community Lead) checked them in. A gathering they said yes to and never came to stays an outline for three days,
    then is taken off the tree, so the tree never claims something that did not happen."""
    def go():
        rows = conn.execute(text(
            "select n.nid from nodes n join activities a on a.id::text = n.ref->>'id' "
            "where n.user_id = :u and n.kind = 'gathering' and not n.archived and n.badge->>'status' = 'open' "
            "and coalesce(a.ends_at, a.starts_at + interval '2 hours') < :old"), {"u": me, "old": datetime.now(timezone.utc) - timedelta(days=3)}).all()
        for r in rows:
            service.archive(conn, me, r.nid, actor="system")
    _safe(conn, "sync", go)


def attended(conn: Connection, me: str, activity_id: str) -> None:
    """Checked in at a gathering (by the person or by their Community Lead): its leaf turns green. If it was never planted, it is planted already closed."""
    def go():
        have = conn.execute(text("select nid from nodes where user_id = :u and kind = 'gathering' and ref->>'id' = :a and not archived"), {"u": me, "a": activity_id}).scalar()
        if have:
            service.set_badge(conn, me, have, {"status": "closed", "own": 1}, actor="system")
            return
        a = conn.execute(text("select title from activities where id = :a"), {"a": activity_id}).first()
        if not a:
            return
        area = service.ensure_builtin(conn, me, "community", "area", AREAS["community"])
        service.attach(conn, me, "event", a.title, parent_id=area["nid"], kind="gathering", badge={"status": "closed", "own": 1},
                       ref={"module": "communities", "model": "activity", "id": activity_id}, actor="system")
    _safe(conn, "attended", go)


def care(conn: Connection, me: str, item_id: str, occurs_iso: str, title: str, kind: str, done: bool) -> None:
    """A reminder ticked done (medicine, an appointment, exercise, anything the person planned) grows a leaf under "Looking after me"; if the tick is taken back, the leaf goes."""
    ref_id = f"{item_id}:{occurs_iso}"
    def go():
        have = conn.execute(text("select nid from nodes where user_id = :u and ref->>'id' = :r and ref->>'module' = 'calendar' and not archived"), {"u": me, "r": ref_id}).scalar()
        if done and not have:
            area = service.ensure_builtin(conn, me, "care", "area", AREAS["care"])
            service.attach(conn, me, "task", title[:200] or "Done", parent_id=area["nid"], kind=f"calendar:{kind}", badge={"status": "closed", "own": 1},
                           ref={"module": "calendar", "model": "mark", "id": ref_id}, actor="system")
        elif not done and have:
            service.archive(conn, me, have, actor="system")
    _safe(conn, "care", go)


def aspired(conn: Connection, me: str, aspiration_id: str, title: str, done: bool) -> None:
    """An aspiration the person marked reached: a leaf under "My aspirations"; unmarked, it goes."""
    def go():
        have = conn.execute(text("select nid from nodes where user_id = :u and ref->>'id' = :r and ref->>'module' = 'grow' and not archived"), {"u": me, "r": str(aspiration_id)}).scalar()
        if done and not have:
            area = service.ensure_builtin(conn, me, "aspire", "area", AREAS["aspire"])
            service.attach(conn, me, "goal", title[:200] or "Aspiration", parent_id=area["nid"], kind="aspiration", badge={"status": "closed", "own": 1},
                           ref={"module": "grow", "model": "aspiration", "id": str(aspiration_id)}, actor="system")
        elif not done and have:
            service.archive(conn, me, have, actor="system")
    _safe(conn, "aspired", go)
