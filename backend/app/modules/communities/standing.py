"""Standing in a community: how often a person actually comes. It is what the daily jogging group and the weekly kopi are built on: a streak of days, a streak of weeks,
how many times this month, and a level that grows with the month (newcomer, regular, stalwart). It counts check-ins ("I'm here"), so only showing up counts.
Names shown are first names of people in the same community."""
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import Connection, text

from .service import _member

UTC = timezone.utc
REGULAR_AT = 3  # times this month
STALWART_AT = 8


def _level(n: int) -> str:
    return "stalwart" if n >= STALWART_AT else "regular" if n >= REGULAR_AT else "newcomer"


def _streak(have: set, today, step) -> int:
    """Consecutive units (days or weeks) ending today, or ending the unit before if the current one has not happened yet."""
    cur = today if today in have else step(today, -1)
    n = 0
    while cur in have:
        n += 1
        cur = step(cur, -1)
    return n


def standing(conn: Connection, me: str, community_id: str, now: datetime | None = None) -> dict:
    _member(conn, me, community_id)
    now = now or datetime.now(UTC)
    off = conn.execute(text("select coalesce(tz_offset_min, 480) from users where id = :u"), {"u": me}).scalar() or 480
    today = (now + timedelta(minutes=off)).date()
    rows = conn.execute(text(
        "select (p.checked_in_at + make_interval(mins => :o))::date as d from activity_participants p join activities x on x.id = p.activity_id "
        "where x.community_id = :c and p.user_id = :u and p.status = 'attended' and p.checked_in_at is not null order by p.checked_in_at desc limit 800"),
        {"o": off, "c": community_id, "u": me}).all()
    days = [r.d for r in rows]
    first_of_month = date(today.year, today.month, 1)
    last_month_start = date(today.year - 1, 12, 1) if today.month == 1 else date(today.year, today.month - 1, 1)
    this_month = sum(1 for d in days if d >= first_of_month)
    last_month = sum(1 for d in days if last_month_start <= d < first_of_month)
    week = lambda d: d.isocalendar()[:2]  # noqa: E731
    weeks = {week(d) for d in days}

    def week_step(w, k):  # the ISO week k weeks from w
        monday = date.fromisocalendar(w[0], w[1], 1) + timedelta(weeks=k)
        return week(monday)

    since_utc = datetime.combine(first_of_month, datetime.min.time()).replace(tzinfo=UTC) - timedelta(minutes=off)
    regulars = conn.execute(text(
        "select coalesce(nullif(split_part(u.display_name, ' ', 1), ''), 'Someone') as name, count(*) as n, p.user_id = :u as me "
        "from activity_participants p join activities x on x.id = p.activity_id join users u on u.id = p.user_id join memberships m on m.community_id = x.community_id and m.user_id = p.user_id and m.status = 'active' "
        "where x.community_id = :c and p.status = 'attended' and p.checked_in_at >= :s group by p.user_id, u.display_name order by n desc, name limit 5"),
        {"c": community_id, "u": me, "s": since_utc}).all()
    return {"this_month": this_month, "last_month": last_month, "total": len(days), "day_streak": _streak(set(days), today, lambda d, k: d + timedelta(days=k)),
            "week_streak": _streak(weeks, week(today), week_step), "level": _level(this_month), "next_level_at": STALWART_AT if this_month >= REGULAR_AT else REGULAR_AT if this_month < REGULAR_AT else None,
            "regulars": [{"name": r.name, "times": r.n, "me": r.me} for r in regulars]}
