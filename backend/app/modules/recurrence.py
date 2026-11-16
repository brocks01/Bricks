"""Repeating events. A series is one rule (daily, weekdays, weekly on chosen days, or monthly on a date or "the first Sunday") plus a template.
It makes real events ahead of time, so each one keeps its own going list, check-ins and stalls. Plain functions over one database connection."""
import calendar
import json
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import Connection, text

UTC = timezone.utc
REPEATS = ("daily", "weekdays", "weekly", "monthly")
HORIZON = {"activity": 45, "market": 120}  # days ahead that are kept filled
MAX_PER_ROLL = 400


class RepeatError(Exception):
    def __init__(self, code: str, status: int = 422):
        super().__init__(code)
        self.code, self.status = code, status


def _nth_weekday(year: int, month: int, weekday: int, nth: int) -> date | None:
    days = [d for d in range(1, calendar.monthrange(year, month)[1] + 1) if date(year, month, d).weekday() == weekday]
    try:
        return date(year, month, days[nth - 1] if nth > 0 else days[-1])
    except IndexError:
        return None


def dates(repeat: str, first: date, days: list[int] | None, week_of_month: int | None, start: date, end: date, until: date | None = None) -> list[date]:
    """The dates of a series between start and end (inclusive), never before `first` and never after `until`."""
    last = min(end, until) if until else end
    lo = max(start, first)
    out: list[date] = []
    d = lo
    if repeat == "monthly":
        y, m = lo.year, lo.month
        while date(y, m, 1) <= last:
            if week_of_month:
                cand = _nth_weekday(y, m, first.weekday(), week_of_month)
            else:
                cand = date(y, m, min(first.day, calendar.monthrange(y, m)[1]))
            if cand and lo <= cand <= last:
                out.append(cand)
            y, m = (y + 1, 1) if m == 12 else (y, m + 1)
        return out
    wanted = set(days or [first.weekday()])
    while d <= last:
        if repeat == "daily" or (repeat == "weekdays" and d.weekday() < 5) or (repeat == "weekly" and d.weekday() in wanted):
            out.append(d)
        d += timedelta(days=1)
    return out


def check_rule(repeat, days, week_of_month) -> tuple[list[int] | None, int | None]:
    if repeat not in REPEATS:
        raise RepeatError("bad_repeat")
    if days is not None:
        if not isinstance(days, list) or not days or not all(isinstance(x, int) and 0 <= x <= 6 for x in days):
            raise RepeatError("bad_repeat_days")
        days = sorted(set(days))
    if week_of_month not in (None, 1, 2, 3, 4, -1):
        raise RepeatError("bad_week_of_month")
    return (days if repeat == "weekly" else None), (week_of_month if repeat == "monthly" else None)


