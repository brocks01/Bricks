"""Marketplace: seniors list what they can do (with their experience and proof), people and communities book them, people who really booked can endorse,
and seniors reserve stalls at a gathering-market event.

Money rule: the platform NEVER holds or moves money. A rate is only what the two sides agreed per hour; they settle it directly.
Pay guidance is a DRAFT starting point shown to the seller, by how complex the work is. It is not a legal wage, not market data, and has no gender or age dimension:
rates follow the work and the experience only (equal pay). Country scaling comes later; today it is Singapore dollars."""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import Connection, text

CATEGORIES = ("crafts", "cooking", "teaching", "repair", "music", "wellness", "advice", "storytelling", "other")
TIERS = ("basic", "skilled", "expert")
# DRAFT guide, SGD per hour, by complexity of the work. To be validated with real data before anyone relies on it.
GUIDE = {"basic": (10, 18), "skilled": (18, 35), "expert": (35, 80)}
OFFER_BANDS = ("40to59", "60plus", None)  # who may list a service: 40-59 and 60+ (and people who have not said their age yet); under 40 may hire, not list
SELLER_BAND = "60plus"  # the main seller at a gathering-market stall is a senior; a helper can be anyone


class MarketError(Exception):
    def __init__(self, code: str, status: int = 400):
        super().__init__(code)
        self.code, self.status = code, status


def _uuid(v: str) -> str:
    try:
        return str(UUID(v))
    except ValueError:
        raise MarketError("not_found", 404) from None


def guide(tier: str) -> dict:
    if tier not in GUIDE:
        raise MarketError("bad_tier", 422)
    lo, hi = GUIDE[tier]
    return {"tier": tier, "low": lo, "high": hi, "currency": "SGD", "per": "hour", "note": "A starting guide by how complex the work is. Not a legal wage; agree the price between you."}


def _iso(d):
    return d.isoformat() if d else None


def _listing(r, mine: str | None = None) -> dict:
    return {"id": str(r.id), "owner_id": str(r.owner_id), "owner_name": r.owner_name or "", "title": r.title, "category": r.category, "description": r.description,
            "tier": r.tier, "experience_years": r.experience_years, "proof_text": r.proof_text, "proof_links": list(r.proof_links or []), "verified": r.verified,
            "rate_per_hour": float(r.rate_per_hour) if r.rate_per_hour is not None else None, "currency": r.currency, "area_name": r.area_name, "status": r.status,
            "endorsements": r.endorsements, "mine": mine is not None and str(r.owner_id) == mine, "created_at": _iso(r.created_at)}


_SELECT = ("select l.*, u.display_name as owner_name, (select count(*) from service_endorsements e where e.listing_id = l.id) as endorsements "
           "from service_listings l join users u on u.id = l.owner_id")


def list_listings(conn: Connection, me: str, q: str = "", category: str | None = None, mine: bool = False, limit: int = 40) -> list[dict]:
    where, args = ["l.status = 'active'" if not mine else "l.owner_id = :me and l.status <> 'archived'"], {"me": me, "n": max(1, min(limit, 100))}
    if q.strip():
        where.append("(lower(l.title) like :q or lower(coalesce(l.description, '')) like :q or lower(coalesce(l.area_name, '')) like :q)")
        args["q"] = f"%{q.strip().lower()}%"
    if category:
        if category not in CATEGORIES:
            raise MarketError("bad_category", 422)
        where.append("l.category = :cat")
        args["cat"] = category
    rows = conn.execute(text(f"{_SELECT} where {' and '.join(where)} order by (l.verified) desc, endorsements desc, l.created_at desc limit :n"), args).all()
    return [_listing(r, me) for r in rows]


def get_listing(conn: Connection, me: str, listing_id: str) -> dict:
    r = conn.execute(text(f"{_SELECT} where l.id = :i and l.status <> 'archived'"), {"i": _uuid(listing_id)}).first()
    if r is None:
        raise MarketError("not_found", 404)
    out = _listing(r, me)
    notes = conn.execute(
        text("select e.note, e.created_at, u.display_name from service_endorsements e join users u on u.id = e.user_id where e.listing_id = :l order by e.created_at desc limit 10"),
        {"l": r.id}).all()
    out["endorsed_by"] = [{"name": n.display_name or "", "note": n.note, "at": _iso(n.created_at)} for n in notes]
    out["can_endorse"] = str(r.owner_id) != me and bool(
        conn.execute(text("select 1 from service_bookings where listing_id = :l and requester_id = :u and status = 'done'"), {"l": r.id, "u": me}).first()) and not conn.execute(
        text("select 1 from service_endorsements where listing_id = :l and user_id = :u"), {"l": r.id, "u": me}).first()
    return out


