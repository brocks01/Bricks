"""Weekly steps before a market day ("four weeks of herbs, one market day"): the circle that plans a visit to an event sets small steps
toward its stall, its members see them and tick them off together, and one gentle nudge goes through the outbox when a step comes due.
- Only a Community Lead of a community that PLANNED the visit sets or removes steps; every member sees them and may tick one.
- Steps belong to the circle, not to one person: they are the circle's plan, never a task list laid on an individual.
- The nudge is one per person per step, at most two a day, never in quiet hours (the outbox decides the hour).
Plain functions over one database connection."""
from datetime import date, datetime, timezone

from sqlalchemy import Connection, text

from ...core.db import engine
from ..channels import outbox
from ..communities.service import CommunityError, _member, _my_role
from .events import _event_row, _uuid
from .service import MarketError

UTC = timezone.utc
NUDGE_DAYS = 3  # a step due within this many days (or overdue) is worth a gentle word
MAX_PER_DAY = 2  # at most two step nudges per person per day, like the gathering nudge


def _planned_of_mine(conn: Connection, me: str, eid: str) -> list[str]:
    """The communities of mine that planned a visit to this event."""
    return [str(r.community_id) for r in conn.execute(text(
        "select p.community_id from market_event_plans p join memberships m on m.community_id = p.community_id "
        "where p.event_id = :e and m.user_id = :u and m.status = 'active'"), {"e": _uuid(eid), "u": me})]


def list_for(conn: Connection, me: str, eid: str) -> dict:
    """The steps of the circles of mine that planned this visit (members only), and whether I may add one (I lead one of them)."""
    _event_row(conn, eid)
    planned = _planned_of_mine(conn, me, eid)
    rows = []
    if planned:
        rows = conn.execute(text(
            "select m.id, m.title, m.due_on, m.done, c.name as community from market_event_milestones m "
            "join communities c on c.id = m.community_id where m.event_id = :e and m.community_id = any(cast(:cs as uuid[])) "
            "order by m.done, m.due_on nulls last, m.created_at"), {"e": _uuid(eid), "cs": planned}).all()
    leads = [c for c in planned if _my_role(conn, me, c)[1]]
    return {"milestones": [{"id": str(r.id), "title": r.title, "due_on": r.due_on.isoformat() if r.due_on else None,
                            "done": r.done, "community": r.community} for r in rows],
            "can_add": bool(leads), "my_community_id": leads[0] if leads else (planned[0] if planned else None)}


def add(conn: Connection, me: str, eid: str, community_id: str, title: str, due_on: date | None) -> dict:
    """A Community Lead of a community that planned this visit sets one small step. Members see it at once."""
    _event_row(conn, eid)
    try:
        _member(conn, me, community_id)
        if not _my_role(conn, me, community_id)[1]:
            raise CommunityError("not_a_lead", 403)
    except CommunityError as e:
        raise MarketError(e.code, e.status) from None
    if not conn.execute(text("select 1 from market_event_plans where event_id = :e and community_id = :c"),
                        {"e": _uuid(eid), "c": _uuid(community_id)}).first():
        raise MarketError("not_planned", 409)  # only a visit the circle really planned carries steps
    t = (title or "").strip()
    if not 2 <= len(t) <= 200:
        raise MarketError("validation", 422)
    row = conn.execute(text(
        "insert into market_event_milestones (event_id, community_id, title, due_on, created_by) values (:e, :c, :t, :d, :u) "
        "on conflict (event_id, community_id, title) do nothing returning id"),
        {"e": _uuid(eid), "c": _uuid(community_id), "t": t, "d": due_on, "u": me}).first()
    if row is None:
        raise MarketError("already_exists", 409)
    return {"id": str(row.id), "title": t, "added": True}


def tick(conn: Connection, me: str, eid: str, mid: str, done: bool) -> dict:
    """Anyone in that circle ticks a step off (and back on again). It is the circle's plan, not one person's list."""
    r = conn.execute(text("select id, community_id from market_event_milestones where id = :m and event_id = :e"),
                     {"m": _uuid(mid), "e": _uuid(eid)}).first()
    if r is None:
        raise MarketError("not_found", 404)
    try:
        _member(conn, me, str(r.community_id))
    except CommunityError as e:
        raise MarketError(e.code, e.status) from None
    conn.execute(text("update market_event_milestones set done = :d, done_by = case when :d then :u else null end, "
                      "done_at = case when :d then now() else null end where id = :m"),
                 {"d": bool(done), "u": me, "m": r.id})
    return {"done": bool(done)}


def remove(conn: Connection, me: str, eid: str, mid: str) -> dict:
    """A Community Lead of that circle takes one step back out."""
    r = conn.execute(text("select id, community_id from market_event_milestones where id = :m and event_id = :e"),
                     {"m": _uuid(mid), "e": _uuid(eid)}).first()
    if r is None:
        raise MarketError("not_found", 404)
    try:
        _member(conn, me, str(r.community_id))
        if not _my_role(conn, me, str(r.community_id))[1]:
            raise CommunityError("not_a_lead", 403)
    except CommunityError as e:
        raise MarketError(e.code, e.status) from None
    conn.execute(text("delete from market_event_milestones where id = :m"), {"m": r.id})
    return {"removed": True}


def run_once(now: datetime | None = None) -> int:
    """The tick the background loop calls: a step that is due soon (or overdue) and still undone sends ONE gentle word
    through the outbox to each member of that circle — once per person per step, at most two a day, never at night.
    Returns how many nudges were sent."""
    now = now or datetime.now(UTC)
    sent = 0
    with engine().connect() as conn:
        due = conn.execute(text(
            "select m.id, m.title, m.due_on, m.community_id, e.title as event_title from market_event_milestones m "
            "join market_events e on e.id = m.event_id where not m.done and m.due_on is not null "
            "and m.due_on <= current_date + :nd and e.status = 'scheduled' and e.starts_at > :now"),
            {"nd": NUDGE_DAYS, "now": now}).all()
    for d in due:
        with engine().connect() as conn:
            members = [str(r.user_id) for r in conn.execute(text(
                "select user_id from memberships where community_id = :c and status = 'active'"), {"c": d.community_id})]
        when = d.due_on.strftime("%a %d %b") if d.due_on else ""
        body = f"One step toward {d.event_title}: {d.title}{' by ' + when if when else ''}. Small steps count — tick it off when it is done."
        for uid in members:
            with engine().connect() as conn:
                recent = conn.execute(text(
                    "select count(*) from notifications where user_id = :u and kind = 'milestone' and created_at > now() - interval '1 day'"),
                    {"u": uid}).scalar_one()
                polite = outbox.next_ok_time(conn, uid, now) <= now
            if recent >= MAX_PER_DAY or not polite:
                continue
            r = outbox.send(uid, body, kind="milestone", dedupe_key=f"milestone:{d.id}", now=now)
            sent += 1 if r["status"] not in ("duplicate", "empty") else 0
    return sent
