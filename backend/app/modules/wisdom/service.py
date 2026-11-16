"""Wisdom: turn a lifetime of experience into something the next generation can use, and connect the two.
Plain functions over one database connection, like the other modules. The app, the agent on a call and the chats all use these.

Rules:
- a story is private (a draft) until its author clearly says to share it, and only then does anyone else see it;
- offering to teach adds the 'share' role to the person, asking to learn adds 'learn', so what they see follows what they do;
- an introduction is decided by the OTHER side: nobody can accept their own request, and nobody is forced into a conversation;
- only first names are shown to people who are not yet connected;
- trust is proof, counted sessions and endorsements (never star ratings), and a learner is told when a topic is experience and not professional advice;
- the first conversation happens after an introduction is accepted: short messages through Wisdom, delivered by the outbox, never a phone number or an email."""
import re

from sqlalchemy import Connection, text

from ...core import languages as lang
from ..onboarding import service as onboarding

CAPSULE_KINDS = ("cultural", "social", "professional")  # the three domains of experience
OFFER_KINDS = ("mentoring", "workshop", "freelance")
MODES = ("volunteer", "paid", "either")
SOURCES = ("app", "call", "telegram", "whatsapp", "sms")
# A topic in these is sensitive: on it, always say that this is experience and not professional advice (pregnancy, health, money, law).
SENSITIVE_WORDS = ("pregnan", "health", "medic", "doctor", "nurse", "illness", "symptom", "money", "financ", "invest", "loan", "debt", "tax", "insur", "law", "legal", "court", "rights")


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


def is_sensitive(topics) -> bool:
    """Pregnancy, health, money or law. On those, the learner is always told this is experience, not professional advice."""
    for t in topics or []:
        for token in re.split(r"[^a-z]+", str(t).lower()):
            if any(w in token for w in SENSITIVE_WORDS):
                return True
    return False


def _lang_filter(value: str | None) -> str:
    """One language to search by, accepted however the mentor wrote it: a code (ta), an English name (Tamil) or its own name (தமிழ்)."""
    v = str(value or "").strip().lower()
    if not v:
        return ""
    for code, (en, own) in lang.SPOKEN.items():
        if v in (code, en.lower(), own.lower()):
            return ",".join(sorted({code, en.lower()}))
    return v


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
    topics = list(r.topics or [])
    return {"id": str(r.id), "title": r.title, "about": r.about, "kind": r.kind, "mode": r.mode, "domain": r.domain, "price_note": r.price_note, "availability": r.availability, "status": r.status,
            "proof_field": r.proof_field, "proof_years": r.proof_years, "proof_where": r.proof_where, "topics": topics, "languages": list(r.languages or []),
            "sensitive": is_sensitive(topics), "endorsements": int(r.endorsement_count or 0), "sessions": int(r.session_count or 0), "area": r.area_name,
            "by": r.first_name or "A friend", "name": r.short_name or r.first_name or "A friend", "mine": str(r.user_id) == me, "created_at": _iso(r.created_at)}


# proof, topics and languages live on the offer; the counts come from the sessions and the thank-yous people left (counts and sessions, never star ratings).
_OFF = ("select o.*, nullif(split_part(u.display_name, ' ', 1), '') as first_name, u.area_name, "
        "case when strpos(trim(u.display_name), ' ') > 0 then split_part(trim(u.display_name), ' ', 1) || ' ' || upper(left(regexp_replace(trim(u.display_name), '^.* ', ''), 1)) || '.' end as short_name, "
        "(select count(*) from wisdom_endorsements e where e.offer_id = o.id) as endorsement_count, "
        "(select count(*) from wisdom_sessions s join wisdom_connections c on c.id = s.connection_id where c.offer_id = o.id) as session_count "
        "from wisdom_offers o join users u on u.id = o.user_id")


