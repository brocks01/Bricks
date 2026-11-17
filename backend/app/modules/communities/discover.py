"""Finding communities (revamp v2, A1): one card shape for every list, the ranking of what suits a person, a community's public basics, and the
details a leader keeps up to date (address, WhatsApp group, interests, events page).

  cards(conn, me, ids, ...)      the card of each community, in the order given
  recommend(conn, me, q, limit)  open communities the person is not in, best first (interests, then distance, then size)
  about(conn, me, cid)           what anyone signed in may see of a community before joining
  set_details(conn, me, cid, d)  a Community Lead or a platform admin saves the details

The WhatsApp link is an open invite, so it is only ever returned to active members; everyone else learns only that there is one."""
import re

from sqlalchemy import Connection, text

from ..geo import service as geo
from ..onboarding.rules import INTEREST_KEYS
from .service import CommunityError, _my_role

WHATSAPP = re.compile(r"^https://chat\.whatsapp\.com/[A-Za-z0-9]{10,40}$")
NEW_LOOKUPS = 10  # places looked up with Google in one request at most; the rest wait for the cache (the next visit)


def _first(name: str | None) -> str | None:
    return (name or "").strip().split(" ")[0] or None


def _iso(d):
    return d.isoformat() if d else None


def _gender(conn: Connection, me: str) -> str | None:
    g = conn.execute(text("select answers -> 'basics' ->> 'gender' from profiles where user_id = :u"), {"u": me}).scalar()
    return g if g in ("man", "woman") else None


def _person(conn: Connection, me: str):
    return conn.execute(text("select area_name, coalesce(interests, '{}') as interests from users where id = :u"), {"u": me}).one()


def _place(c) -> str | None:
    return (c.address or "").strip() or (c.area_name or "").strip() or None


def _same_area(mine: str | None, c) -> bool:
    m = geo.normalise(mine).replace(", singapore", "").strip()
    return bool(m) and any(m in geo.normalise(x) for x in (c.area_name, c.address) if x)


class _Places:
    """Looks places up through the cache, allowing only a few new Google lookups per request so a long list never waits on many calls."""

    def __init__(self, conn: Connection):
        self.conn, self.budget = conn, NEW_LOOKUPS

    def get(self, address: str | None):
        if not address:
            return None
        key = geo.normalise(address)
        cached = self.conn.execute(text("select lat, lng, found from geo_places where key = :k"), {"k": key}).first()
        if cached is not None and cached.found:
            return (cached.lat, cached.lng)
        if self.budget <= 0:
            return None
        self.budget -= 1
        return geo.locate(self.conn, address)


def _rows(conn: Connection, me: str, where: str, params: dict) -> list:
    return conn.execute(text(
        "select c.id, c.name, c.description, c.cover_url, c.icon, c.audience, c.circle, c.source, c.privacy, c.area_name, c.address, c.interests, c.whatsapp_url, c.events_url, "
        "h.name as host_name, (select count(*) from memberships m where m.community_id = c.id and m.status = 'active') as member_count, "
        "exists (select 1 from memberships m where m.community_id = c.id and m.user_id = :me and m.status = 'active') as is_member "
        "from communities c left join hosts h on h.id = c.host_id where c.status = 'active' and c.hidden_at is null and " + where), {"me": me, **params}).all()


