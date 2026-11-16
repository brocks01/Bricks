"""Wisdom: turn a lifetime of experience into something the next generation can use, and connect the two.
Plain functions over one database connection, like the other modules. The app, the agent on a call and the chats all use these.

Rules:
- a story is private (a draft) until its author clearly says to share it, and only then does anyone else see it;
- offering to teach adds the 'share' role to the person, asking to learn adds 'learn', so what they see follows what they do;
- an introduction is decided by the OTHER side: nobody can accept their own request, and nobody is forced into a conversation;
- only first names are shown to people who are not yet connected."""
from sqlalchemy import Connection, text

from ..onboarding import service as onboarding

CAPSULE_KINDS = ("cultural", "social", "professional")  # the three domains of experience
OFFER_KINDS = ("mentoring", "workshop", "freelance")
MODES = ("volunteer", "paid", "either")
SOURCES = ("app", "call", "telegram", "whatsapp", "sms")


class WisdomError(Exception):
    def __init__(self, code: str, status: int = 400):
        super().__init__(code)
        self.code, self.status = code, status


def _iso(d):
    return d.isoformat() if d else None


def _text(v, low: int, high: int, field: str) -> str:
    s = str(v or "").strip()
    if not low <= len(s) <= high:
        raise WisdomError(f"bad_{field}", 422)
    return s


def _tags(v) -> list[str]:
    items = v if isinstance(v, list) else str(v or "").replace(";", ",").split(",")
    return list(dict.fromkeys(t.strip().lower()[:30] for t in items if str(t).strip()))[:8]


def _like(q: str | None) -> str:
    return f"%{(q or '').strip().lower()}%"


# ---------- stories (capsules) ----------
def _capsule(r, mine: bool) -> dict:
    return {"id": str(r.id), "title": r.title, "body": r.body, "kind": r.kind, "tags": list(r.tags or []), "status": r.status, "by": r.first_name or "A friend",
            "mine": mine, "source": r.source, "created_at": _iso(r.created_at), "published_at": _iso(r.published_at)}


_CAP = ("select c.*, nullif(split_part(u.display_name, ' ', 1), '') as first_name from wisdom_capsules c join users u on u.id = c.author_id")


def capture(conn: Connection, me: str, data: dict) -> dict:
    """Keep a story, skill or lesson in the person's own words. It starts as a private draft."""
    kind = data.get("kind") or "social"
    source = data.get("source") or "app"
    if kind not in CAPSULE_KINDS or source not in SOURCES:
        raise WisdomError("validation", 422)
    r = conn.execute(text("insert into wisdom_capsules (author_id, title, body, kind, tags, source) values (:u, :t, :b, :k, :g, :s) returning id"),
                     {"u": me, "t": _text(data.get("title"), 2, 120, "title"), "b": _text(data.get("body"), 10, 6000, "body"), "k": kind, "g": _tags(data.get("tags")), "s": source}).one()
    onboarding.add_role(conn, me, "share")
    return {"id": str(r.id), "status": "draft"}


def my_capsules(conn: Connection, me: str) -> list[dict]:
    return [_capsule(r, True) for r in conn.execute(text(_CAP + " where c.author_id = :u and c.status <> 'removed' order by c.created_at desc limit 100"), {"u": me})]


def set_published(conn: Connection, me: str, capsule_id: str, on: bool) -> dict:
    r = conn.execute(text("update wisdom_capsules set status = :s, published_at = case when :on then now() else null end where id = :c and author_id = :u and status <> 'removed' returning id"),
                     {"s": "published" if on else "draft", "on": on, "c": capsule_id, "u": me}).first()
    if r is None:
        raise WisdomError("not_found", 404)
    return {"id": capsule_id, "status": "published" if on else "draft"}


def remove_capsule(conn: Connection, me: str, capsule_id: str) -> dict:
    if conn.execute(text("update wisdom_capsules set status = 'removed' where id = :c and author_id = :u and status <> 'removed' returning id"), {"c": capsule_id, "u": me}).first() is None:
        raise WisdomError("not_found", 404)
    return {"removed": True}


def library(conn: Connection, me: str, q: str | None = None, kind: str | None = None, limit: int = 30) -> list[dict]:
    """The shared stories, newest first, searched by a word in the title, text or tags."""
    rows = conn.execute(text(_CAP + " where c.status = 'published' and (:k = '' or c.kind = :k) and (not :hq or lower(c.title) like :q or lower(c.body) like :q or exists (select 1 from unnest(c.tags) t where t like :q)) "
                             "order by c.published_at desc limit :n"), {"k": kind or "", "q": _like(q), "hq": bool((q or "").strip()), "n": max(1, min(limit, 100))})
    return [_capsule(r, str(r.author_id) == me) for r in rows]