def create_offer(conn: Connection, me: str, data: dict) -> dict:
    kind, mode = data.get("kind") or "mentoring", data.get("mode") or "volunteer"
    domain = data.get("domain") or None
    if kind not in OFFER_KINDS or mode not in MODES or (domain and domain not in CAPSULE_KINDS):
        raise WisdomError("validation", 422)
    about = str(data.get("about") or "").strip()[:1000] or None
    try:
        years = None if data.get("proof_years") in (None, "") else int(data.get("proof_years"))
    except (TypeError, ValueError):
        raise WisdomError("validation", 422) from None
    if years is not None and not 0 <= years <= 70:
        raise WisdomError("validation", 422)
    r = conn.execute(text("insert into wisdom_offers (user_id, title, about, kind, mode, availability, domain, price_note, proof_field, proof_years, proof_where, topics, languages) "
                          "values (:u, :t, :a, :k, :m, :v, :d, :p, :pf, :py, :pw, :tp, :lg) returning id"),
                     {"u": me, "t": _text(data.get("title"), 2, 120, "title"), "a": about, "k": kind, "m": mode, "v": str(data.get("availability") or "").strip()[:200] or None,
                      "d": domain, "p": str(data.get("price_note") or "").strip()[:120] or None,
                      "pf": str(data.get("proof_field") or "").strip()[:120] or None, "py": years, "pw": str(data.get("proof_where") or "").strip()[:200] or None,
                      "tp": _tags(data.get("topics")), "lg": _tags(data.get("languages"))}).one()
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


def browse_offers(conn: Connection, me: str, q: str | None = None, kind: str | None = None, mode: str | None = None, limit: int = 30, domain: str | None = None,
                  topic: str | None = None, language: str | None = None, area: str | None = None) -> list[dict]:
    """Open offers from other people, for a learner. mode 'paid' also finds 'either'. domain: cultural, social or professional.
    Discovery also filters by a topic (a life stage or a subject, a word inside the offer's topics; several words separated by commas find any of them),
    a language (a code or a name), and the mentor's area (the learner's city). The search words also match the mentor's name, field and languages."""
    langs = _lang_filter(language)
    words = [f"%{t.strip().lower()}%" for t in str(topic or "").split(",") if t.strip()]
    rows = conn.execute(text(_OFF + " where o.status = 'active' and o.user_id <> :u and (:k = '' or o.kind = :k) and (:m = '' or o.mode = :m or o.mode = 'either') and (:d = '' or o.domain = :d) "
                             "and (:t = '' or exists (select 1 from unnest(o.topics) x where x like any(cast(:tlike as text[])))) "
                             "and (:l = '' or exists (select 1 from unnest(o.languages) x where x = any(string_to_array(:l, ',')))) "
                             "and (:a = '' or lower(coalesce(u.area_name, '')) like :alike) "
                             "and (not :hq or lower(o.title) like :q or lower(coalesce(o.about, '')) like :q or lower(coalesce(u.display_name, '')) like :q or lower(coalesce(o.proof_field, '')) like :q "
                             "or exists (select 1 from unnest(o.topics) x where x like :q) or exists (select 1 from unnest(o.languages) x where lower(x) like :q)) order by o.created_at desc limit :n"),
                        {"u": me, "k": kind or "", "m": mode or "", "d": domain or "", "q": _like(q), "hq": bool((q or "").strip()),
                         "t": ",".join(words), "tlike": words or ["%"],
                         "l": langs, "a": (area or "").strip(), "alike": f"%{(area or '').strip().lower()}%", "n": max(1, min(limit, 100))})
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


