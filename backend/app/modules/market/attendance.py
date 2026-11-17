"""The Marketplace in the revamp: search, what is recommended for the person, "I went" / "I didn't go", and the counts for hosts.

  recommended(conn, me, q, limit, intent)   upcoming events the person is not going to yet, best first (shared interests, distance, soon)
  mark(conn, me, eid, attended, source)     the answer after the day; it grows (or takes back) the person's leaf
  unmark(conn, me, eid)                     undo the answer
  mine(conn, me)                            the person's market days: upcoming, waiting for an answer, answered
  event_summary(conn, me, eid)              counts for one event (platform admins, and that event's host's owners and editors)
  summary(conn, me, from, to)               counts per event and in total (platform admins)

Counts only: no summary ever carries a name.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import Connection, text

from ..geo import service as geo
from ..nodes import feed
from ..onboarding.rules import INTEREST_KEYS
from .events import _card, _event_row, _my_communities, _uuid
from .service import MarketError

ANSWER_DAYS = 30  # "Did you go?" can be answered up to 30 days after the start
SOURCES = ("app", "agent")


# ---------- recommended ----------
def _place(r) -> str:
    return (r.address or "").strip() or ", ".join(x for x in (r.venue_name, r.area_name) if x)


def _score(conn: Connection, r, mine: set[str], home: tuple[float, float] | None, my_area: str, now: datetime) -> tuple[int, float | None, list[str]]:
    """+2 per shared interest; nearer is better (up to 2 km +3, 5 km +2, 15 km +1; without coordinates the same area +2); +1 within 7 days."""
    score, reasons = 0, []
    shared = [i for i in (r.interests or []) if i in mine]
    score += 2 * len(shared)
    reasons += shared
    km = None
    if home is not None:
        there = geo.locate(conn, _place(r))
        if there is not None:
            km = round(geo.distance_km(home, there), 1)
    if km is not None:
        near = 3 if km <= 2 else 2 if km <= 5 else 1 if km <= 15 else 0
        if near:
            score += near
            reasons.insert(0, "near")
    elif my_area and (r.area_name or "").strip().lower() == my_area:
        score += 2
        reasons.insert(0, "near")
    if r.starts_at - now <= timedelta(days=7):
        score += 1
        reasons.append("soon")
    return score, km, reasons


def recommended(conn: Connection, me: str, q: str | None = None, limit: int = 20, intent: str | None = None) -> list[dict]:
    me_row = conn.execute(text("select area_name, interests from users where id = :u"), {"u": me}).first()
    my_area = (me_row.area_name or "").strip().lower() if me_row else ""
    mine = set(me_row.interests or []) if me_row else set()
    home = geo.locate(conn, f"{me_row.area_name}, Singapore") if me_row and me_row.area_name else None
    rows = conn.execute(text(
        "select e.* from market_events e left join hosts h on h.id = e.host_id "
        "where e.status = 'scheduled' and coalesce(e.ends_at, e.starts_at + interval '4 hours') >= now() "
        "and not exists (select 1 from market_event_goers g where g.event_id = e.id and g.user_id = :u) "
        "and (:i = '' or :i = any(e.intents)) "
        "and (:q = '' or lower(concat_ws(' ', e.title, e.description, e.venue_name, e.area_name, e.address, h.name)) like :ql) "
        "order by e.starts_at limit 200"),
        {"u": me, "i": intent or "", "q": (q or "").strip(), "ql": f"%{(q or '').strip().lower()}%"}).all()
    now = datetime.now(timezone.utc)
    scored = []
    for r in rows:
        if mine and not (q or "").strip() and not intent and not (set(r.interests or []) & mine):
            continue  # someone who chose interests sees only events that share one (a search or an intent filter looks at everything)
        s, km, reasons = _score(conn, r, mine, home, my_area, now)
        scored.append((-s, r.starts_at, str(r.id), r, km, reasons, s))
    scored.sort(key=lambda x: x[:3])
    comms = _my_communities(conn, me)
    out = []
    for *_, r, km, reasons, s in scored[: max(1, min(int(limit), 50))]:
        out.append({**_card(conn, me, r, comms), "distance_km": km, "reasons": reasons, "score": s})
    return out


# ---------- "I went" / "I didn't go" ----------
def _host_name(conn: Connection, r) -> str | None:
    return conn.execute(text("select name from hosts where id = :h"), {"h": r.host_id}).scalar() if r.host_id else None


def _answerable(conn: Connection, me: str, r) -> None:
    if not conn.execute(text("select 1 from market_event_goers where event_id = :e and user_id = :u"), {"e": r.id, "u": me}).first():
        raise MarketError("not_going", 409)
    now = datetime.now(timezone.utc)
    if now < r.starts_at:
        raise MarketError("not_started", 409)
    if now > r.starts_at + timedelta(days=ANSWER_DAYS):
        raise MarketError("too_late", 409)


def mark(conn: Connection, me: str, eid: str, attended: bool, source: str = "app") -> dict:
    if source not in SOURCES:
        raise MarketError("validation", 422)
    r = _event_row(conn, eid)
    _answerable(conn, me, r)
    conn.execute(text(
        "insert into market_event_attendance (event_id, user_id, attended, marked_at, source) values (:e, :u, :a, now(), :s) "
        "on conflict (event_id, user_id) do update set attended = excluded.attended, marked_at = now(), source = excluded.source"),
        {"e": r.id, "u": me, "a": attended, "s": source})
    feed.showed_up(conn, me, "market", str(r.id), r.title, r.starts_at, _host_name(conn, r), on=attended)
    return {"attended": attended}


def unmark(conn: Connection, me: str, eid: str) -> dict:
    r = _event_row(conn, eid)
    _answerable(conn, me, r)
    conn.execute(text("delete from market_event_attendance where event_id = :e and user_id = :u"), {"e": r.id, "u": me})
    feed.showed_up(conn, me, "market", str(r.id), r.title, r.starts_at, _host_name(conn, r), on=False)
    return {"attended": None}


def mine(conn: Connection, me: str) -> dict:
    """The person's market days: coming up; started in the last 30 days and not answered yet; answered in the last 30 days."""
    rows = conn.execute(text(
        "select e.*, a.attended from market_event_goers g join market_events e on e.id = g.event_id "
        "left join market_event_attendance a on a.event_id = e.id and a.user_id = g.user_id "
        "where g.user_id = :u and e.status = 'scheduled' and e.starts_at >= now() - make_interval(days => :d) order by e.starts_at"),
        {"u": me, "d": ANSWER_DAYS}).all()
    comms = _my_communities(conn, me)
    now = datetime.now(timezone.utc)
    out = {"upcoming": [], "to_answer": [], "answered": []}
    for r in rows:
        card = {**_card(conn, me, r, comms), "attended": r.attended}
        if r.starts_at > now:
            out["upcoming"].append(card)
        elif r.attended is None:
            out["to_answer"].append(card)
        else:
            out["answered"].append(card)
    out["to_answer"].reverse()  # the most recent first
    out["answered"].reverse()
    return out


