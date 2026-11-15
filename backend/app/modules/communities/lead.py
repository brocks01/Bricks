"""Leader tools and the member side of them: the signature product (chosen by a vote), a weekly rota, and check-in at a gathering.
Only someone whose role may manage the community (its Community Lead) can start or close a vote, make the rota, or check someone else in. Members vote, put their
own name on the rota and check themselves in."""
import json
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import Connection, text

from .service import CommunityError, _member, _my_role

CHECKIN_BEFORE = timedelta(hours=1)  # "I'm here" opens an hour before the start...
CHECKIN_AFTER = timedelta(hours=12)  # ...and stays open for the rest of the day


def _lead(conn: Connection, me: str, cid: str) -> None:
    _member(conn, me, cid)
    if not _my_role(conn, me, cid)[1]:
        raise CommunityError("not_a_lead", 403)


# ---------- the vote ----------
def start_vote(conn: Connection, me: str, cid: str, title: str, options: list[str]) -> dict:
    _lead(conn, me, cid)
    names = []
    for o in options:
        o = (o or "").strip()[:80]
        if o and o.lower() not in [n.lower() for n in names]:
            names.append(o)
    if len(names) < 2 or len(names) > 6:
        raise CommunityError("two_to_six_options", 422)
    if conn.execute(text("select 1 from community_votes where community_id = :c and status = 'open'"), {"c": cid}).first():
        raise CommunityError("vote_already_open", 409)
    v = conn.execute(text("insert into community_votes (community_id, title, created_by) values (:c, :t, :u) returning id"), {"c": cid, "t": title.strip(), "u": me}).scalar_one()
    for i, n in enumerate(names):
        conn.execute(text("insert into community_vote_options (vote_id, name, ord) values (:v, :n, :o)"), {"v": v, "n": n, "o": i})
    return vote(conn, me, cid)


def vote(conn: Connection, me: str, cid: str) -> dict | None:
    """The open vote (or None) with each option's count and the person's own pick. Any member may see it."""
    _member(conn, me, cid)
    v = conn.execute(text("select id, title, created_at from community_votes where community_id = :c and status = 'open'"), {"c": cid}).first()
    if v is None:
        return None
    rows = conn.execute(text(
        "select o.id, o.name, (select count(*) from community_vote_ballots b where b.option_id = o.id) as n, "
        "exists (select 1 from community_vote_ballots b where b.option_id = o.id and b.user_id = :u) as mine from community_vote_options o where o.vote_id = :v order by o.ord"),
        {"v": v.id, "u": me}).all()
    total = sum(r.n for r in rows)
    members = conn.execute(text("select count(*) from memberships where community_id = :c and status = 'active'"), {"c": cid}).scalar_one()
    return {"id": str(v.id), "title": v.title, "voters": total, "members": members,
            "options": [{"id": str(r.id), "name": r.name, "count": r.n, "mine": r.mine} for r in rows], "my_pick": next((str(r.id) for r in rows if r.mine), None)}


def cast(conn: Connection, me: str, vote_id: str, option_id: str) -> dict:
    v = conn.execute(text("select community_id from community_votes where id = :v and status = 'open'"), {"v": vote_id}).first()
    if v is None:
        raise CommunityError("not_found", 404)
    _member(conn, me, str(v.community_id))
    if not conn.execute(text("select 1 from community_vote_options where id = :o and vote_id = :v"), {"o": option_id, "v": vote_id}).first():
        raise CommunityError("not_an_option", 422)
    conn.execute(text("insert into community_vote_ballots (vote_id, user_id, option_id) values (:v, :u, :o) on conflict (vote_id, user_id) do update set option_id = excluded.option_id"),
                 {"v": vote_id, "u": me, "o": option_id})
    return vote(conn, me, str(v.community_id))


def close_vote(conn: Connection, me: str, vote_id: str) -> dict:
    v = conn.execute(text("select community_id from community_votes where id = :v and status = 'open'"), {"v": vote_id}).first()
    if v is None:
        raise CommunityError("not_found", 404)
    cid = str(v.community_id)
    _lead(conn, me, cid)
    top = conn.execute(text(
        "select o.name, count(b.user_id) as n from community_vote_options o left join community_vote_ballots b on b.option_id = o.id where o.vote_id = :v group by o.id order by n desc, o.ord limit 2"),
        {"v": vote_id}).all()
    winner = top[0].name if top and top[0].n > 0 and not (len(top) > 1 and top[1].n == top[0].n) else None  # a tie, or no votes, has no winner
    conn.execute(text("update community_votes set status = 'closed', closed_at = now(), winner = :w where id = :v"), {"v": vote_id, "w": winner})
    if winner:
        conn.execute(text("update communities set signature_product = :p, signature_since = current_date where id = :c"), {"p": winner, "c": cid})
    return {"closed": True, "winner": winner}


