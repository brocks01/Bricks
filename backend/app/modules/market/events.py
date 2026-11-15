"""Market events: the company hosts a market in a mall or a community centre; seniors sell what they make or show a skill; the venue gets the footfall;
communities go together. A Community Lead plans the community's visit, members say they are going (with their community), seniors take stalls.
Nobody is paid through us: the platform never holds or moves money."""
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import Connection, text

from ..communities.service import CommunityError, _member, _my_role
from .service import SELLER_BAND, MarketError

SLOTS = ("first", "second", "whole")
KINDS = ("goods", "skill")


def _uuid(v: str) -> str:
    try:
        return str(UUID(v))
    except ValueError:
        raise MarketError("not_found", 404) from None


def _iso(d):
    return d.isoformat() if d else None


def _event_row(conn: Connection, eid: str):
    r = conn.execute(text("select * from market_events where id = :e and status = 'scheduled'"), {"e": _uuid(eid)}).first()
    if r is None:
        raise MarketError("not_found", 404)
    return r


def _my_communities(conn: Connection, me: str) -> dict[str, str]:
    return {str(r.id): r.name for r in conn.execute(text("select c.id, c.name from memberships m join communities c on c.id = m.community_id where m.user_id = :u and m.status = 'active' and c.status = 'active'"), {"u": me})}


def _card(conn: Connection, me: str, r, mine: dict[str, str]) -> dict:
    taken = conn.execute(text("select count(*) from market_event_stalls where event_id = :e and status = 'reserved'"), {"e": r.id}).scalar_one()
    going = conn.execute(text("select count(*) from market_event_goers where event_id = :e"), {"e": r.id}).scalar_one()
    i_going = conn.execute(text("select community_id from market_event_goers where event_id = :e and user_id = :u"), {"e": r.id, "u": me}).first()
    plans = conn.execute(text(
        "select p.community_id, c.name, (select count(*) from market_event_goers g where g.event_id = p.event_id and g.community_id = p.community_id) as n "
        "from market_event_plans p join communities c on c.id = p.community_id where p.event_id = :e order by n desc, c.name"), {"e": r.id}).all()
    my_plans = [{"community_id": str(p.community_id), "name": p.name, "going": p.n} for p in plans if str(p.community_id) in mine]
    return {
        "id": str(r.id), "title": r.title, "description": r.description, "venue_name": r.venue_name, "venue_kind": r.venue_kind, "address": r.address, "area_name": r.area_name,
        "starts_at": _iso(r.starts_at), "ends_at": _iso(r.ends_at), "cover_url": r.cover_url, "stalls_total": r.stalls_total, "stalls_taken": taken, "stalls_left": max(0, r.stalls_total - taken),
        "going_count": going, "i_going": i_going is not None, "going_with": str(i_going.community_id) if i_going and i_going.community_id else None,
        "communities": [{"community_id": str(p.community_id), "name": p.name, "going": p.n, "mine": str(p.community_id) in mine} for p in plans], "my_communities": my_plans,
    }


def list_events(conn: Connection, me: str, limit: int = 10) -> list[dict]:
    """The coming events, soonest first. Each says which of the person's communities are going and how many of them."""
    mine = _my_communities(conn, me)
    rows = conn.execute(text("select * from market_events where status = 'scheduled' and coalesce(ends_at, starts_at + interval '4 hours') >= now() order by starts_at limit :n"), {"n": max(1, min(limit, 30))}).all()
    return [_card(conn, me, r, mine) for r in rows]


def get_event(conn: Connection, me: str, eid: str) -> dict:
    r = _event_row(conn, eid)
    out = _card(conn, me, r, _my_communities(conn, me))
    stalls = conn.execute(text(
        "select s.id, s.selling, s.kind, s.helper_name, s.slot, s.seller_id, coalesce(u.display_name, '') as seller, c.name as community "
        "from market_event_stalls s join users u on u.id = s.seller_id left join communities c on c.id = s.community_id where s.event_id = :e and s.status = 'reserved' order by s.created_at"), {"e": r.id}).all()
    out["stalls"] = [{"id": str(s.id), "selling": s.selling, "kind": s.kind, "helper_name": s.helper_name, "slot": s.slot, "seller": s.seller, "community": s.community, "mine": str(s.seller_id) == me} for s in stalls]
    return out


