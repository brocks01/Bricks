"""The belonging layer of Communities (team-docs/02-product/communities.md): the days a circle keeps, who is here or away, what people
send for a day from wherever they are, and the circle's stories.
- Only a member of a circle reads any of it; only someone who may manage the circle adds or removes a day, or hides a contribution.
- A festival's dates come from the calendar (platform admins enter the real ones): nobody here ever invents a date.
- Presence is the person's own choice: it is off by default and the circle sees it only when they turned sharing on.
Plain functions over one database connection, like communities/service.py."""
from datetime import date, datetime, timezone

from sqlalchemy import Connection, text

from ..communities import lead as comm_lead
from ..communities import rules as comm_rules
from ..communities.service import CommunityError, _my_role, is_member

UTC = timezone.utc
KINDS = ("blessing", "message", "recipe", "story")


def _iso(d) -> str | None:
    return d.isoformat() if d else None


def _days_to_go(starts_on: date, today: date) -> int:
    return max(0, (starts_on - today).days)


# ---------- our days: the days a circle keeps ----------
def _day(r, today: date) -> dict:
    return {"id": str(r.id), "name": r.name, "tradition": r.tradition, "starts_on": r.starts_on.isoformat(),
            "ends_on": r.ends_on.isoformat(), "days_to_go": _days_to_go(r.starts_on, today),
            "festival_id": str(r.festival_id) if r.festival_id else None}


def coming_days(conn: Connection, user_id: str, community_id: str) -> dict:
    """One circle's days that are still to come, soonest first, each with how many days to go. Members only."""
    is_member(conn, user_id, community_id)
    today = date.today()
    rows = conn.execute(
        text("select d.id, d.name, d.tradition, d.starts_on, d.ends_on, d.festival_id from circle_days d "
             "where d.community_id = :c and d.ends_on >= :t order by d.starts_on limit 30"),
        {"c": community_id, "t": today}).all()
    return {"days": [_day(r, today) for r in rows]}


def my_days(conn: Connection, user_id: str, community_id: str | None = None) -> list[dict]:
    """The days every circle this person belongs to keeps, soonest first, each saying which circle it belongs to."""
    today = date.today()
    where = "c.status = 'active' and d.ends_on >= :t"
    args: dict = {"u": user_id, "t": today}
    if community_id:
        where += " and c.id = :c"
        args["c"] = community_id
    rows = conn.execute(
        text("select d.id, d.name, d.tradition, d.starts_on, d.ends_on, d.festival_id, c.id as community_id, c.name as community_name "
             "from circle_days d join communities c on c.id = d.community_id "
             "join memberships m on m.community_id = c.id and m.user_id = :u and m.status = 'active' "
             f"where {where} order by d.starts_on limit 30"), args).all()
    return [{**_day(r, today), "community_id": str(r.community_id), "community_name": r.community_name} for r in rows]


def _date(value) -> date:
    try:
        return date.fromisoformat(str(value).strip()[:10])
    except (TypeError, ValueError):
        raise CommunityError("bad_date", 422) from None


def add_day(conn: Connection, user_id: str, community_id: str, data: dict) -> dict:
    """A leader gives the circle a day to keep: one from the festival calendar (its real dates travel with it) or a day of its own."""
    comm_lead._lead(conn, user_id, community_id)
    festival = None
    if data.get("festival_id"):
        festival = conn.execute(text("select id, name, tradition, starts_on, ends_on from festivals where id = :f"),
                                {"f": str(data["festival_id"])[:36]}).first()
        if festival is None:
            raise CommunityError("no_such_festival", 404)
        kept = conn.execute(text("select id from circle_days where community_id = :c and festival_id = :f"),
                            {"c": community_id, "f": festival.id}).first()
        if kept:  # a circle keeps a festival once
            return {"id": str(kept.id), "kept": False}
        name = (data.get("name") or "").strip() or festival.name
        tradition = (data.get("tradition") or "").strip() or festival.tradition
        starts_on, ends_on = festival.starts_on, festival.ends_on
    else:
        name = (data.get("name") or "").strip()
        if not 2 <= len(name) <= 80:
            raise CommunityError("name_needed", 422)
        starts_on = _date(data.get("starts_on"))
        ends_on = _date(data.get("ends_on")) if data.get("ends_on") else starts_on
        if ends_on < starts_on:
            raise CommunityError("bad_date", 422)
        tradition = (data.get("tradition") or "").strip()[:300] or None
    r = conn.execute(
        text("insert into circle_days (community_id, festival_id, name, tradition, starts_on, ends_on, created_by) "
             "values (:c, :f, :n, :t, :s, :e, :u) returning id"),
        {"c": community_id, "f": festival.id if festival else None, "n": name, "t": tradition, "s": starts_on, "e": ends_on, "u": user_id}).one()
    return {"id": str(r.id), "kept": True}


