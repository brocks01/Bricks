"""Community screens: the lists and details inside ONE community (events, activities, people, invite, initiatives, an update with its comments).
Every function first checks that the person is an active member; a plain member can read and join, only someone who may manage can create."""
from sqlalchemy import Connection, text

from .. import recurrence
from .service import CommunityError, _member, _my_role
from . import standing as _standing

_iso = lambda d: d.isoformat() if d else None  # noqa: E731
_ACT = ("x.id, x.community_id, x.title, x.description, x.category, x.starts_at, x.ends_at, x.location, x.capacity, x.image_url, x.status, "
        "(select rc.repeat from recurrences rc where rc.id = x.series_id) as repeat, "
        "(select count(*) from activity_participants p where p.activity_id = x.id and p.status = 'going') as going_count, "
        "exists (select 1 from activity_participants p where p.activity_id = x.id and p.user_id = :u and p.status = 'going') as i_going, "
        "exists (select 1 from activity_participants p where p.activity_id = x.id and p.user_id = :u and p.status = 'attended') as i_attended")
_OVER = "coalesce(x.ends_at, x.starts_at + interval '3 hours') < now()"


def _act(r) -> dict:
    return {"id": str(r.id), "community_id": str(r.community_id), "title": r.title, "description": r.description, "category": r.category, "starts_at": _iso(r.starts_at),
            "ends_at": _iso(r.ends_at), "location": r.location, "capacity": r.capacity, "image_url": r.image_url, "status": r.status,
            "going_count": r.going_count, "i_going": r.i_going, "i_attended": bool(getattr(r, "i_attended", False)), "repeat": getattr(r, "repeat", None)}


def list_activities(conn: Connection, user_id: str, community_id: str, when: str = "upcoming", category: str | None = None) -> list[dict]:
    """when: upcoming (not over yet), mine (I said going), past (already over). Optionally one category only."""
    _member(conn, user_id, community_id)
    where = {"upcoming": f"x.status = 'scheduled' and not ({_OVER})",
             "mine": "x.status = 'scheduled' and exists (select 1 from activity_participants p where p.activity_id = x.id and p.user_id = :u and p.status = 'going')",
             "past": _OVER}.get(when)
    if where is None:
        raise CommunityError("bad_filter", 422)
    order = "x.starts_at desc" if when == "past" else "x.starts_at"
    cat = " and coalesce(nullif(x.category, ''), 'Other') = :cat" if category else ""
    rows = conn.execute(text(f"select {_ACT} from activities x where x.community_id = :c and {where}{cat} order by {order} limit 100"),
                        {"c": community_id, "u": user_id, "cat": category}).all()
    return [_act(r) for r in rows]


def activity_categories(conn: Connection, user_id: str, community_id: str) -> list[dict]:
    """The kinds of activity this community runs (the free-text `category`), each with how many are still to come and how many are over."""
    _member(conn, user_id, community_id)
    rows = conn.execute(
        text("select coalesce(nullif(category, ''), 'Other') as name, "
             f"count(*) filter (where status = 'scheduled' and not ({_OVER.replace('x.', '')})) as ongoing, "
             f"count(*) filter (where {_OVER.replace('x.', '')}) as completed, "
             "(array_agg(image_url order by starts_at) filter (where image_url is not null))[1] as image_url "
             "from activities where community_id = :c group by 1 order by 1"), {"c": community_id}).all()
    return [{"name": r.name, "ongoing": r.ongoing, "completed": r.completed, "image_url": r.image_url} for r in rows]


def activity_detail(conn: Connection, user_id: str, activity_id: str) -> dict:
    a = conn.execute(text(f"select {_ACT} from activities x where x.id = :a"), {"a": activity_id, "u": user_id}).first()
    if a is None:
        raise CommunityError("not_found", 404)
    _member(conn, user_id, str(a.community_id))
    who = conn.execute(
        text("select u.id, u.display_name from activity_participants p join users u on u.id = p.user_id where p.activity_id = :a and p.status = 'going' order by p.created_at limit 8"),
        {"a": activity_id}).all()
    org = conn.execute(text("select u.display_name from activities x join users u on u.id = x.organiser_id where x.id = :a"), {"a": activity_id}).first()
    return {**_act(a), "organiser": org.display_name if org else None, "going": [{"id": str(w.id), "name": w.display_name} for w in who]}