def _card(conn: Connection, me: str, c, places: _Places, here, my_area: str | None, my_interests: list[str]) -> dict:
    member = bool(c.is_member)
    faces = []
    if member:
        faces = [{"name": _first(r.display_name), "avatar_url": None} for r in conn.execute(text(
            "select u.display_name from memberships m join users u on u.id = m.user_id where m.community_id = :c and m.status = 'active' and u.display_name is not null "
            "order by (m.user_id = :me) desc, m.joined_at limit 5"), {"c": c.id, "me": me}).all()]
    leader = conn.execute(text(
        "select u.display_name from role_terms t join role_definitions d on d.id = t.role_definition_id join users u on u.id = t.user_id "
        "where t.community_id = :c and t.status = 'active' and t.ends_on >= current_date and d.can_manage order by d.key = 'lead' desc, t.starts_on limit 1"), {"c": c.id}).scalar()
    nxt = conn.execute(text(
        "select title, starts_at, location from activities where community_id = :c and status = 'scheduled' and coalesce(ends_at, starts_at + interval '2 hours') >= now() "
        "order by starts_at limit 1"), {"c": c.id}).first()
    there = places.get(_place(c))
    km = round(geo.distance_km(here, there), 1) if here and there else None
    reasons: list[dict] = []
    if km is not None and km <= 15:
        reasons.append({"kind": "near", "km": km, "area": c.area_name})
    elif km is None and _same_area(my_area, c):
        reasons.append({"kind": "near", "km": None, "area": c.area_name})
    reasons += [{"kind": "interest", "key": k} for k in (c.interests or []) if k in my_interests]
    return {
        "id": str(c.id), "name": c.name, "description": c.description, "cover_url": c.cover_url, "icon": c.icon, "audience": c.audience, "circle": c.circle,
        "source": c.source, "host_name": c.host_name, "privacy": c.privacy, "area_name": c.area_name, "address": _place(c), "interests": list(c.interests or []),
        "member_count": c.member_count, "faces": faces, "leader": _first(leader) if not member else None, "leader_name": leader,
        "next_event": {"title": nxt.title, "starts_at": _iso(nxt.starts_at), "place": nxt.location} if nxt else None,
        "distance_km": km, "reasons": reasons, "is_member": member, "can_manage": bool(member and _my_role(conn, me, str(c.id))[1]), "has_whatsapp": bool(c.whatsapp_url),
        "whatsapp_url": c.whatsapp_url if member else None, "events_url": c.events_url,
    }


def _score(card: dict, my_interests: list[str]) -> int:
    s = 2 * len(set(card["interests"]) & set(my_interests))
    km = card["distance_km"]
    if km is not None:
        s += 3 if km <= 2 else 2 if km <= 5 else 1 if km <= 15 else 0
    elif any(r["kind"] == "near" for r in card["reasons"]):
        s += 2
    return s


def cards(conn: Connection, me: str, where: str = "true", params: dict | None = None) -> list[dict]:
    p = _person(conn, me)
    places = _Places(conn)
    here = places.get(p.area_name)
    return [_card(conn, me, c, places, here, p.area_name, list(p.interests)) for c in _rows(conn, me, where, params or {})]


def recommend(conn: Connection, me: str, q: str = "", limit: int = 10) -> dict:
    """Open communities the person is not in, best first. Men-only and women-only circles that do not match a declared gender are left out
    (an undeclared gender keeps them: the join asks). A person who chose interests in onboarding is shown only communities that share one of them
    (unless they search: a search looks at everything); a person with no interests sees them all."""
    p = _person(conn, me)
    mine = list(p.interests)
    g = _gender(conn, me)
    skip = {"man": "women", "woman": "men"}.get(g or "", "")
    like = f"%{q.strip().lower()}%"
    rows = _rows(conn, me,
                 "c.privacy = 'open' and not exists (select 1 from memberships m where m.community_id = c.id and m.user_id = :me and m.status = 'active') "
                 "and c.audience <> :skip and (not :hasq or lower(c.name) like :q or lower(coalesce(c.area_name, '')) like :q or lower(coalesce(c.address, '')) like :q "
                 "or lower(coalesce(c.description, '')) like :q or lower(coalesce(h.name, '')) like :q)",
                 {"skip": skip, "q": like, "hasq": bool(q.strip())})
    if mine and not q.strip():
        rows = [c for c in rows if set(c.interests or []) & set(mine)]
    places = _Places(conn)
    here = places.get(p.area_name)
    # rank cheaply first (interests, same area, size), then look places up only for the best part of the list
    rows = sorted(rows, key=lambda c: (-(2 * len(set(c.interests or []) & set(mine)) + (2 if _same_area(p.area_name, c) else 0)), -c.member_count, c.name))
    out = [_card(conn, me, c, places, here, p.area_name, mine) for c in rows[: max(limit * 3, 30)]]
    out.sort(key=lambda d: (-_score(d, mine), -d["member_count"], d["name"]))
    from .rules import limits

    return {"limits": limits(conn, me), "communities": out[: max(1, min(limit, 50))]}


