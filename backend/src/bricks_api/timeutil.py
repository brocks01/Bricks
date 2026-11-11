"""Time in Singapore: "today", "this week" and reminder times are all local (SGT)."""

from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

SGT = ZoneInfo("Asia/Singapore")


def iso(dt: datetime) -> str:
    """ISO 8601 in UTC with milliseconds, like JavaScript's toISOString()."""
    return dt.astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def iso_opt(dt: datetime | None) -> str | None:
    return iso(dt) if dt else None


def parse_iso(value: str) -> datetime:
    """Parses an ISO 8601 timestamp; one without an offset is taken as Singapore time."""
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=SGT)


def local(dt: datetime) -> datetime:
    return dt.astimezone(SGT)


def local_date(dt: datetime) -> date:
    return local(dt).date()


def week_start(d: date) -> date:
    """Monday of the week containing `d`."""
    return d - timedelta(days=d.weekday())


def at_local(d: date, hour: int, minute: int = 0) -> datetime:
    return datetime(d.year, d.month, d.day, hour, minute, tzinfo=SGT)


def hhmm(dt: datetime) -> str:
    return local(dt).strftime("%H:%M")
