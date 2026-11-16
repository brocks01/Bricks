"""The rules that keep communities few and good (15 Nov 2026):
- a person is in THREE communities at most; they can explore any number but must leave one before joining a fourth;
- a community is not created by anyone: a person with enough experience sends a REQUEST and the platform approves it;
- a member may let their family see that they are in a community (opt-in, off by default);
- the platform's reviewers (users.is_platform_admin) decide requests.
Plain functions over one database connection, like service.py."""
import os

from sqlalchemy import Connection, text

from .service import CommunityError

MAX_COMMUNITIES = 3
# Experience needed to ASK for a new community (a starting rule, the owner may change it): in a community for 14 days and been to 3 events,
# or already leading a community. Platform admins are always allowed.
MIN_DAYS = 14
MIN_EVENTS = 3


def creation_open() -> bool:
    """Tests and local demos can open creation to everyone with COMMUNITY_CREATION=open. The default is the request flow."""
    return os.environ.get("COMMUNITY_CREATION", "request").lower() == "open"


def is_admin(conn: Connection, user_id: str) -> bool:
    return bool(conn.execute(text("select is_platform_admin from users where id = :u"), {"u": user_id}).scalar())


# ---------- the cap ----------
def active_count(conn: Connection, user_id: str) -> int:
    return conn.execute(text("select count(*) from memberships m join communities c on c.id = m.community_id where m.user_id = :u and m.status = 'active' and c.status = 'active'"), {"u": user_id}).scalar_one()


def limits(conn: Connection, user_id: str) -> dict:
    used = active_count(conn, user_id)
    return {"max": MAX_COMMUNITIES, "used": used, "left": max(0, MAX_COMMUNITIES - used)}


def check_slot(conn: Connection, user_id: str, community_id: str) -> None:
    """Raises community_limit (409) when joining would be the person's fourth community. Already being a member costs no slot."""
    already = conn.execute(text("select 1 from memberships where community_id = :c and user_id = :u and status = 'active'"), {"c": community_id, "u": user_id}).first()
    if already is None and active_count(conn, user_id) >= MAX_COMMUNITIES:
        raise CommunityError("community_limit", 409)


def join_open(conn: Connection, user_id: str, community_id: str) -> dict:
    c = conn.execute(text("select id, privacy from communities where id = :c and status = 'active'"), {"c": community_id}).first()
    if c is None:
        raise CommunityError("not_found", 404)
    if c.privacy != "open":
        raise CommunityError("invite_only", 403)
    from .service import check_audience

    check_audience(conn, user_id, community_id)
    check_slot(conn, user_id, community_id)
    conn.execute(
        text("insert into memberships (community_id, user_id) values (:c, :u) on conflict (community_id, user_id) do update set status = 'active', left_at = null, joined_at = now()"),
        {"c": community_id, "u": user_id})
    return {"id": community_id}


def leave(conn: Connection, user_id: str, community_id: str) -> dict:
    m = conn.execute(text("select 1 from memberships where community_id = :c and user_id = :u and status = 'active'"), {"c": community_id, "u": user_id}).first()
    if m is None:
        raise CommunityError("not_a_member", 404)
    managers = conn.execute(
        text("select t.user_id from role_terms t join role_definitions d on d.id = t.role_definition_id join memberships mm on mm.community_id = t.community_id and mm.user_id = t.user_id and mm.status = 'active' "
             "where t.community_id = :c and t.status = 'active' and t.ends_on >= current_date and d.can_manage"), {"c": community_id}).all()
    others = conn.execute(text("select count(*) from memberships where community_id = :c and status = 'active' and user_id <> :u"), {"c": community_id, "u": user_id}).scalar_one()
    if others and {str(r.user_id) for r in managers} == {user_id}:
        raise CommunityError("last_lead", 409)  # hand over the lead first
    conn.execute(text("update memberships set status = 'left', left_at = now(), share_with_family = false where community_id = :c and user_id = :u"), {"c": community_id, "u": user_id})
    return {"left": True}


# ---------- family and friends ----------
def _family_ids(conn: Connection, user_id: str) -> list[str]:
    return [str(r[0]) for r in conn.execute(text("select family_id from family_members where user_id = :u and status = 'active'"), {"u": user_id})]