def _open(conn: Connection, mentor: str, learner: str, by: str, offer_id, request_id, message, group: dict | None = None) -> dict:
    if mentor == learner:
        raise WisdomError("not_yourself", 422)
    dup = conn.execute(text("select id from wisdom_connections where mentor_id = :m and learner_id = :l and status in ('pending', 'accepted') "
                            "and offer_id is not distinct from :o and request_id is not distinct from :r"), {"m": mentor, "l": learner, "o": offer_id, "r": request_id}).first()
    if dup:
        raise WisdomError("already_asked", 409)
    g = group or {}
    r = conn.execute(text("insert into wisdom_connections (mentor_id, learner_id, initiated_by, offer_id, request_id, message, group_name, learner_count, topic) "
                          "values (:m, :l, :b, :o, :r, :t, :g, :n, :tp) returning id"),
                     {"m": mentor, "l": learner, "b": by, "o": offer_id, "r": request_id, "t": str(message or "").strip()[:500] or None,
                      "g": g.get("group_name"), "n": g.get("learner_count"), "tp": g.get("topic")}).one()
    return {"id": str(r.id), "status": "pending"}


def _group(group_name, learner_count, topic) -> dict:
    """A group asking together (a class, a club): its name and how many learners, both or neither. And what they want to learn."""
    name = str(group_name or "").strip()
    tp = str(topic or "").strip()
    if len(tp) > 120:
        raise WisdomError("bad_topic", 422)
    if not name and learner_count in (None, ""):
        return {"topic": tp or None}
    try:
        n = int(learner_count)
    except (TypeError, ValueError):
        raise WisdomError("bad_group", 422) from None
    if not 2 <= len(name) <= 80 or not 2 <= n <= 500:
        raise WisdomError("bad_group", 422)
    return {"group_name": name, "learner_count": n, "topic": tp or None}


def ask_offer(conn: Connection, me: str, offer_id: str, message: str | None = None, group_name: str | None = None, learner_count: int | None = None,
              topic: str | None = None) -> dict:
    """A learner asks an offering mentor for guidance, alone or for a group (group_name and learner_count). The mentor decides."""
    group = _group(group_name, learner_count, topic)
    if not onboarding.can_learn(conn, me):
        raise WisdomError("confirm_age_15", 403)
    o = conn.execute(text("select id, user_id, title from wisdom_offers where id = :o and status = 'active'"), {"o": offer_id}).first()
    if o is None:
        raise WisdomError("not_found", 404)
    out = _open(conn, str(o.user_id), me, me, o.id, None, message, group)
    onboarding.add_role(conn, me, "learn")
    who = f"{group['group_name']} ({group['learner_count']} learners)" if group.get("group_name") else _first(conn, me)
    _tell(str(o.user_id), f"{who} would like your guidance on “{o.title}”. Open Wisdom (or ask me: “who wants my help?”) to say yes or no.")
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
        "select c.*, o.title as offer_title, q.topic as request_topic, "
        "(select count(*) from wisdom_sessions s where s.connection_id = c.id) as session_count, "
        "(select count(*) from wisdom_messages m where m.connection_id = c.id and m.sender_id <> :u and m.read_at is null) as unread_count, "
        "exists (select 1 from wisdom_endorsements e where e.offer_id = c.offer_id and e.learner_id = :u) as endorsed_by_me "
        "from wisdom_connections c left join wisdom_offers o on o.id = c.offer_id left join wisdom_requests q on q.id = c.request_id "
        "where (c.mentor_id = :u or c.learner_id = :u) and c.status <> 'closed' order by c.created_at desc limit 50"), {"u": me}).all()
    out = []
    for r in rows:
        other = str(r.learner_id) if str(r.mentor_id) == me else str(r.mentor_id)
        out.append({"id": str(r.id), "with": _first(conn, other), "i_am": "mentor" if str(r.mentor_id) == me else "learner", "about": r.offer_title or r.request_topic, "message": r.message,
                    "status": r.status, "waiting_for_me": r.status == "pending" and str(r.initiated_by) != me, "created_at": _iso(r.created_at),
                    "offer_id": str(r.offer_id) if r.offer_id else None, "sessions": int(r.session_count or 0), "endorsed": bool(r.endorsed_by_me), "unread": int(r.unread_count or 0),
                    "group_name": r.group_name, "learner_count": r.learner_count, "topic": r.topic or r.offer_title or r.request_topic})
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