def _check_fields(b: dict) -> None:
    if b["category"] not in CATEGORIES:
        raise MarketError("bad_category", 422)
    if b["tier"] not in TIERS:
        raise MarketError("bad_tier", 422)
    if len(b["title"].strip()) < 3:
        raise MarketError("title_short", 422)


def create_listing(conn: Connection, me: str, b: dict) -> dict:
    band = conn.execute(text("select age_band from users where id = :u"), {"u": me}).scalar()
    if band not in OFFER_BANDS:
        raise MarketError("offer_not_allowed", 403)
    _check_fields(b)
    if conn.execute(text("select count(*) from service_listings where owner_id = :u and status <> 'archived'"), {"u": me}).scalar_one() >= 10:
        raise MarketError("too_many_listings", 409)
    r = conn.execute(
        text("insert into service_listings (owner_id, title, category, description, tier, experience_years, proof_text, proof_links, rate_per_hour, area_name) "
             "values (:o, :t, :c, :d, :tier, :y, :p, :pl, :r, :a) returning id"),
        {"o": me, "t": b["title"].strip(), "c": b["category"], "d": b.get("description"), "tier": b["tier"], "y": b.get("experience_years") or 0, "p": b.get("proof_text"),
         "pl": [x.strip() for x in (b.get("proof_links") or []) if x.strip()][:5], "r": b.get("rate_per_hour"), "a": b.get("area_name")}).one()
    return {"id": str(r.id)}


def _own(conn: Connection, me: str, listing_id: str):
    r = conn.execute(text("select * from service_listings where id = :i and status <> 'archived'"), {"i": _uuid(listing_id)}).first()
    if r is None:
        raise MarketError("not_found", 404)
    if str(r.owner_id) != me:
        raise MarketError("not_yours", 403)
    return r


def update_listing(conn: Connection, me: str, listing_id: str, b: dict) -> dict:
    cur = _own(conn, me, listing_id)
    merged = {"title": cur.title, "category": cur.category, "tier": cur.tier, **{k: v for k, v in b.items() if v is not None}}
    _check_fields(merged)
    conn.execute(
        text("update service_listings set title = :t, category = :c, tier = :tier, description = coalesce(:d, description), experience_years = coalesce(:y, experience_years), "
             "proof_text = coalesce(:p, proof_text), rate_per_hour = coalesce(:r, rate_per_hour), area_name = coalesce(:a, area_name), status = coalesce(:s, status), updated_at = now() where id = :i"),
        {"t": merged["title"].strip(), "c": merged["category"], "tier": merged["tier"], "d": b.get("description"), "y": b.get("experience_years"), "p": b.get("proof_text"),
         "r": b.get("rate_per_hour"), "a": b.get("area_name"), "s": b.get("status"), "i": cur.id})
    return {"id": str(cur.id)}


def archive_listing(conn: Connection, me: str, listing_id: str) -> dict:
    cur = _own(conn, me, listing_id)
    conn.execute(text("update service_listings set status = 'archived', updated_at = now() where id = :i"), {"i": cur.id})
    return {"archived": True}


# ---------- bookings ----------
def _manages(conn: Connection, user_id: str, community_id: str) -> bool:
    from ..communities.service import _my_role  # the one definition of "may manage"
    try:
        return _my_role(conn, user_id, community_id)[1]
    except Exception:  # noqa: BLE001
        return False


def request_booking(conn: Connection, me: str, listing_id: str, b: dict) -> dict:
    l = conn.execute(text("select * from service_listings where id = :i and status = 'active'"), {"i": _uuid(listing_id)}).first()
    if l is None:
        raise MarketError("not_found", 404)
    if str(l.owner_id) == me:
        raise MarketError("own_listing", 409)
    starts = b["starts_at"]
    if starts <= datetime.now(timezone.utc):
        raise MarketError("in_the_past", 422)
    cid = b.get("community_id")
    if cid:
        cid = _uuid(cid)
        if not _manages(conn, me, cid):
            raise MarketError("not_a_manager", 403)  # only a community's leaders hire for it
    if conn.execute(text("select 1 from service_bookings where listing_id = :l and requester_id = :u and status in ('requested', 'accepted') and starts_at = :s"), {"l": l.id, "u": me, "s": starts}).first():
        raise MarketError("duplicate", 409)
    r = conn.execute(
        text("insert into service_bookings (listing_id, requester_id, provider_id, community_id, starts_at, hours, agreed_rate, note) values (:l, :u, :p, :c, :s, :h, :r, :n) returning id"),
        {"l": l.id, "u": me, "p": l.owner_id, "c": cid, "s": starts, "h": b.get("hours") or 1, "r": l.rate_per_hour, "n": b.get("note")}).one()
    return {"id": str(r.id), "status": "requested"}


