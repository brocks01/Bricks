"""Home: the person's upcoming events from the three products in one list, soonest first.

  upcoming(conn, me, limit, days)   gatherings of the person's communities, market events they are going to, and Wisdom sessions,
                                    from a few hours ago (so something on now still shows) to `days` ahead

It only READS: the gatherings and the market events are read with the same rules as their own modules (an active membership of an active,
visible community; a scheduled event the person said they are going to). Wisdom sessions come from `wisdom.service.upcoming_sessions`
when that module has it (round 2 of the revamp); until then there are none.
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import Connection, text

log = logging.getLogger(__name__)

BACK_HOURS = 3  # something that started up to three hours ago still shows: it may be on now
MAX_DAYS = 92  # the calendar on Home looks up to three months ahead


def _iso(d):
    return d.isoformat() if d else None


def _community(conn: Connection, me: str, start: datetime, end: datetime) -> list[dict]:
    rows = conn.execute(text(
        "select x.id, x.title, x.starts_at, x.ends_at, x.location, x.image_url, c.id as community_id, c.name, c.cover_url, "
        "exists (select 1 from activity_participants p where p.activity_id = x.id and p.user_id = :u and p.status in ('going', 'attended')) as going "
        "from activities x join communities c on c.id = x.community_id join memberships m on m.community_id = c.id "
        "where m.user_id = :u and m.status = 'active' and c.status = 'active' and c.hidden_at is null and x.status = 'scheduled' "
        "and x.starts_at >= :a and x.starts_at <= :b order by x.starts_at"), {"u": me, "a": start, "b": end}).all()
    return [{"source": "community", "id": str(r.id), "title": r.title, "starts_at": _iso(r.starts_at), "ends_at": _iso(r.ends_at), "place": r.location,
             "from_name": r.name, "image_url": r.image_url or r.cover_url, "going": bool(r.going),
             "open_key": "community.event", "open_params": {"id": str(r.community_id), "eid": str(r.id)}} for r in rows]


def _market(conn: Connection, me: str, start: datetime, end: datetime) -> list[dict]:
    rows = conn.execute(text(
        "select e.id, e.title, e.starts_at, e.ends_at, e.venue_name, e.area_name, e.cover_url, h.name as host "
        "from market_event_goers g join market_events e on e.id = g.event_id left join hosts h on h.id = e.host_id "
        "where g.user_id = :u and e.status = 'scheduled' and e.starts_at >= :a and e.starts_at <= :b order by e.starts_at"), {"u": me, "a": start, "b": end}).all()
    return [{"source": "market", "id": str(r.id), "title": r.title, "starts_at": _iso(r.starts_at), "ends_at": _iso(r.ends_at),
             "place": ", ".join(x for x in (r.venue_name, r.area_name) if x) or None, "from_name": r.host, "image_url": r.cover_url, "going": True,
             "open_key": "market.day", "open_params": {"id": str(r.id)}} for r in rows]


def _wisdom(conn: Connection, me: str, start: datetime, end: datetime) -> list[dict]:
    try:
        from ..wisdom import service as wisdom
    except ImportError:
        return []
    fn = getattr(wisdom, "upcoming_sessions", None)
    if fn is None:
        return []  # round 2 of the revamp adds it
    try:
        with conn.begin_nested():
            rows = fn(conn, me, end)
    except Exception:  # noqa: BLE001 - Home still shows the other two when Wisdom cannot answer
        log.warning("home: wisdom sessions failed", exc_info=True)
        return []
    out = []
    for s in rows or []:
        at = s.get("starts_at")
        at = at if isinstance(at, str) else _iso(at)
        if not at or not (start <= datetime.fromisoformat(at) <= end):
            continue
        out.append({"source": "wisdom", "id": str(s["id"]), "title": s.get("title") or "", "starts_at": at, "ends_at": None, "place": s.get("place"),
                    "from_name": s.get("with_name"), "image_url": None, "going": True,
                    "open_key": s.get("open_key") or "wisdom.index", "open_params": s.get("open_params") or {}})
    return out


def upcoming(conn: Connection, me: str, limit: int = 50, days: int = 30) -> dict:
    now = datetime.now(timezone.utc)
    start, end = now - timedelta(hours=BACK_HOURS), now + timedelta(days=max(1, min(int(days), MAX_DAYS)))
    items = _community(conn, me, start, end) + _market(conn, me, start, end) + _wisdom(conn, me, start, end)
    items.sort(key=lambda x: (x["starts_at"], x["source"], x["id"]))
    limit = max(1, min(int(limit), 200))
    return {"events": items[:limit], "total": len(items)}
