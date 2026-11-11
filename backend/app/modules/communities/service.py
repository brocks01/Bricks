"""Communities: which communities a person belongs to, what is inside one, creating one, joining by code, saying "I am going" to an activity.
Plain functions over one database connection. A person sees a community only if they are an active member of it."""
import re
import secrets

from sqlalchemy import Connection, text


class CommunityError(Exception):
    def __init__(self, code: str, status: int = 400):
        super().__init__(code)
        self.code, self.status = code, status


def _slug(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40] or "community"
    return f"{base}-{secrets.token_hex(2)}"


def _code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I: easy to read aloud
    return "".join(secrets.choice(alphabet) for _ in range(4)) + "-" + "".join(secrets.choice(alphabet) for _ in range(4))


def _member(conn: Connection, user_id: str, community_id: str):
    row = conn.execute(
        text("select 1 from memberships where community_id = :c and user_id = :u and status = 'active'"), {"c": community_id, "u": user_id}
    ).first()
    if row is None:
        raise CommunityError("not_a_member", 403)


def _my_role(conn: Connection, user_id: str, community_id: str) -> tuple[str, bool]:
    """The person's current role name and whether it may manage the community. A plain member has no role."""
    r = conn.execute(
        text(
            "select d.name, d.can_manage from role_terms t join role_definitions d on d.id = t.role_definition_id "
            "where t.community_id = :c and t.user_id = :u and t.status = 'active' and t.ends_on >= current_date order by d.can_manage desc limit 1"
        ),
        {"c": community_id, "u": user_id},
    ).first()
    return (r.name, bool(r.can_manage)) if r else ("Member", False)


def my_communities(conn: Connection, user_id: str) -> list[dict]:
    rows = conn.execute(
        text(
            "select c.id, c.name, c.kind, c.icon, c.area_name, c.description, c.logo_url, c.cover_url, c.is_demo, "
            "(select count(*) from memberships m2 where m2.community_id = c.id and m2.status = 'active') as member_count "
            "from communities c join memberships m on m.community_id = c.id "
            "where m.user_id = :u and m.status = 'active' and c.status = 'active' order by m.joined_at"
        ),
        {"u": user_id},
    ).all()
    out = []
    for r in rows:
        role, _ = _my_role(conn, user_id, str(r.id))
        out.append({"id": str(r.id), "name": r.name, "kind": r.kind, "icon": r.icon, "area_name": r.area_name, "description": r.description, "logo_url": r.logo_url,
                    "cover_url": r.cover_url, "member_count": r.member_count, "my_role": role, "is_demo": r.is_demo})
    return out


def detail(conn: Connection, user_id: str, community_id: str) -> dict:
    _member(conn, user_id, community_id)
    c = conn.execute(text("select * from communities where id = :c and status = 'active'"), {"c": community_id}).first()
    if c is None:
        raise CommunityError("not_found", 404)
    role, can_manage = _my_role(conn, user_id, community_id)
    announcements = conn.execute(
        text("select a.id, a.title, a.body, a.pinned, a.created_at, u.display_name as author from announcements a left join users u on u.id = a.author_id "
             "where a.community_id = :c order by a.pinned desc, a.created_at desc limit 5"), {"c": community_id}).all()
    activities = conn.execute(
        text("select x.id, x.title, x.description, x.category, x.starts_at, x.ends_at, x.location, x.capacity, x.image_url, "
             "(select count(*) from activity_participants p where p.activity_id = x.id and p.status = 'going') as going_count, "
             "exists (select 1 from activity_participants p where p.activity_id = x.id and p.user_id = :u and p.status = 'going') as i_going "
             "from activities x where x.community_id = :c and x.status = 'scheduled' and x.starts_at >= now() - interval '3 hours' order by x.starts_at limit 8"),
        {"c": community_id, "u": user_id}).all()
    members = conn.execute(
        text("select * from (select u.id, u.display_name, u.area_name, (select d.name from role_terms t join role_definitions d on d.id = t.role_definition_id "
             "where t.community_id = :c and t.user_id = u.id and t.status = 'active' and t.ends_on >= current_date order by d.can_manage desc limit 1) as role "
             "from memberships m join users u on u.id = m.user_id where m.community_id = :c and m.status = 'active') x order by (role is null), role, display_name limit 30"),
        {"c": community_id}).all()
    totals = conn.execute(
        text("select count(*) as n, coalesce(sum(hours), 0) as hours, count(distinct user_id) as people from contributions where community_id = :c"), {"c": community_id}).one()
    mine = conn.execute(
        text("select count(*) as n, coalesce(sum(hours), 0) as hours from contributions where community_id = :c and user_id = :u"), {"c": community_id, "u": user_id}).one()
    opportunities = conn.execute(
        text("select id, kind, title, description, contact, created_at from opportunities where community_id = :c and status = 'open' order by created_at desc limit 5"),
        {"c": community_id}).all()
    member_count = conn.execute(text("select count(*) from memberships where community_id = :c and status = 'active'"), {"c": community_id}).scalar_one()
    iso = lambda d: d.isoformat() if d else None  # noqa: E731
    return {
        "community": {"id": str(c.id), "name": c.name, "kind": c.kind, "description": c.description, "area_name": c.area_name, "privacy": c.privacy,
                      "logo_url": c.logo_url, "cover_url": c.cover_url, "member_count": member_count, "is_demo": c.is_demo,
                      "invite_code": c.invite_code if can_manage else None},
        "my_role": role,
        "can_manage": can_manage,
        "announcements": [{"id": str(a.id), "title": a.title, "body": a.body, "pinned": a.pinned, "author": a.author, "created_at": iso(a.created_at)} for a in announcements],
        "activities": [{"id": str(a.id), "title": a.title, "description": a.description, "category": a.category, "starts_at": iso(a.starts_at), "ends_at": iso(a.ends_at),
                        "location": a.location, "capacity": a.capacity, "image_url": a.image_url, "going_count": a.going_count, "i_going": a.i_going} for a in activities],
        "members": [{"id": str(m.id), "name": m.display_name, "area": m.area_name, "role": m.role} for m in members],
        "contributions": {"count": totals.n, "hours": float(totals.hours), "people": totals.people, "my_count": mine.n, "my_hours": float(mine.hours)},
        "opportunities": [{"id": str(o.id), "kind": o.kind, "title": o.title, "description": o.description, "contact": o.contact, "created_at": iso(o.created_at)} for o in opportunities],
    }