# ---------- counts for hosts ----------
def _counts(conn: Connection, event_ids: list) -> dict:
    rows = conn.execute(text(
        "select e.id, "
        "(select count(*) from market_event_goers g where g.event_id = e.id) as going, "
        "(select count(*) from market_event_attendance a where a.event_id = e.id and a.attended) as went, "
        "(select count(*) from market_event_attendance a where a.event_id = e.id and not a.attended) as didnt, "
        "(select count(*) from market_event_goers g where g.event_id = e.id and not exists (select 1 from market_event_attendance a where a.event_id = e.id and a.user_id = g.user_id)) as no_answer "
        "from market_events e where e.id = any(:ids)"), {"ids": event_ids}).all()
    return {str(r.id): {"going": r.going, "went": r.went, "didnt_go": r.didnt, "no_answer": r.no_answer,
                        "turn_up_rate": round(r.went / r.going, 3) if r.going else None} for r in rows}


def event_summary(conn: Connection, me: str, eid: str) -> dict:
    from ..communities import rules as comm_rules

    r = conn.execute(text("select id, title, starts_at, host_id from market_events where id = :e"), {"e": _uuid(eid)}).first()
    if r is None:
        raise MarketError("not_found", 404)
    allowed = comm_rules.is_admin(conn, me) or (r.host_id is not None and conn.execute(
        text("select 1 from host_members where host_id = :h and user_id = :u and role in ('owner', 'editor')"), {"h": r.host_id, "u": me}).first() is not None)
    if not allowed:
        raise MarketError("not_allowed", 403)
    return {"id": str(r.id), "title": r.title, "starts_at": r.starts_at.isoformat(), **_counts(conn, [r.id])[str(r.id)]}


def summary(conn: Connection, me: str, start: datetime | None, end: datetime | None) -> dict:
    from ..communities import rules as comm_rules

    if not comm_rules.is_admin(conn, me):
        raise MarketError("not_allowed", 403)
    rows = conn.execute(text(
        "select id, title, starts_at from market_events where (cast(:a as timestamptz) is null or starts_at >= :a) and (cast(:b as timestamptz) is null or starts_at <= :b) "
        "order by starts_at limit 500"), {"a": start, "b": end}).all()
    counts = _counts(conn, [r.id for r in rows])
    events = [{"id": str(r.id), "title": r.title, "starts_at": r.starts_at.isoformat(), **counts[str(r.id)]} for r in rows]
    tot = {k: sum(e[k] for e in events) for k in ("going", "went", "didnt_go", "no_answer")}
    tot["turn_up_rate"] = round(tot["went"] / tot["going"], 3) if tot["going"] else None
    return {"events": events, "totals": tot}


def clean_interests(values: list[str] | None) -> list[str]:
    """Only the eight interest keys, each once, in a fixed order; anything else is refused."""
    vals = list(dict.fromkeys(values or []))
    if any(v not in INTEREST_KEYS for v in vals):
        raise MarketError("bad_interest", 422)
    return [k for k in INTEREST_KEYS if k in vals]