# ---------- offers ----------
def _offer(r, me: str) -> dict:
    return {"id": str(r.id), "title": r.title, "about": r.about, "kind": r.kind, "mode": r.mode, "domain": r.domain, "price_note": r.price_note, "availability": r.availability, "status": r.status,
            "by": r.first_name or "A friend", "mine": str(r.user_id) == me, "created_at": _iso(r.created_at)}


_OFF = "select o.*, nullif(split_part(u.display_name, ' ', 1), '') as first_name from wisdom_offers o join users u on u.id = o.user_id"


def create_offer(conn: Connection, me: str, data: dict) -> dict:
    kind, mode = data.get("kind") or "mentoring", data.get("mode") or "volunteer"
    domain = data.get("domain") or None
    if kind not in OFFER_KINDS or mode not in MODES or (domain and domain not in CAPSULE_KINDS):
        raise WisdomError("validation", 422)
    about = str(data.get("about") or "").strip()[:1000] or None
    r = conn.execute(text("insert into wisdom_offers (user_id, title, about, kind, mode, availability, domain, price_note) values (:u, :t, :a, :k, :m, :v, :d, :p) returning id"),
                     {"u": me, "t": _text(data.get("title"), 2, 120, "title"), "a": about, "k": kind, "m": mode, "v": str(data.get("availability") or "").strip()[:200] or None,
                      "d": domain, "p": str(data.get("price_note") or "").strip()[:120] or None}).one()
    onboarding.add_role(conn, me, "share")
    return {"id": str(r.id), "status": "active"}


def my_offers(conn: Connection, me: str) -> list[dict]:
    return [_offer(r, me) for r in conn.execute(text(_OFF + " where o.user_id = :u and o.status <> 'closed' order by o.created_at desc"), {"u": me})]


def set_offer_status(conn: Connection, me: str, offer_id: str, status: str) -> dict:
    if status not in ("active", "paused", "closed"):
        raise WisdomError("validation", 422)
    if conn.execute(text("update wisdom_offers set status = :s where id = :o and user_id = :u and status <> 'closed' returning id"), {"s": status, "o": offer_id, "u": me}).first() is None:
        raise WisdomError("not_found", 404)
    return {"id": offer_id, "status": status}


def browse_offers(conn: Connection, me: str, q: str | None = None, kind: str | None = None, mode: str | None = None, limit: int = 30, domain: str | None = None) -> list[dict]:
    """Open offers from other people, for a learner. mode 'paid' also finds 'either'. domain: cultural, social or professional."""
    rows = conn.execute(text(_OFF + " where o.status = 'active' and o.user_id <> :u and (:k = '' or o.kind = :k) and (:m = '' or o.mode = :m or o.mode = 'either') and (:d = '' or o.domain = :d) "
                             "and (not :hq or lower(o.title) like :q or lower(coalesce(o.about, '')) like :q) order by o.created_at desc limit :n"),
                        {"u": me, "k": kind or "", "m": mode or "", "d": domain or "", "q": _like(q), "hq": bool((q or "").strip()), "n": max(1, min(limit, 100))})
    return [_offer(r, me) for r in rows]


# ---------- requests ----------
def _request(r, me: str) -> dict:
    return {"id": str(r.id), "topic": r.topic, "about": r.about, "kind": r.kind, "status": r.status, "by": r.first_name or "A friend", "mine": str(r.user_id) == me, "created_at": _iso(r.created_at)}


_REQ = "select r.*, nullif(split_part(u.display_name, ' ', 1), '') as first_name from wisdom_requests r join users u on u.id = r.user_id"


def create_request(conn: Connection, me: str, data: dict) -> dict:
    """What a person wants: to LEARN from someone who has lived it, or SUPPORT (an older person asks the next generation for a hand)."""
    kind = data.get("kind") or "learn"
    if kind not in ("learn", "support"):
        raise WisdomError("validation", 422)
    if kind == "learn" and not onboarding.can_learn(conn, me):
        raise WisdomError("confirm_age_15", 403)
    r = conn.execute(text("insert into wisdom_requests (user_id, topic, about, kind) values (:u, :t, :a, :k) returning id"),
                     {"u": me, "t": _text(data.get("topic"), 2, 120, "topic"), "a": str(data.get("about") or "").strip()[:1000] or None, "k": kind}).one()
    if kind == "learn":
        onboarding.add_role(conn, me, "learn")
    return {"id": str(r.id), "status": "open", "kind": kind}