def remove_day(conn: Connection, user_id: str, community_id: str, day_id: str) -> dict:
    """Only someone who may manage the circle takes a day off it, and only from that circle."""
    comm_lead._lead(conn, user_id, community_id)
    n = conn.execute(text("delete from circle_days where id = :d and community_id = :c"), {"d": day_id, "c": community_id}).rowcount
    if not n:
        raise CommunityError("not_found", 404)
    return {"removed": True}


# ---------- the festival calendar (platform admins enter the real dates) ----------
def festivals(conn: Connection) -> dict:
    rows = conn.execute(
        text("select id, name, tradition, regions, starts_on, ends_on from festivals where ends_on >= :t order by starts_on limit 60"),
        {"t": date.today()}).all()
    return {"festivals": [{"id": str(r.id), "name": r.name, "tradition": r.tradition, "regions": list(r.regions or []),
                           "starts_on": r.starts_on.isoformat(), "ends_on": r.ends_on.isoformat()} for r in rows]}


def add_festival(conn: Connection, user_id: str, data: dict) -> dict:
    """Platform admins only. The dates are the real ones for that year: this is exactly where nobody may invent a date."""
    if not comm_rules.is_admin(conn, user_id):
        raise CommunityError("not_admin", 403)
    name = (data.get("name") or "").strip()
    if not 2 <= len(name) <= 80:
        raise CommunityError("name_needed", 422)
    starts_on = _date(data.get("starts_on"))
    ends_on = _date(data.get("ends_on")) if data.get("ends_on") else starts_on
    if ends_on < starts_on:
        raise CommunityError("bad_date", 422)
    regions = [str(x).strip()[:60] for x in (data.get("regions") or []) if str(x).strip()][:20]
    r = conn.execute(
        text("insert into festivals (name, tradition, regions, starts_on, ends_on, created_by) values (:n, :t, :r, :s, :e, :u) returning id"),
        {"n": name, "t": (data.get("tradition") or "").strip()[:300] or None, "r": regions, "s": starts_on, "e": ends_on, "u": user_id}).one()
    return {"id": str(r.id), "name": name, "starts_on": starts_on.isoformat(), "ends_on": ends_on.isoformat()}


# ---------- presence: here or away, and only shown when the person chose to share it ----------
def set_presence(conn: Connection, user_id: str, community_id: str, status: str, place: str | None = None, share: bool | None = None) -> dict:
    is_member(conn, user_id, community_id)
    if status not in ("here", "away"):
        raise CommunityError("bad_status", 422)
    where = (place or "").strip()[:120] or None
    if status == "here":  # back among them: there is nothing to show
        where, share = None, False
    shown = bool(share) if share is not None else None
    conn.execute(
        text("insert into circle_presence (community_id, user_id, status, place, share, since) values (:c, :u, :s, :p, coalesce(:sh, false), now()) "
             "on conflict (community_id, user_id) do update set status = excluded.status, place = excluded.place, "
             "share = coalesce(:sh, circle_presence.share), "
             "since = case when circle_presence.status is distinct from excluded.status then now() else circle_presence.since end"),
        {"c": community_id, "u": user_id, "s": status, "p": where, "sh": shown})
    r = conn.execute(text("select status, place, share, since from circle_presence where community_id = :c and user_id = :u"),
                     {"c": community_id, "u": user_id}).one()
    return {"status": r.status, "place": r.place, "share": bool(r.share), "since": _iso(r.since)}


def presence_of(conn: Connection, user_id: str, community_id: str) -> dict:
    """The person's own presence in one circle (never anyone else's)."""
    is_member(conn, user_id, community_id)
    r = conn.execute(text("select status, place, share, since from circle_presence where community_id = :c and user_id = :u"),
                     {"c": community_id, "u": user_id}).first()
    if r is None:
        return {"status": "here", "place": None, "share": False, "since": None}
    return {"status": r.status, "place": r.place, "share": bool(r.share), "since": _iso(r.since)}


# ---------- taking part from afar: something sent for one of the circle's days ----------
def _tell_the_circle(conn: Connection, user_id: str, community_id: str, kind: str, body: str, day_name: str | None) -> None:
    """The circle hears that something came in, through channels/core.notify. Once per person per day: a second message the same
    day does not send another one, so nobody is buzzed for every post."""
    from ..channels import core

    name = conn.execute(text("select coalesce(nullif(split_part(display_name, ' ', 1), ''), 'Someone') from users where id = :u"),
                        {"u": user_id}).scalar() or "Someone"
    community = conn.execute(text("select name from communities where id = :c"), {"c": community_id}).scalar() or ""
    for who in conn.execute(text("select user_id from memberships where community_id = :c and status = 'active' and user_id <> :u"),
                            {"c": community_id, "u": user_id}):
        already = conn.execute(
            text("select 1 from notifications where user_id = :u and kind = 'circle' and created_at > now() - interval '1 day' limit 1"),
            {"u": str(who.user_id)}).first()
        if already:
            continue
        where = f" for {day_name}" if day_name else ""
        core.notify(str(who.user_id), f"{name} sent a {kind}{where} in {community}: {body[:300]}", kind="circle")