def family_here(conn: Connection, user_id: str, community_ids: list[str]) -> dict[str, list[dict]]:
    """For each community: the family members who are in it AND chose to let their family see it. Never anyone else."""
    out: dict[str, list[dict]] = {c: [] for c in community_ids}
    fams = _family_ids(conn, user_id)
    if not fams or not community_ids:
        return out
    rows = conn.execute(
        text("select distinct m.community_id, u.id, u.display_name from memberships m join users u on u.id = m.user_id "
             "join family_members fm on fm.user_id = m.user_id and fm.status = 'active' and fm.family_id = any(cast(:f as uuid[])) "
             "where m.community_id = any(cast(:c as uuid[])) and m.status = 'active' and m.share_with_family and m.user_id <> :u"),
        {"f": fams, "c": community_ids, "u": user_id}).all()
    for r in rows:
        out[str(r.community_id)].append({"id": str(r.id), "name": r.display_name or ""})
    return out


def set_share(conn: Connection, user_id: str, community_id: str, share: bool) -> dict:
    n = conn.execute(text("update memberships set share_with_family = :s where community_id = :c and user_id = :u and status = 'active'"), {"s": share, "c": community_id, "u": user_id}).rowcount
    if not n:
        raise CommunityError("not_a_member", 404)
    return {"share": share}


def my_share(conn: Connection, user_id: str, community_id: str) -> bool:
    return bool(conn.execute(text("select share_with_family from memberships where community_id = :c and user_id = :u and status = 'active'"), {"c": community_id, "u": user_id}).scalar())


# ---------- explore ----------
def explore(conn: Connection, user_id: str, q: str = "", limit: int = 30) -> dict:
    like = f"%{q.strip().lower()}%"
    has_q = bool(q.strip())
    rows = conn.execute(
        text("select c.id, c.name, c.kind, c.area_name, c.description, c.privacy, c.logo_url, c.cover_url, c.icon, c.audience, c.circle, c.source, "
             "(select count(*) from memberships m where m.community_id = c.id and m.status = 'active') as member_count, "
             "exists (select 1 from memberships m where m.community_id = c.id and m.user_id = :u and m.status = 'active') as joined "
             "from communities c where c.status = 'active' and (not :hasq or lower(c.name) like :q or lower(coalesce(c.area_name, '')) like :q or lower(coalesce(c.description, '')) like :q) "
             "order by member_count desc, c.name limit :n"),
        {"u": user_id, "q": like, "hasq": has_q, "n": max(1, min(limit, 100))}).all()
    fam = family_here(conn, user_id, [str(r.id) for r in rows])
    lim = limits(conn, user_id)
    return {
        "limits": lim,
        "communities": [{"id": str(r.id), "name": r.name, "kind": r.kind, "area_name": r.area_name, "description": r.description, "privacy": r.privacy, "icon": r.icon, "audience": r.audience, "circle": r.circle, "source": r.source,
                         "logo_url": r.logo_url, "cover_url": r.cover_url, "member_count": r.member_count, "joined": r.joined,
                         "family_here": fam[str(r.id)], "can_join": (not r.joined) and r.privacy == "open" and lim["left"] > 0} for r in rows],
    }


# ---------- creating: by request ----------
def experience(conn: Connection, user_id: str) -> dict:
    days = conn.execute(text("select coalesce(extract(day from now() - min(joined_at)), 0)::int from memberships where user_id = :u"), {"u": user_id}).scalar_one()
    events = conn.execute(
        text("select count(*) from activity_participants p join activities a on a.id = p.activity_id where p.user_id = :u and p.status in ('going', 'attended') and a.starts_at < now()"),
        {"u": user_id}).scalar_one()
    leads = conn.execute(
        text("select count(*) from role_terms t join role_definitions d on d.id = t.role_definition_id where t.user_id = :u and t.status = 'active' and t.ends_on >= current_date and d.can_manage"),
        {"u": user_id}).scalar_one()
    admin = is_admin(conn, user_id)
    eligible = admin or leads > 0 or (days >= MIN_DAYS and events >= MIN_EVENTS)
    return {"eligible": eligible, "days_member": days, "events_attended": events, "leads": leads, "need_days": MIN_DAYS, "need_events": MIN_EVENTS, "is_admin": admin}


def request_create(conn: Connection, user_id: str, data: dict) -> dict:
    exp = experience(conn, user_id)
    if not exp["eligible"]:
        raise CommunityError("not_eligible", 403)
    if conn.execute(text("select 1 from community_requests where user_id = :u and status in ('pending', 'approved')"), {"u": user_id}).first():
        raise CommunityError("already_open", 409)
    r = conn.execute(
        text("insert into community_requests (user_id, name, kind, area_name, description, why, product, meeting) values (:u, :n, :k, :a, :d, :w, :p, :m) returning id"),
        {"u": user_id, "n": data["name"].strip(), "k": data.get("kind") or "neighbourhood", "a": data.get("area_name"), "d": data.get("description"), "w": data.get("why"), "p": (data.get("product") or "").strip() or None, "m": (data.get("meeting") or "").strip() or None}).one()
    return {"id": str(r.id), "status": "pending"}