def create_activity(conn: Connection, user_id: str, community_id: str, data: dict) -> dict:
    _member(conn, user_id, community_id)
    if not _my_role(conn, user_id, community_id)[1]:
        raise CommunityError("not_allowed", 403)
    if data.get("repeat") and data["repeat"] != "none":  # a series: daily, weekdays, weekly or monthly; the real events are made ahead of time
        try:
            made = recurrence.create(conn, "activity", user_id, data["repeat"], data["starts_at"], data.get("ends_at"),
                                     {"community_id": community_id, "organiser_id": user_id, "title": data["title"].strip(), "description": data.get("description"), "category": data.get("category"),
                                      "location": data.get("location"), "capacity": data.get("capacity")}, data.get("repeat_days"), data.get("week_of_month"), data.get("until"))
        except recurrence.RepeatError as e:
            raise CommunityError(e.code, e.status) from None
        first = conn.execute(text("select id from activities where series_id = :s order by starts_at limit 1"), {"s": made["series_id"]}).scalar()
        return {"id": str(first) if first else None, "series_id": made["series_id"], "repeat": data["repeat"], "made": made["made"]}
    r = conn.execute(
        text("insert into activities (community_id, organiser_id, title, description, category, starts_at, ends_at, location, capacity) "
             "values (:c, :u, :t, :d, :cat, :s, :e, :l, :cap) returning id"),
        {"c": community_id, "u": user_id, "t": data["title"].strip(), "d": data.get("description"), "cat": data.get("category"), "s": data["starts_at"],
         "e": data.get("ends_at"), "l": data.get("location"), "cap": data.get("capacity")}).one()
    return {"id": str(r.id)}


def list_members(conn: Connection, user_id: str, community_id: str, q: str | None = None) -> list[dict]:
    """The circle's people, leaders first. Who is away is shown only for the ones who chose to share it, and only as away (with where and
    since); it never says anything else about them."""
    _member(conn, user_id, community_id)
    like = f"%{q.strip()}%" if q and q.strip() else None
    rows = conn.execute(
        text("select * from (select u.id, u.display_name, u.area_name, (select d.name from role_terms t join role_definitions d on d.id = t.role_definition_id "
             "where t.community_id = :c and t.user_id = u.id and t.status = 'active' and t.ends_on >= current_date order by d.can_manage desc limit 1) as role, "
             "p.status = 'away' as away, case when p.status = 'away' then p.place else null end as away_place, "
             "case when p.status = 'away' then p.since else null end as away_since "
             "from memberships m join users u on u.id = m.user_id "
             "left join circle_presence p on p.community_id = m.community_id and p.user_id = m.user_id and p.share "
             "where m.community_id = :c and m.status = 'active' and (cast(:q as text) is null or u.display_name ilike :q)) x "
             "order by (role is null), role, display_name limit 200"), {"c": community_id, "q": like}).all()
    return [{"id": str(r.id), "name": r.display_name, "area": r.area_name, "role": r.role or "Member",
             "away": bool(r.away), "away_place": r.away_place, "away_since": _iso(r.away_since)} for r in rows]


def invite_info(conn: Connection, user_id: str, community_id: str) -> dict:
    """Only someone who may manage the community can hand out its code; a plain member gets can_invite false and no code."""
    _member(conn, user_id, community_id)
    c = conn.execute(text("select name, invite_code from communities where id = :c"), {"c": community_id}).one()
    ok = _my_role(conn, user_id, community_id)[1]
    return {"name": c.name, "can_invite": ok, "invite_code": c.invite_code if ok else None}


def list_initiatives(conn: Connection, user_id: str, community_id: str) -> list[dict]:
    _member(conn, user_id, community_id)
    rows = conn.execute(
        text("select i.id, i.title, i.summary, i.icon, i.status, (select count(*) from initiative_members m where m.initiative_id = i.id) as members "
             "from initiatives i where i.community_id = :c order by i.created_at"), {"c": community_id}).all()
    return [{"id": str(r.id), "title": r.title, "summary": r.summary, "icon": r.icon, "status": r.status, "member_count": r.members} for r in rows]


def initiative_detail(conn: Connection, user_id: str, initiative_id: str) -> dict:
    i = conn.execute(
        text("select i.*, (select count(*) from initiative_members m where m.initiative_id = i.id) as members, "
             "exists (select 1 from initiative_members m where m.initiative_id = i.id and m.user_id = :u) as joined from initiatives i where i.id = :i"),
        {"i": initiative_id, "u": user_id}).first()
    if i is None:
        raise CommunityError("not_found", 404)
    _member(conn, user_id, str(i.community_id))
    return {"id": str(i.id), "community_id": str(i.community_id), "title": i.title, "summary": i.summary, "description": i.description, "icon": i.icon,
            "image_url": i.image_url, "current_plan": i.current_plan, "status": i.status, "member_count": i.members, "joined": i.joined}