def create(conn: Connection, kind: str, by: str, repeat: str, starts_at: datetime, ends_at: datetime | None, template: dict, days: list[int] | None = None,
           week_of_month: int | None = None, until: date | None = None) -> dict:
    """Start a series. The first event is on starts_at (in the organiser's own time); the rest follow the rule. Returns {"series_id", "made": n}."""
    days, week_of_month = check_rule(repeat, days, week_of_month)
    off = conn.execute(text("select coalesce(tz_offset_min, 480) from users where id = :u"), {"u": by}).scalar() or 480
    local = starts_at.astimezone(UTC) + timedelta(minutes=off)
    duration = int((ends_at - starts_at).total_seconds() // 60) if ends_at and ends_at > starts_at else None
    if until and until < local.date():
        raise RepeatError("until_before_start")
    rid = conn.execute(text(
        "insert into recurrences (kind, repeat, repeat_days, week_of_month, first_date, local_time, tz_offset_min, duration_min, until_date, template, created_by) "
        "values (:k, :r, :d, :w, :f, :t, :o, :m, :u, cast(:tpl as jsonb), :by) returning id"),
        {"k": kind, "r": repeat, "d": days, "w": week_of_month, "f": local.date(), "t": local.time().replace(second=0, microsecond=0), "o": off, "m": duration, "u": until,
         "tpl": json.dumps(template, default=str), "by": by}).scalar_one()
    return {"series_id": str(rid), "made": roll(conn, str(rid))}


def _insert(conn: Connection, rec, start_utc: datetime, end_utc: datetime | None, day: date) -> bool:
    t = rec.template
    if rec.kind == "activity":
        r = conn.execute(text(
            "insert into activities (community_id, organiser_id, title, description, category, starts_at, ends_at, location, capacity, series_id, occurrence_date) "
            "values (:c, :o, :t, :d, :cat, :s, :e, :l, :cap, :sid, :od) on conflict do nothing returning id"),
            {"c": t["community_id"], "o": t.get("organiser_id"), "t": t["title"], "d": t.get("description"), "cat": t.get("category"), "s": start_utc, "e": end_utc,
             "l": t.get("location"), "cap": t.get("capacity"), "sid": rec.id, "od": day}).first()
    else:
        r = conn.execute(text(
            "insert into market_events (title, description, venue_name, venue_kind, address, area_name, starts_at, ends_at, stalls_total, cover_url, series_id, occurrence_date, host_id, kind, intents, source, external_url) "
            "values (:t, :d, :v, :vk, :a, :ar, :s, :e, :n, :cv, :sid, :od, :h, :k, :i, :src, :u) on conflict do nothing returning id"),
            {"t": t["title"], "d": t.get("description"), "v": t["venue_name"], "vk": t.get("venue_kind") or "mall", "a": t.get("address"), "ar": t.get("area_name"), "s": start_utc,
             "e": end_utc, "n": t.get("stalls_total", 12), "cv": t.get("cover_url"), "sid": rec.id, "od": day,
             "h": t.get("host_id"), "k": t.get("kind") or "market_day", "i": t.get("intents") or ["earn", "enjoy"], "src": t.get("source") or "ours", "u": t.get("external_url")}).first()
    return r is not None


def roll(conn: Connection, series_id: str, today: date | None = None) -> int:
    """Make the events of one series up to its horizon. Safe to run again and again: an event that exists is never made twice. Returns how many were made."""
    rec = conn.execute(text("select * from recurrences where id = :i and status = 'active'"), {"i": series_id}).first()
    if rec is None:
        return 0
    today = today or datetime.now(UTC).date()
    off = timedelta(minutes=rec.tz_offset_min)
    end = today + timedelta(days=HORIZON[rec.kind])
    start = max(today - timedelta(days=1), rec.first_date)
    made = 0
    for d in dates(rec.repeat, rec.first_date, rec.repeat_days, rec.week_of_month, start, end, rec.until_date)[:MAX_PER_ROLL]:
        start_utc = datetime.combine(d, rec.local_time).replace(tzinfo=UTC) - off
        end_utc = start_utc + timedelta(minutes=rec.duration_min) if rec.duration_min else None
        made += 1 if _insert(conn, rec, start_utc, end_utc, d) else 0
    conn.execute(text("update recurrences set rolled_until = :e where id = :i"), {"e": end, "i": series_id})
    return made


def run_once(today: date | None = None) -> int:
    """Keep every active series filled up to its horizon (the background loop calls this). Returns how many events were made."""
    from ..core.db import engine

    today = today or datetime.now(UTC).date()
    with engine().connect() as conn:
        ids = [str(r.id) for r in conn.execute(text("select id from recurrences where status = 'active' and (rolled_until is null or rolled_until < :t + (case kind when 'market' then 100 else 30 end))"), {"t": today})]
    made = 0
    for i in ids:
        with engine().begin() as conn:
            made += roll(conn, i, today)
    from ..market import milestones; milestones.run_once()  # one gentle word toward a market day when a circle's weekly step comes due
    return made


def end(conn: Connection, series_id: str) -> int:
    """Stop a series: no more events are made, and the coming ones that have not started are cancelled. Returns how many were cancelled."""
    rec = conn.execute(text("select kind from recurrences where id = :i and status = 'active' for update"), {"i": series_id}).first()
    if rec is None:
        raise RepeatError("not_found", 404)
    conn.execute(text("update recurrences set status = 'ended' where id = :i"), {"i": series_id})
    table = "activities" if rec.kind == "activity" else "market_events"
    return conn.execute(text(f"update {table} set status = 'cancelled' where series_id = :i and starts_at > now() and status = 'scheduled'"), {"i": series_id}).rowcount