def _booking_dict(r, me: str) -> dict:
    return {"id": str(r.id), "listing_id": str(r.listing_id), "title": r.title, "starts_at": _iso(r.starts_at), "hours": float(r.hours),
            "agreed_rate": float(r.agreed_rate) if r.agreed_rate is not None else None, "currency": r.currency, "status": r.status, "note": r.note,
            "role": "provider" if str(r.provider_id) == me else "requester", "other_name": (r.requester_name if str(r.provider_id) == me else r.provider_name) or "",
            "community_name": r.community_name, "created_at": _iso(r.created_at)}


def list_bookings(conn: Connection, me: str) -> list[dict]:
    rows = conn.execute(
        text("select b.*, l.title, l.currency, ru.display_name as requester_name, pu.display_name as provider_name, c.name as community_name from service_bookings b "
             "join service_listings l on l.id = b.listing_id join users ru on ru.id = b.requester_id join users pu on pu.id = b.provider_id left join communities c on c.id = b.community_id "
             "where (b.requester_id = :u or b.provider_id = :u) and b.status <> 'cancelled' order by b.starts_at desc limit 60"), {"u": me}).all()
    return [_booking_dict(r, me) for r in rows]


def _booking(conn: Connection, booking_id: str):
    r = conn.execute(text("select b.*, l.title from service_bookings b join service_listings l on l.id = b.listing_id where b.id = :i"), {"i": _uuid(booking_id)}).first()
    if r is None:
        raise MarketError("not_found", 404)
    return r


def _put_in_calendar(conn: Connection, b, title_for: dict[str, str]) -> None:
    for person, title in title_for.items():
        tz = conn.execute(text("select coalesce(tz_offset_min, 480) from users where id = :u"), {"u": person}).scalar_one()
        local = b.starts_at + timedelta(minutes=tz)
        conn.execute(
            text("insert into calendar_items (person_id, created_by, kind, title, first_date, local_time, tz_offset_min, duration_min, remind_before_min, booking_id) "
                 "values (:p, :p, 'appointment', :t, :d, :tm, :tz, :dur, 60, :b)"),
            {"p": person, "t": title[:120], "d": local.date(), "tm": local.time(), "tz": tz, "dur": int(float(b.hours) * 60), "b": b.id})


def decide(conn: Connection, me: str, booking_id: str, accept: bool) -> dict:
    b = _booking(conn, booking_id)
    if str(b.provider_id) != me:
        raise MarketError("not_yours", 403)
    if b.status != "requested":
        raise MarketError("already_decided", 409)
    conn.execute(text("update service_bookings set status = :s, decided_at = now() where id = :i"), {"s": "accepted" if accept else "declined", "i": b.id})
    if accept:
        names = {str(r.id): r.display_name or "" for r in conn.execute(text("select id, display_name from users where id in (:a, :b)"), {"a": b.provider_id, "b": b.requester_id})}
        _put_in_calendar(conn, b, {str(b.provider_id): f"{b.title} with {names.get(str(b.requester_id), '')}".strip(), str(b.requester_id): f"{b.title} with {names.get(str(b.provider_id), '')}".strip()})
    return {"status": "accepted" if accept else "declined"}


def cancel(conn: Connection, me: str, booking_id: str) -> dict:
    b = _booking(conn, booking_id)
    if me not in (str(b.provider_id), str(b.requester_id)):
        raise MarketError("not_yours", 403)
    if b.status not in ("requested", "accepted"):
        raise MarketError("already_decided", 409)
    conn.execute(text("update service_bookings set status = 'cancelled', decided_at = now() where id = :i"), {"i": b.id})
    conn.execute(text("update calendar_items set status = 'cancelled' where booking_id = :i"), {"i": b.id})
    return {"status": "cancelled"}