def add_contribution(conn: Connection, user_id: str, community_id: str, day_id: str | None, kind: str, body: str, audio_url: str | None = None) -> dict:
    """A member sends something for one of the circle's days from wherever they are. Members only; the day must belong to this circle."""
    is_member(conn, user_id, community_id)
    if kind not in KINDS:
        raise CommunityError("bad_kind", 422)
    body = (body or "").strip()
    if not 1 <= len(body) <= 1000:
        raise CommunityError("body_needed", 422)
    day_name = None
    if day_id:
        d = conn.execute(text("select name from circle_days where id = :d and community_id = :c"), {"d": day_id, "c": community_id}).first()
        if d is None:
            raise CommunityError("no_such_day", 404)
        day_name = d.name
    r = conn.execute(
        text("insert into circle_contributions (community_id, day_id, user_id, kind, body, audio_url) values (:c, :d, :u, :k, :b, :a) returning id"),
        {"c": community_id, "d": day_id, "u": user_id, "k": kind, "b": body, "a": (audio_url or "").strip()[:500] or None}).one()
    _tell_the_circle(conn, user_id, community_id, kind, body, day_name)
    return {"id": str(r.id), "kind": kind, "day_id": day_id}


def list_contributions(conn: Connection, user_id: str, community_id: str, day_id: str | None = None) -> dict:
    """What the circle sent for its days, newest first. Hidden ones are for the leaders only."""
    is_member(conn, user_id, community_id)
    can_manage = _my_role(conn, user_id, community_id)[1]
    where, args = "k.community_id = :c", {"c": community_id}
    if day_id:
        where += " and k.day_id = :d"
        args["d"] = day_id
    if not can_manage:
        where += " and k.hidden = false"
    rows = conn.execute(
        text(f"select k.id, k.kind, k.body, k.audio_url, k.hidden, k.created_at, k.day_id, u.display_name "
             f"from circle_contributions k join users u on u.id = k.user_id where {where} order by k.created_at desc limit 100"), args).all()
    return {"contributions": [{"id": str(r.id), "kind": r.kind, "body": r.body, "audio_url": r.audio_url, "hidden": r.hidden,
                              "by": r.display_name, "day_id": str(r.day_id) if r.day_id else None, "created_at": _iso(r.created_at)} for r in rows],
            "can_hide": can_manage}


def hide_contribution(conn: Connection, user_id: str, contribution_id: str) -> dict:
    """A leader takes one contribution out of the circle's view (never deletes the person's words)."""
    row = conn.execute(text("select community_id from circle_contributions where id = :i"), {"i": contribution_id}).first()
    if row is None:
        raise CommunityError("not_found", 404)
    comm_lead._lead(conn, user_id, str(row.community_id))
    conn.execute(text("update circle_contributions set hidden = true where id = :i"), {"i": contribution_id})
    return {"hidden": True}


# ---------- the circle's stories: the one small touch on Wisdom's tables ----------
def share_to_circle(conn: Connection, user_id: str, capsule_id: str, community_id: str | None) -> dict:
    """Share ONE of my own stories into a circle I am in; the same call with no community takes it back. Nobody else's story, ever."""
    row = conn.execute(text("select id, author_id, status from wisdom_capsules where id = :i"), {"i": capsule_id}).first()
    if row is None or row.status == "removed":
        raise CommunityError("not_found", 404)
    if str(row.author_id) != user_id:
        raise CommunityError("not_yours", 403)
    if community_id:
        is_member(conn, user_id, community_id)
    conn.execute(text("update wisdom_capsules set community_id = :c where id = :i"), {"c": community_id, "i": capsule_id})
    return {"shared": bool(community_id), "community_id": community_id}


def circle_stories(conn: Connection, user_id: str, community_id: str) -> dict:
    """The stories members of this circle shared into it, newest first. Members only."""
    is_member(conn, user_id, community_id)
    rows = conn.execute(
        text("select w.id, w.title, w.body, w.kind, w.created_at, u.display_name from wisdom_capsules w join users u on u.id = w.author_id "
             "where w.community_id = :c and w.status <> 'removed' order by w.created_at desc limit 50"), {"c": community_id}).all()
    return {"stories": [{"id": str(r.id), "title": r.title, "body": r.body, "kind": r.kind, "by": r.display_name,
                         "created_at": _iso(r.created_at)} for r in rows]}