# ---------- trust: proof, endorsements, and the first conversation ----------
def endorse_offer(conn: Connection, me: str, offer_id: str, note: str | None = None) -> dict:
    """A learner says thank you to a mentor's offer. Only after a session they actually had with that mentor, and only once per offer: counts and words, no star ratings."""
    o = conn.execute(text("select id, user_id from wisdom_offers where id = :o"), {"o": offer_id}).first()
    if o is None:
        raise WisdomError("not_found", 404)
    if str(o.user_id) == me:
        raise WisdomError("not_your_offer", 403)
    had = conn.execute(text("select 1 from wisdom_connections c join wisdom_sessions s on s.connection_id = c.id "
                            "where c.offer_id = :o and c.learner_id = :u and c.status = 'accepted' limit 1"), {"o": offer_id, "u": me}).first()
    if had is None:
        raise WisdomError("needs_session", 403)
    res = conn.execute(text("insert into wisdom_endorsements (offer_id, learner_id, note) values (:o, :u, :n) on conflict (offer_id, learner_id) do nothing"),
                       {"o": offer_id, "u": me, "n": str(note or "").strip()[:200] or None})
    if res.rowcount == 0:
        raise WisdomError("already_endorsed", 409)
    count = conn.execute(text("select count(*) from wisdom_endorsements where offer_id = :o"), {"o": offer_id}).scalar()
    return {"endorsed": True, "endorsements": int(count)}


def _one_connection(conn: Connection, me: str, connection_id: str):
    r = conn.execute(text("select * from wisdom_connections where id = :c"), {"c": connection_id}).first()
    if r is None or me not in (str(r.mentor_id), str(r.learner_id)) or r.status == "closed":
        raise WisdomError("not_found", 404)
    if r.status != "accepted":  # the first conversation starts only when BOTH sides said yes
        raise WisdomError("not_accepted", 409)
    return r


def thread(conn: Connection, me: str, connection_id: str, mark_read: bool = True) -> list[dict]:
    """The messages of one accepted introduction, oldest first. Opening the thread marks the other side's messages as read; listing them does not.
    Only first names: a phone number or an email is never part of this."""
    r = _one_connection(conn, me, connection_id)
    if mark_read:
        conn.execute(text("update wisdom_messages set read_at = now() where connection_id = :c and sender_id <> :u and read_at is null"), {"c": str(r.id), "u": me})
    rows = conn.execute(text("select m.*, nullif(split_part(u.display_name, ' ', 1), '') as first_name from wisdom_messages m join users u on u.id = m.sender_id "
                             "where m.connection_id = :c order by m.created_at asc limit 200"), {"c": str(r.id)}).all()
    return [{"id": str(x.id), "from": x.first_name or "Someone", "mine": str(x.sender_id) == me, "body": x.body, "at": _iso(x.created_at), "read": x.read_at is not None} for x in rows]


def send_message(conn: Connection, me: str, connection_id: str, body: str) -> dict:
    """One short message to the other side of an accepted introduction. It goes out through the outbox (their preferred channel, quiet hours) and lands in their in-app inbox."""
    r = _one_connection(conn, me, connection_id)
    line = _text(body, 1, 500, "message")
    other = str(r.learner_id) if str(r.mentor_id) == me else str(r.mentor_id)
    conn.execute(text("insert into wisdom_messages (connection_id, sender_id, body) values (:c, :u, :b)"), {"c": str(r.id), "u": me, "b": line})
    _tell(other, f"{_first(conn, me)} wrote to you in Wisdom: “{line}”. Open Wisdom (or ask me: “my conversations”) to read and answer.")
    return {"sent": True, "to": _first(conn, other)}


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


def upcoming_sessions(conn: Connection, user_id: str, until):
    """For Home (contract point 5): the person's scheduled Wisdom sessions until `until`, soonest first, each with id, title, starts_at, place,
    with_name and role ('teacher' or 'learner'). The work is in teach.py."""
    from . import teach

    return teach.upcoming_sessions(conn, user_id, until)