def my_requests(conn: Connection, me: str) -> list[dict]:
    return [_request(r, me) for r in conn.execute(text(_REQ + " where r.user_id = :u and r.status = 'open' order by r.created_at desc"), {"u": me})]


def close_request(conn: Connection, me: str, request_id: str) -> dict:
    if conn.execute(text("update wisdom_requests set status = 'closed' where id = :r and user_id = :u and status = 'open' returning id"), {"r": request_id, "u": me}).first() is None:
        raise WisdomError("not_found", 404)
    return {"closed": True}


def open_requests(conn: Connection, me: str, q: str | None = None, limit: int = 30, kind: str | None = None) -> list[dict]:
    """What people want, for someone who can help: to learn (kind learn) or a hand (kind support)."""
    rows = conn.execute(text(_REQ + " where r.status = 'open' and r.user_id <> :u and (:k = '' or r.kind = :k) and (not :hq or lower(r.topic) like :q or lower(coalesce(r.about, '')) like :q) order by r.created_at desc limit :n"),
                        {"u": me, "k": kind or "", "q": _like(q), "hq": bool((q or "").strip()), "n": max(1, min(limit, 100))})
    return [_request(r, me) for r in rows]


# ---------- introductions ----------
def _tell(user_id: str, line: str) -> None:
    try:  # a notice is a courtesy: it never blocks the introduction
        from ..channels import core

        core.notify(user_id, line, kind="wisdom")
    except Exception:  # noqa: BLE001
        pass


def _first(conn: Connection, user_id: str) -> str:
    return conn.execute(text("select coalesce(nullif(split_part(display_name, ' ', 1), ''), 'Someone') from users where id = :u"), {"u": user_id}).scalar() or "Someone"


def _open(conn: Connection, mentor: str, learner: str, by: str, offer_id, request_id, message) -> dict:
    if mentor == learner:
        raise WisdomError("not_yourself", 422)
    dup = conn.execute(text("select id from wisdom_connections where mentor_id = :m and learner_id = :l and status in ('pending', 'accepted') "
                            "and offer_id is not distinct from :o and request_id is not distinct from :r"), {"m": mentor, "l": learner, "o": offer_id, "r": request_id}).first()
    if dup:
        raise WisdomError("already_asked", 409)
    r = conn.execute(text("insert into wisdom_connections (mentor_id, learner_id, initiated_by, offer_id, request_id, message) values (:m, :l, :b, :o, :r, :t) returning id"),
                     {"m": mentor, "l": learner, "b": by, "o": offer_id, "r": request_id, "t": str(message or "").strip()[:500] or None}).one()
    return {"id": str(r.id), "status": "pending"}


def ask_offer(conn: Connection, me: str, offer_id: str, message: str | None = None) -> dict:
    """A learner asks an offering mentor for guidance. The mentor decides."""
    if not onboarding.can_learn(conn, me):
        raise WisdomError("confirm_age_15", 403)
    o = conn.execute(text("select id, user_id, title from wisdom_offers where id = :o and status = 'active'"), {"o": offer_id}).first()
    if o is None:
        raise WisdomError("not_found", 404)
    out = _open(conn, str(o.user_id), me, me, o.id, None, message)
    onboarding.add_role(conn, me, "learn")
    _tell(str(o.user_id), f"{_first(conn, me)} would like your guidance on “{o.title}”. Open Wisdom (or ask me: “who wants my help?”) to say yes or no.")
    return {**out, "to": _first(conn, str(o.user_id)), "about": o.title}


def answer_request(conn: Connection, me: str, request_id: str, message: str | None = None) -> dict:
    """Someone offers to help with what a person asked: to teach (a learn request) or to lend a hand (a support request). The asker decides."""
    r = conn.execute(text("select id, user_id, topic, kind from wisdom_requests where id = :r and status = 'open'"), {"r": request_id}).first()
    if r is None:
        raise WisdomError("not_found", 404)
    if r.kind == "support" and not onboarding.can_learn(conn, me):  # the next generation gives a hand: they must be 15 or older too
        raise WisdomError("confirm_age_15", 403)
    out = _open(conn, me, str(r.user_id), me, None, r.id, message)
    onboarding.add_role(conn, me, "help" if r.kind == "support" else "share")
    what = "give you a hand with" if r.kind == "support" else "help you with"
    _tell(str(r.user_id), f"{_first(conn, me)} would like to {what} “{r.topic}”. Open Wisdom (or ask me: “who wants to help me?”) to say yes or no.")
    return {**out, "to": _first(conn, str(r.user_id)), "about": r.topic}