def join_initiative(conn: Connection, user_id: str, initiative_id: str, joined: bool) -> dict:
    i = conn.execute(text("select community_id from initiatives where id = :i"), {"i": initiative_id}).first()
    if i is None:
        raise CommunityError("not_found", 404)
    _member(conn, user_id, str(i.community_id))
    if joined:
        conn.execute(text("insert into initiative_members (initiative_id, user_id) values (:i, :u) on conflict do nothing"), {"i": initiative_id, "u": user_id})
    else:
        conn.execute(text("delete from initiative_members where initiative_id = :i and user_id = :u"), {"i": initiative_id, "u": user_id})
    n = conn.execute(text("select count(*) from initiative_members where initiative_id = :i"), {"i": initiative_id}).scalar_one()
    return {"joined": joined, "member_count": n}


def create_initiative(conn: Connection, user_id: str, community_id: str, data: dict) -> dict:
    _member(conn, user_id, community_id)
    if not _my_role(conn, user_id, community_id)[1]:
        raise CommunityError("not_allowed", 403)
    r = conn.execute(
        text("insert into initiatives (community_id, created_by, title, summary, description, current_plan) values (:c, :u, :t, :s, :d, :p) returning id"),
        {"c": community_id, "u": user_id, "t": data["title"].strip(), "s": data.get("summary"), "d": data.get("description"), "p": data.get("current_plan")}).one()
    conn.execute(text("insert into initiative_members (initiative_id, user_id) values (:i, :u)"), {"i": r.id, "u": user_id})
    return {"id": str(r.id)}


def update_detail(conn: Connection, user_id: str, announcement_id: str) -> dict:
    a = conn.execute(
        text("select a.id, a.community_id, a.title, a.body, a.created_at, u.display_name as author, "
             "(select count(*) from announcement_likes l where l.announcement_id = a.id) as likes, "
             "exists (select 1 from announcement_likes l where l.announcement_id = a.id and l.user_id = :u) as i_like "
             "from announcements a left join users u on u.id = a.author_id where a.id = :a"), {"a": announcement_id, "u": user_id}).first()
    if a is None:
        raise CommunityError("not_found", 404)
    _member(conn, user_id, str(a.community_id))
    cs = conn.execute(
        text("select c.id, c.body, c.created_at, u.display_name from announcement_comments c join users u on u.id = c.user_id where c.announcement_id = :a order by c.created_at"),
        {"a": announcement_id}).all()
    return {"id": str(a.id), "community_id": str(a.community_id), "title": a.title, "body": a.body, "author": a.author, "created_at": _iso(a.created_at), "likes": a.likes,
            "i_like": a.i_like, "comments": [{"id": str(c.id), "name": c.display_name, "body": c.body, "created_at": _iso(c.created_at)} for c in cs]}


def _announcement_community(conn: Connection, user_id: str, announcement_id: str) -> None:
    a = conn.execute(text("select community_id from announcements where id = :a"), {"a": announcement_id}).first()
    if a is None:
        raise CommunityError("not_found", 404)
    _member(conn, user_id, str(a.community_id))


def comment_on_update(conn: Connection, user_id: str, announcement_id: str, body: str) -> dict:
    _announcement_community(conn, user_id, announcement_id)
    conn.execute(text("insert into announcement_comments (announcement_id, user_id, body) values (:a, :u, :b)"), {"a": announcement_id, "u": user_id, "b": body.strip()})
    return update_detail(conn, user_id, announcement_id)


def like_update(conn: Connection, user_id: str, announcement_id: str, liked: bool) -> dict:
    _announcement_community(conn, user_id, announcement_id)
    if liked:
        conn.execute(text("insert into announcement_likes (announcement_id, user_id) values (:a, :u) on conflict do nothing"), {"a": announcement_id, "u": user_id})
    else:
        conn.execute(text("delete from announcement_likes where announcement_id = :a and user_id = :u"), {"a": announcement_id, "u": user_id})
    n = conn.execute(text("select count(*) from announcement_likes where announcement_id = :a"), {"a": announcement_id}).scalar_one()
    return {"liked": liked, "likes": n}


def end_series(conn: Connection, user_id: str, activity_id: str) -> dict:
    """Stop a repeating event for good: the coming ones are cancelled. A Community Lead can do it."""
    a = conn.execute(text("select community_id, series_id from activities where id = :a"), {"a": activity_id}).first()
    if a is None or a.series_id is None:
        raise CommunityError("not_found", 404)
    _member(conn, user_id, str(a.community_id))
    if not _my_role(conn, user_id, str(a.community_id))[1]:
        raise CommunityError("not_allowed", 403)
    try:
        return {"ended": True, "cancelled": recurrence.end(conn, str(a.series_id))}
    except recurrence.RepeatError as e:
        raise CommunityError(e.code, e.status) from None


def standing(conn: Connection, user_id: str, community_id: str) -> dict:
    return _standing.standing(conn, user_id, community_id)