def plan_community(conn: Connection, me: str, eid: str, cid: str, on: bool) -> dict:
    """A Community Lead plans (or cancels) the community's visit to this event."""
    r = _event_row(conn, eid)
    try:
        _member(conn, me, cid)
        if not _my_role(conn, me, cid)[1]:
            raise CommunityError("not_a_lead", 403)
    except CommunityError as e:
        raise MarketError(e.code, e.status) from None
    if on:
        conn.execute(text("insert into market_event_plans (event_id, community_id, planned_by) values (:e, :c, :u) on conflict do nothing"), {"e": r.id, "c": cid, "u": me})
    else:
        conn.execute(text("delete from market_event_plans where event_id = :e and community_id = :c"), {"e": r.id, "c": cid})
        conn.execute(text("update market_event_goers set community_id = null where event_id = :e and community_id = :c"), {"e": r.id, "c": cid})
    return {"planned": on}


def set_going(conn: Connection, me: str, eid: str, going: bool, community_id: str | None = None) -> dict:
    """"I am going". With a community that planned the visit, the person goes with it (the first planned community of theirs when none is named)."""
    r = _event_row(conn, eid)
    if not going:
        conn.execute(text("delete from market_event_goers where event_id = :e and user_id = :u"), {"e": r.id, "u": me})
        return {"going": False}
    mine = _my_communities(conn, me)
    planned = [str(x.community_id) for x in conn.execute(text("select community_id from market_event_plans where event_id = :e"), {"e": r.id}) if str(x.community_id) in mine]
    chosen = community_id if community_id in planned else (planned[0] if planned else None)
    conn.execute(text("insert into market_event_goers (event_id, user_id, community_id) values (:e, :u, :c) on conflict (event_id, user_id) do update set community_id = excluded.community_id"), {"e": r.id, "u": me, "c": chosen})
    return {"going": True, "with": chosen}


def take_stall(conn: Connection, me: str, eid: str, selling: str, helper_name: str | None, slot: str, kind: str = "goods") -> dict:
    """A stall for a senior: what they sell, or the skill they show. Counts toward the event's stalls; they are marked as going too."""
    r = _event_row(conn, eid)
    if conn.execute(text("select age_band from users where id = :u"), {"u": me}).scalar() != SELLER_BAND:
        raise MarketError("sellers_are_seniors", 403)
    if len(selling.strip()) < 2:
        raise MarketError("selling_short", 422)
    if slot not in SLOTS or kind not in KINDS:
        raise MarketError("validation", 422)
    mine = _my_communities(conn, me)
    taken = conn.execute(text("select count(*) from market_event_stalls where event_id = :e and status = 'reserved' and seller_id <> :u"), {"e": r.id, "u": me}).scalar_one()
    if taken >= r.stalls_total:
        raise MarketError("no_stalls_left", 409)
    planned = [str(x.community_id) for x in conn.execute(text("select community_id from market_event_plans where event_id = :e"), {"e": r.id}) if str(x.community_id) in mine]
    com = planned[0] if planned else None
    s = conn.execute(text(
        "insert into market_event_stalls (event_id, seller_id, community_id, selling, kind, helper_name, slot) values (:e, :u, :c, :s, :k, :h, :sl) "
        "on conflict (event_id, seller_id) do update set selling = excluded.selling, kind = excluded.kind, helper_name = excluded.helper_name, slot = excluded.slot, community_id = excluded.community_id, status = 'reserved' returning id"),
        {"e": r.id, "u": me, "c": com, "s": selling.strip(), "k": kind, "h": (helper_name or "").strip() or None, "sl": slot}).scalar_one()
    conn.execute(text("insert into market_event_goers (event_id, user_id, community_id) values (:e, :u, :c) on conflict (event_id, user_id) do nothing"), {"e": r.id, "u": me, "c": com})
    return {"id": str(s)}


def cancel_stall(conn: Connection, me: str, eid: str) -> dict:
    n = conn.execute(text("update market_event_stalls set status = 'cancelled' where event_id = :e and seller_id = :u and status = 'reserved'"), {"e": _uuid(eid), "u": me}).rowcount
    if not n:
        raise MarketError("not_found", 404)
    return {"cancelled": True}


def for_community(conn: Connection, me: str, cid: str) -> list[dict]:
    """The events this community plans to visit, for its page. Members only."""
    try:
        _member(conn, me, cid)
    except CommunityError as e:
        raise MarketError(e.code, e.status) from None
    mine = _my_communities(conn, me)
    rows = conn.execute(text(
        "select e.* from market_events e join market_event_plans p on p.event_id = e.id where p.community_id = :c and e.status = 'scheduled' "
        "and coalesce(e.ends_at, e.starts_at + interval '4 hours') >= now() order by e.starts_at"), {"c": cid}).all()
    return [_card(conn, me, r, mine) for r in rows]