def my_requests(conn: Connection, user_id: str) -> list[dict]:
    rows = conn.execute(text("select id, name, kind, area_name, status, note, community_id, created_at from community_requests where user_id = :u order by created_at desc limit 10"), {"u": user_id}).all()
    return [{"id": str(r.id), "name": r.name, "kind": r.kind, "area_name": r.area_name, "status": r.status, "note": r.note, "community_id": str(r.community_id) if r.community_id else None,
             "created_at": r.created_at.isoformat()} for r in rows]


def review_list(conn: Connection, admin_id: str) -> list[dict]:
    if not is_admin(conn, admin_id):
        raise CommunityError("not_admin", 403)
    rows = conn.execute(
        text("select r.id, r.name, r.kind, r.area_name, r.description, r.why, r.product, r.meeting, r.created_at, u.display_name, u.email from community_requests r join users u on u.id = r.user_id where r.status = 'pending' order by r.created_at")).all()
    return [{"id": str(r.id), "name": r.name, "kind": r.kind, "area_name": r.area_name, "description": r.description, "why": r.why, "product": r.product, "meeting": r.meeting, "by": r.display_name or r.email,
             "created_at": r.created_at.isoformat()} for r in rows]


def decide(conn: Connection, admin_id: str, request_id: str, approve: bool, note: str | None) -> dict:
    if not is_admin(conn, admin_id):
        raise CommunityError("not_admin", 403)
    n = conn.execute(
        text("update community_requests set status = :s, decided_by = :a, decided_at = now(), note = :n where id = :r and status = 'pending'"),
        {"s": "approved" if approve else "declined", "a": admin_id, "n": note, "r": request_id}).rowcount
    if not n:
        raise CommunityError("not_found", 404)
    return {"status": "approved" if approve else "declined"}


def create_from_request(conn: Connection, user_id: str, request_id: str) -> dict:
    """The requester turns an APPROVED request into the community. They become its Community Lead."""
    r = conn.execute(text("select * from community_requests where id = :r and user_id = :u"), {"r": request_id, "u": user_id}).first()
    if r is None:
        raise CommunityError("not_found", 404)
    if r.status != "approved":
        raise CommunityError("not_approved", 403)
    check_slot(conn, user_id, "00000000-0000-0000-0000-000000000000")  # the lead takes one of their three places
    from .service import create as make
    out = make(conn, user_id, {"name": r.name, "kind": r.kind, "description": r.description, "area_name": r.area_name, "privacy": "open"})
    conn.execute(text("update community_requests set status = 'used', community_id = :c where id = :r"), {"c": out["id"], "r": request_id})
    if r.product or r.meeting:
        conn.execute(text("update communities set signature_product = :p, signature_since = case when :p is null then null else current_date end, meeting = :m where id = :c"), {"p": r.product, "m": r.meeting, "c": out["id"]})
    return out


def import_community(conn: Connection, admin_id: str, data: dict) -> dict:
    """Bring in a community that already exists (for example a group at an Active Ageing Centre), under its host. Safe to run again: the same host and reference update the same community.
    Platform admins only for now."""
    if not is_admin(conn, admin_id):
        raise CommunityError("not_admin", 403)
    host, ref = data.get("host_id"), (data.get("external_ref") or "").strip()
    if not host or not ref:
        raise CommunityError("host_and_ref_needed", 422)
    if conn.execute(text("select 1 from hosts where id = :h"), {"h": host}).first() is None:
        raise CommunityError("no_such_host", 404)
    row = conn.execute(text("select id from communities where host_id = :h and external_ref = :r"), {"h": host, "r": ref}).first()
    if row:
        conn.execute(text("update communities set name = :n, description = :d, area_name = :a, circle = :c, audience = :u, updated_at = now() where id = :i"),
                     {"n": data["name"].strip(), "d": data.get("description"), "a": data.get("area_name"), "c": data.get("circle") or "place", "u": data.get("audience") or "all", "i": row.id})
        return {"id": str(row.id), "created": False}
    from .service import create as make

    out = make(conn, admin_id, {**data, "privacy": data.get("privacy") or "open", "source": "imported", "kind": data.get("kind") or "neighbourhood", "host_id": host, "external_ref": ref,
                                "circle": data.get("circle") or "place"})
    return {"id": out["id"], "created": True}