def create(conn: Connection, user_id: str, data: dict) -> dict:
    row = conn.execute(
        text("insert into communities (name, slug, kind, description, area_name, privacy, invite_code, created_by) "
             "values (:name, :slug, :kind, :description, :area, :privacy, :code, :u) returning id"),
        {"name": data["name"].strip(), "slug": _slug(data["name"]), "kind": data.get("kind") or "apartment", "description": data.get("description"),
         "area": data.get("area_name"), "privacy": data.get("privacy") or "invite", "code": _code(), "u": user_id},
    ).one()
    cid = str(row.id)
    lead = None
    for key, name, manage in (("lead", "Community Lead", True), ("secretary", "Secretary", True), ("treasurer", "Treasurer", False)):
        d = conn.execute(
            text("insert into role_definitions (community_id, key, name, can_manage) values (:c, :k, :n, :m) returning id"), {"c": cid, "k": key, "n": name, "m": manage}).one()
        lead = d.id if key == "lead" else lead
    conn.execute(text("insert into memberships (community_id, user_id) values (:c, :u)"), {"c": cid, "u": user_id})
    conn.execute(
        text("insert into role_terms (community_id, role_definition_id, user_id, starts_on, ends_on) values (:c, :d, :u, current_date, current_date + interval '12 months')"),
        {"c": cid, "d": lead, "u": user_id})
    return {"id": cid}


def join(conn: Connection, user_id: str, code: str) -> dict:
    c = conn.execute(text("select id from communities where invite_code = :c and status = 'active'"), {"c": code.strip().upper()}).first()
    if c is None:
        raise CommunityError("code_invalid", 404)
    conn.execute(
        text("insert into memberships (community_id, user_id) values (:c, :u) on conflict (community_id, user_id) do update set status = 'active', left_at = null, joined_at = now()"),
        {"c": c.id, "u": user_id})
    return {"id": str(c.id)}


def rsvp(conn: Connection, user_id: str, activity_id: str, going: bool) -> dict:
    a = conn.execute(text("select community_id, capacity from activities where id = :a and status = 'scheduled'"), {"a": activity_id}).first()
    if a is None:
        raise CommunityError("not_found", 404)
    _member(conn, user_id, str(a.community_id))
    if going and a.capacity:
        taken = conn.execute(text("select count(*) from activity_participants where activity_id = :a and status = 'going' and user_id <> :u"), {"a": activity_id, "u": user_id}).scalar_one()
        if taken >= a.capacity:
            raise CommunityError("full", 409)
    conn.execute(
        text("insert into activity_participants (activity_id, user_id, status) values (:a, :u, :s) on conflict (activity_id, user_id) do update set status = :s"),
        {"a": activity_id, "u": user_id, "s": "going" if going else "cancelled"})
    n = conn.execute(text("select count(*) from activity_participants where activity_id = :a and status = 'going'"), {"a": activity_id}).scalar_one()
    return {"going": going, "going_count": n}


def upcoming(conn: Connection, user_id: str, limit: int = 3) -> list[dict]:
    """The next few activities across ALL the communities the person belongs to (for the Connect screen's "Coming up")."""
    rows = conn.execute(
        text("select x.id, x.title, x.starts_at, x.location, x.image_url, c.id as community_id, c.name as community_name, c.icon as community_icon, "
             "exists (select 1 from activity_participants p where p.activity_id = x.id and p.user_id = :u and p.status = 'going') as i_going "
             "from activities x join communities c on c.id = x.community_id join memberships m on m.community_id = c.id "
             "where m.user_id = :u and m.status = 'active' and c.status = 'active' and x.status = 'scheduled' and x.starts_at >= now() - interval '3 hours' "
             "order by x.starts_at limit :n"), {"u": user_id, "n": max(1, min(limit, 10))}).all()
    return [{"id": str(r.id), "title": r.title, "starts_at": r.starts_at.isoformat(), "location": r.location, "image_url": r.image_url,
             "community_id": str(r.community_id), "community_name": r.community_name, "community_icon": r.community_icon, "i_going": r.i_going} for r in rows]
