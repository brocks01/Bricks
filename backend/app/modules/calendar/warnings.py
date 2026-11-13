"""Conflict warnings for the calendar: a WARNING, never a blockade - the person can always save.

Kept in its own small module (owner, 13 Nov 2026) so the rules can grow gradually: margins, travel
time, and "what kind of thing does this clash with" evolve here alone. The first cut:

* a **group event** is warned when another event (a saved one, or a community activity the person is
  going to) overlaps it or sits less than 15 minutes beside it - two places at once is a real clash;
* a plain reminder is warned only when something else is set for exactly the same minute of the
  person's day - two reminders at 8 o'clock can be fine (medicine and phoning mum), so we say it
  plainly instead of blocking.
"""
from datetime import datetime, timedelta

from sqlalchemy import Connection, text

from .service import expand  # the one expansion algorithm; the service does not import this module

EVENT_GAP_MIN = 15  # less than this between two events: warn


def check(conn: Connection, person_id: str, starts_at_utc: datetime, kind: str, exclude_item_id: str | None = None) -> list[dict]:
    """The warnings for putting one more thing in this person's day at this moment."""
    out: list[dict] = []
    window_start = starts_at_utc - timedelta(minutes=EVENT_GAP_MIN + 1)
    window_end = starts_at_utc + timedelta(minutes=EVENT_GAP_MIN + 1)

    items = conn.execute(
        text("select * from calendar_items where person_id = cast(:p as uuid) and status = 'active' and id != cast(coalesce(:x, '00000000-0000-0000-0000-000000000000') as uuid)"),
        {"p": person_id, "x": exclude_item_id},
    ).all()
    for it in items:
        for occurs in _expand_window(it, window_start, window_end):
            gap = round(abs((occurs - starts_at_utc).total_seconds()) / 60)
            if kind == "event" and it.kind == "event" and gap < EVENT_GAP_MIN:
                out.append({"why": "clash", "with_title": it.title, "with_at": occurs.isoformat(), "gap_min": gap})
            elif kind != "event" and gap == 0:
                # exactly the same minute: fine to save, but the person should know
                out.append({"why": "duplicate", "with_title": it.title, "with_at": occurs.isoformat(), "gap_min": 0})

    if kind == "event":
        rows = conn.execute(
            text("""
                select a.title, a.starts_at
                from activity_participants ap
                join activities a on a.id = ap.activity_id
                where ap.user_id = :p and a.status = 'scheduled'
                  and a.starts_at >= :s and a.starts_at < :e
            """),
            {"p": person_id, "s": window_start, "e": window_end},
        ).all()
        for r in rows:
            gap = round(abs((r.starts_at - starts_at_utc).total_seconds()) / 60)
            if gap < EVENT_GAP_MIN:
                out.append({"why": "clash", "with_title": r.title, "with_at": r.starts_at.isoformat(), "gap_min": gap})

    out.sort(key=lambda w: (w["why"] != "clash", w["gap_min"], w["with_at"]))
    return out


def _expand_window(item, window_start: datetime, window_end: datetime) -> list[datetime]:
    """The item's times inside [window_start, window_end), walked with a day of padding either side."""
    return [t for t in expand(item, window_start - timedelta(days=1), window_end + timedelta(days=1))
            if window_start <= t < window_end]