# ---------- the rota ----------
def make_rota(conn: Connection, me: str, cid: str, weekday: int, label: str, capacity: int, weeks: int) -> dict:
    """One slot for each of the next `weeks` dates that fall on `weekday` (0 = Monday). Dates that already have the slot are left alone."""
    _lead(conn, me, cid)
    if not 0 <= weekday <= 6 or not 1 <= weeks <= 8:
        raise CommunityError("validation", 422)
    today = date.today()
    d = today + timedelta(days=(weekday - today.weekday()) % 7)
    made = 0
    for i in range(weeks):
        made += conn.execute(text("insert into community_rota_slots (community_id, on_date, label, capacity) values (:c, :d, :l, :n) on conflict do nothing"),
                             {"c": cid, "d": d + timedelta(days=7 * i), "l": (label or "").strip()[:80], "n": capacity}).rowcount
    return {"made": made}


def rota(conn: Connection, me: str, cid: str) -> list[dict]:
    """The coming slots, with who has put their name down and whether there is room. Members only."""
    _member(conn, me, cid)
    slots = conn.execute(text("select id, on_date, label, capacity from community_rota_slots where community_id = :c and on_date >= current_date order by on_date, label limit 12"), {"c": cid}).all()
    out = []
    for s in slots:
        names = conn.execute(text("select u.id, coalesce(u.display_name, '') as name from community_rota_signups g join users u on u.id = g.user_id where g.slot_id = :s order by u.display_name"), {"s": s.id}).all()
        out.append({"id": str(s.id), "on": s.on_date.isoformat(), "label": s.label, "capacity": s.capacity, "names": [n.name for n in names],
                    "mine": any(str(n.id) == me for n in names), "gap": max(0, s.capacity - len(names))})
    return out


def rota_signup(conn: Connection, me: str, slot_id: str, on: bool) -> dict:
    s = conn.execute(text("select community_id, capacity from community_rota_slots where id = :s"), {"s": slot_id}).first()
    if s is None:
        raise CommunityError("not_found", 404)
    _member(conn, me, str(s.community_id))
    if on:
        taken = conn.execute(text("select count(*) from community_rota_signups where slot_id = :s and user_id <> :u"), {"s": slot_id, "u": me}).scalar_one()
        if taken >= s.capacity:
            raise CommunityError("slot_full", 409)
        conn.execute(text("insert into community_rota_signups (slot_id, user_id) values (:s, :u) on conflict do nothing"), {"s": slot_id, "u": me})
    else:
        conn.execute(text("delete from community_rota_signups where slot_id = :s and user_id = :u"), {"s": slot_id, "u": me})
    return {"on": on}


# ---------- check-in at a gathering ----------
def check_in(conn: Connection, me: str, activity_id: str, user_id: str | None = None) -> dict:
    """"I'm here" (inside the window around the start) or, for a Community Lead, "check in for them" for anyone who is going. Marks the person as attended and closes their leaf."""
    a = conn.execute(text("select community_id, starts_at, ends_at, status from activities where id = :a"), {"a": activity_id}).first()
    if a is None or a.status != "scheduled":
        raise CommunityError("not_found", 404)
    cid = str(a.community_id)
    target = user_id or me
    if target == me:
        _member(conn, me, cid)
        now = datetime.now(timezone.utc)
        end = a.ends_at or a.starts_at + timedelta(hours=2)
        if not (a.starts_at - CHECKIN_BEFORE <= now <= max(end, a.starts_at + CHECKIN_AFTER)):
            raise CommunityError("not_open_yet" if now < a.starts_at else "too_late", 409)
    else:
        _lead(conn, me, cid)
        _member(conn, target, cid)
    conn.execute(text(
        "insert into activity_participants (activity_id, user_id, status, checked_in_at, checked_in_by) values (:a, :u, 'attended', now(), :by) "
        "on conflict (activity_id, user_id) do update set status = 'attended', checked_in_at = now(), checked_in_by = :by"), {"a": activity_id, "u": target, "by": me})
    from ..nodes import feed
    feed.attended(conn, target, activity_id)
    return {"checked_in": True, "user_id": target}


def lead_view(conn: Connection, me: str, cid: str) -> dict:
    """Everything the Community Lead's page needs: the signature product, the vote, today's gatherings with who is going and who has checked in, the rota."""
    _lead(conn, me, cid)
    c = conn.execute(text("select name, signature_product, signature_since from communities where id = :c"), {"c": cid}).one()
    acts = conn.execute(text("select id, title, starts_at from activities where community_id = :c and status = 'scheduled' and starts_at >= now() - interval '12 hours' and starts_at < now() + interval '36 hours' order by starts_at"), {"c": cid}).all()
    gatherings = []
    for a in acts:
        people = conn.execute(text(
            "select p.user_id, coalesce(u.display_name, u.email) as name, p.status, p.checked_in_at from activity_participants p join users u on u.id = p.user_id "
            "where p.activity_id = :a and p.status in ('going', 'attended') order by u.display_name"), {"a": a.id}).all()
        gatherings.append({"id": str(a.id), "title": a.title, "starts_at": a.starts_at.isoformat(),
                           "people": [{"user_id": str(p.user_id), "name": p.name, "checked_in": p.status == "attended"} for p in people]})
    return {"community": {"id": cid, "name": c.name}, "product": c.signature_product, "since": c.signature_since.isoformat() if c.signature_since else None,
            "vote": vote(conn, me, cid), "gatherings": gatherings, "rota": rota(conn, me, cid)}