def mine(conn: Connection, me: str) -> list[dict]:
    return cards(conn, me, "exists (select 1 from memberships m where m.community_id = c.id and m.user_id = :me and m.status = 'active') order by c.name")


def about(conn: Connection, me: str, cid: str) -> dict:
    """What anyone signed in may see before joining: the card, and for an open community the titles and times of what is coming up (where and who
    stay for members). An invite-only community shows its card only."""
    found = cards(conn, me, "c.id = :cid", {"cid": cid})
    if not found:
        raise CommunityError("not_found", 404)
    card = found[0]
    events = []
    if card["is_member"] or card["privacy"] == "open":
        events = [{"id": str(r.id), "title": r.title, "starts_at": _iso(r.starts_at), "ends_at": _iso(r.ends_at), "location": r.location, "image_url": r.image_url,
                   "going_count": r.going_count} for r in conn.execute(text(
                       "select x.id, x.title, x.starts_at, x.ends_at, x.location, x.image_url, "
                       "(select count(*) from activity_participants p where p.activity_id = x.id and p.status in ('going', 'attended')) as going_count "
                       "from activities x where x.community_id = :c and x.status = 'scheduled' and coalesce(x.ends_at, x.starts_at + interval '2 hours') >= now() "
                       "order by x.starts_at limit 10"), {"c": cid}).all()]
    _, can_manage = _my_role(conn, me, cid) if card["is_member"] else ("", False)
    admin = bool(conn.execute(text("select is_platform_admin from users where id = :u"), {"u": me}).scalar())
    return {"community": card, "events": events, "can_manage": can_manage or admin}


def set_details(conn: Connection, me: str, cid: str, data: dict) -> dict:
    """Only the fields sent change. An empty text clears it. A Community Lead (a role that may manage) or a platform admin."""
    admin = bool(conn.execute(text("select is_platform_admin from users where id = :u"), {"u": me}).scalar())
    if not admin:
        if not conn.execute(text("select 1 from memberships where community_id = :c and user_id = :u and status = 'active'"), {"c": cid, "u": me}).first():
            raise CommunityError("not_a_member", 403)
        if not _my_role(conn, me, cid)[1]:
            raise CommunityError("not_a_lead", 403)
    if not conn.execute(text("select 1 from communities where id = :c and status = 'active'"), {"c": cid}).first():
        raise CommunityError("not_found", 404)
    sets, params = [], {"c": cid}
    if "whatsapp_url" in data:
        w = (data["whatsapp_url"] or "").strip() or None
        if w and not WHATSAPP.match(w):
            raise CommunityError("bad_whatsapp_link", 422)
        sets.append("whatsapp_url = :w")
        params["w"] = w
    if "events_url" in data:
        e = (data["events_url"] or "").strip() or None
        if e and (not e.startswith("https://") or len(e) > 300):
            raise CommunityError("bad_events_link", 422)
        sets.append("events_url = :e")
        params["e"] = e
    if "address" in data:
        a = (data["address"] or "").strip() or None
        if a and len(a) > 200:
            raise CommunityError("address_too_long", 422)
        sets.append("address = :a")
        params["a"] = a
    if "interests" in data:
        keys = list(dict.fromkeys(data["interests"] or []))
        if any(k not in INTEREST_KEYS for k in keys):
            raise CommunityError("unknown_interest", 422)
        sets.append("interests = cast(:i as text[])")
        params["i"] = keys
    if sets:
        conn.execute(text(f"update communities set {', '.join(sets)}, updated_at = now() where id = :c"), params)
    return about(conn, me, cid)