def complete(conn: Connection, me: str, booking_id: str) -> dict:
    b = _booking(conn, booking_id)
    if str(b.provider_id) != me:
        raise MarketError("not_yours", 403)
    if b.status != "accepted":
        raise MarketError("not_accepted", 409)
    if b.starts_at > datetime.now(timezone.utc):
        raise MarketError("not_yet", 409)
    conn.execute(text("update service_bookings set status = 'done' where id = :i"), {"i": b.id})
    return {"status": "done"}


def endorse(conn: Connection, me: str, listing_id: str, note: str | None) -> dict:
    lid = _uuid(listing_id)
    b = conn.execute(text("select id from service_bookings where listing_id = :l and requester_id = :u and status = 'done' order by starts_at desc limit 1"), {"l": lid, "u": me}).first()
    if b is None:
        raise MarketError("no_booking", 403)  # only someone who really booked and had the service can endorse
    if conn.execute(text("select 1 from service_endorsements where listing_id = :l and user_id = :u"), {"l": lid, "u": me}).first():
        raise MarketError("already", 409)
    conn.execute(text("insert into service_endorsements (listing_id, user_id, booking_id, note) values (:l, :u, :b, :n)"), {"l": lid, "u": me, "b": b.id, "n": (note or None)})
    return {"endorsed": True}


# ---------- stalls at a gathering market ----------
def _market_activity(conn: Connection, me: str, activity_id: str):
    a = conn.execute(text("select a.id, a.title, a.category, a.starts_at, a.community_id from activities a where a.id = :a and a.status = 'scheduled'"), {"a": _uuid(activity_id)}).first()
    if a is None:
        raise MarketError("not_found", 404)
    from ..communities.service import is_member, CommunityError
    try:
        is_member(conn, me, str(a.community_id))
    except CommunityError:
        raise MarketError("not_a_member", 403) from None
    return a


def list_stalls(conn: Connection, me: str, activity_id: str) -> dict:
    a = _market_activity(conn, me, activity_id)
    rows = conn.execute(
        text("select s.id, s.selling, s.helper_name, s.seller_id, u.display_name from market_stalls s join users u on u.id = s.seller_id where s.activity_id = :a and s.status = 'reserved' order by s.created_at"),
        {"a": a.id}).all()
    return {"activity": {"id": str(a.id), "title": a.title, "starts_at": _iso(a.starts_at), "is_market": (a.category or "").strip().lower() == "market"},
            "stalls": [{"id": str(r.id), "seller": r.display_name or "", "selling": r.selling, "helper_name": r.helper_name, "mine": str(r.seller_id) == me} for r in rows]}


def reserve_stall(conn: Connection, me: str, activity_id: str, selling: str, helper_name: str | None) -> dict:
    a = _market_activity(conn, me, activity_id)
    if (a.category or "").strip().lower() != "market":
        raise MarketError("not_a_market", 409)
    if conn.execute(text("select age_band from users where id = :u"), {"u": me}).scalar() != SELLER_BAND:
        raise MarketError("sellers_are_seniors", 403)  # the main seller is a senior; they can bring a helper
    if len(selling.strip()) < 2:
        raise MarketError("selling_short", 422)
    r = conn.execute(
        text("insert into market_stalls (activity_id, seller_id, selling, helper_name) values (:a, :u, :s, :h) "
             "on conflict (activity_id, seller_id) do update set selling = excluded.selling, helper_name = excluded.helper_name, status = 'reserved' returning id"),
        {"a": a.id, "u": me, "s": selling.strip(), "h": (helper_name or "").strip() or None}).one()
    return {"id": str(r.id)}


def cancel_stall(conn: Connection, me: str, activity_id: str) -> dict:
    n = conn.execute(text("update market_stalls set status = 'cancelled' where activity_id = :a and seller_id = :u and status = 'reserved'"), {"a": _uuid(activity_id), "u": me}).rowcount
    if not n:
        raise MarketError("not_found", 404)
    return {"cancelled": True}


def summary(conn: Connection, me: str) -> dict:
    """For the Home card: bookings waiting for my answer, and the next accepted one."""
    waiting = conn.execute(text("select count(*) from service_bookings where provider_id = :u and status = 'requested' and starts_at > now()"), {"u": me}).scalar_one()
    mine = conn.execute(text("select count(*) from service_listings where owner_id = :u and status = 'active'"), {"u": me}).scalar_one()
    return {"waiting_for_me": waiting, "my_listings": mine}