def my_connections(conn: Connection, me: str) -> list[dict]:
    rows = conn.execute(text(
        "select c.*, o.title as offer_title, q.topic as request_topic from wisdom_connections c left join wisdom_offers o on o.id = c.offer_id left join wisdom_requests q on q.id = c.request_id "
        "where (c.mentor_id = :u or c.learner_id = :u) and c.status <> 'closed' order by c.created_at desc limit 50"), {"u": me}).all()
    out = []
    for r in rows:
        other = str(r.learner_id) if str(r.mentor_id) == me else str(r.mentor_id)
        out.append({"id": str(r.id), "with": _first(conn, other), "i_am": "mentor" if str(r.mentor_id) == me else "learner", "about": r.offer_title or r.request_topic, "message": r.message,
                    "status": r.status, "waiting_for_me": r.status == "pending" and str(r.initiated_by) != me, "created_at": _iso(r.created_at)})
    return out


def decide(conn: Connection, me: str, connection_id: str, accept: bool) -> dict:
    """Only the side that was asked can answer."""
    r = conn.execute(text("select * from wisdom_connections where id = :c and status = 'pending' for update"), {"c": connection_id}).first()
    if r is None or me not in (str(r.mentor_id), str(r.learner_id)):
        raise WisdomError("not_found", 404)
    if str(r.initiated_by) == me:
        raise WisdomError("not_yours_to_decide", 403)
    conn.execute(text("update wisdom_connections set status = :s, decided_at = now() where id = :c"), {"s": "accepted" if accept else "declined", "c": connection_id})
    asker = str(r.initiated_by)
    _tell(asker, f"{_first(conn, me)} said {'yes' if accept else 'not this time'} to your Wisdom request." + (" You can now talk to each other." if accept else ""))
    return {"id": connection_id, "status": "accepted" if accept else "declined", "with": _first(conn, asker)}


def close_connection(conn: Connection, me: str, connection_id: str) -> dict:
    if conn.execute(text("update wisdom_connections set status = 'closed' where id = :c and status in ('pending', 'accepted') and (mentor_id = :u or learner_id = :u) returning id"), {"c": connection_id, "u": me}).first() is None:
        raise WisdomError("not_found", 404)
    return {"closed": True}


# ---------- sessions and what they add up to ----------
def log_session(conn: Connection, me: str, connection_id: str, minutes: int) -> dict:
    """A mentor and a learner talked. Either of them can say so, once the introduction is accepted."""
    try:
        minutes = int(minutes)
        assert 1 <= minutes <= 600
    except (TypeError, ValueError, AssertionError):
        raise WisdomError("bad_minutes", 422) from None
    r = conn.execute(text("select id from wisdom_connections where id = :c and status = 'accepted' and (mentor_id = :u or learner_id = :u)"), {"c": connection_id, "u": me}).first()
    if r is None:
        raise WisdomError("not_found", 404)
    conn.execute(text("insert into wisdom_sessions (connection_id, logged_by, minutes) values (:c, :u, :m)"), {"c": connection_id, "u": me, "m": minutes})
    return {"logged": minutes}


def stats(conn: Connection, me: str) -> dict:
    """This month, for one person: how many calls they had in Wisdom, and how many people they helped (as a mentor) or learned from."""
    row = conn.execute(text(
        "select count(*) as calls, coalesce(sum(s.minutes), 0) as minutes, "
        "count(distinct case when c.mentor_id = :u then c.learner_id end) as helped, count(distinct case when c.learner_id = :u then c.mentor_id end) as learned_from "
        "from wisdom_sessions s join wisdom_connections c on c.id = s.connection_id where (c.mentor_id = :u or c.learner_id = :u) and s.occurred_at >= date_trunc('month', now())"), {"u": me}).one()
    return {"calls": row.calls, "minutes": int(row.minutes), "people_helped": row.helped, "mentors_learned_from": row.learned_from}
