"""Calendar: items a person (or a family helper with the right access) schedules, occurrences calculated
on the fly, and done/skipped marks. Family access is reused from the family module (`acting`), never rebuilt.

Plain functions over one database connection, like the family and identity modules. Every refusal is a
CalendarError with a machine code the app turns into words in the person's language."""
from datetime import date, datetime, time, timedelta, timezone
from uuid import UUID

from sqlalchemy import Connection, text

from ..family import service as family
from ..family.service import FamilyError

KINDS = ("medicine", "appointment", "exercise", "event", "call", "other")
REPEATS = ("none", "daily", "weekdays", "weekly")
MAX_RANGE_DAYS = 62
MAX_OCCURRENCES = 500


class CalendarError(Exception):
    """A refusal with a machine code the app turns into words in the person's language."""

    def __init__(self, code: str, status: int = 400, **extra):
        super().__init__(code)
        self.code, self.status, self.extra = code, status, extra


def _now() -> datetime:
    return datetime.now(timezone.utc)


def acting(conn: Connection, helper_id: str, person_id: str) -> str:
    """The family access check, wrapped so the calendar's own error type comes out."""
    try:
        return family.acting(conn, helper_id, person_id)
    except FamilyError as e:
        raise CalendarError(e.code, e.status, **e.extra) from e


# ---------------------------------------------------------------- expansion (pure, unit-tested)


def expand(item, range_start_utc: datetime, range_end_utc: datetime) -> list[datetime]:
    """The dated times (UTC) when this item happens inside [range_start_utc, range_end_utc).

    item carries first_date (date), local_time (time), tz_offset_min (int), repeat, repeat_days, until_date.
    Walks the local dates around the range, keeps the ones the repeat rule holds, converts each back to UTC.
    """
    offset = timedelta(minutes=int(item.tz_offset_min))
    d = (range_start_utc + offset).date() - timedelta(days=1)
    end = (range_end_utc + offset).date() + timedelta(days=1)
    weekly = list(item.repeat_days) if item.repeat_days is not None else None
    out: list[datetime] = []
    while d <= end:
        if d >= item.first_date and (item.until_date is None or d <= item.until_date):
            hold = (
                item.repeat == "none" and d == item.first_date
                or item.repeat == "daily"
                or item.repeat == "weekdays" and d.weekday() < 5
                or item.repeat == "weekly" and d.weekday() in (weekly if weekly else [item.first_date.weekday()])
            )
            if hold:
                occurs = datetime.combine(d, item.local_time, tzinfo=timezone.utc) - offset
                if range_start_utc <= occurs < range_end_utc:
                    out.append(occurs)
        d += timedelta(days=1)
    return out


# ---------------------------------------------------------------- people and items


def person_dict(conn: Connection, person_id: str, me: str, level: str) -> dict:
    row = conn.execute(text("select display_name from users where id = :u"), {"u": person_id}).first()
    return {"id": person_id, "name": row.display_name if row and row.display_name else "", "is_me": person_id == me, "level": level}


def people(conn: Connection, me: str) -> list[dict]:
    """The calendars I may open: me, plus every person I hold an active delegation for (re-checked live)."""
    out = [person_dict(conn, me, me, "self")]
    rows = conn.execute(
        text("select user_id from delegations where helper_id = :h and status = 'active' order by created_at"),
        {"h": me},
    ).all()
    for (pid,) in rows:
        try:
            level = acting(conn, me, str(pid))
        except CalendarError:
            continue  # setup expired or no longer shares a family: the calendar is not mine to open
        out.append(person_dict(conn, str(pid), me, level))
    return out


def _uuid(value: str, what: str) -> UUID:
    try:
        return UUID(value)
    except (ValueError, AttributeError, TypeError) as e:
        raise CalendarError("not_found", 404, what=what) from e  # a malformed id is a thing that does not exist


def _item(conn: Connection, item_id: str):
    row = conn.execute(text("select * from calendar_items where id = :i"), {"i": str(_uuid(item_id, "item"))}).first()
    if row is None:
        raise CalendarError("not_found", 404)
    return row


def _checked_person(conn: Connection, me: str, person_id: str | None) -> str:
    """The calendar this request touches, with the family access re-checked when it is not me."""
    if not person_id or person_id == me:
        return me
    acting(conn, me, str(_uuid(person_id, "person")))
    return person_id


def _clean_title(title: str) -> str:
    title = (title or "").strip()
    if not 1 <= len(title) <= 120:
        raise CalendarError("validation", 422, field="title")
    return title


def _clean_brief(v) -> str | None:
    """What the person wants Interchange to do on a scheduled call (their own words), at most 500 characters."""
    if v is None:
        return None
    v = str(v).strip()
    if len(v) > 500:
        raise CalendarError("validation", 422, field="agent_brief")
    return v or None


def _parse_starts_at(starts_at: str) -> tuple[datetime, date, time, int]:
    """An aware ISO datetime -> (utc, local_date, local_time, offset_minutes). A bare datetime is refused."""
    try:
        dt = datetime.fromisoformat((starts_at or "").replace("Z", "+00:00")).replace(microsecond=0)
    except ValueError as e:
        raise CalendarError("validation", 422, field="starts_at") from e
    if dt.tzinfo is None:
        raise CalendarError("time_needs_offset", 422)  # "when?" without a place in time: the app always sends its offset
    offset_min = int(dt.utcoffset().total_seconds() // 60)
    return dt.astimezone(timezone.utc), dt.date(), dt.time(), offset_min


def create_item(conn: Connection, me: str, **b) -> dict:
    person_id = _checked_person(conn, me, b.get("person_id"))
    kind = b.get("kind") or "other"
    if kind not in KINDS:
        raise CalendarError("validation", 422, field="kind")
    title = _clean_title(b.get("title"))
    note = b.get("note")
    if note is not None:
        note = str(note).strip() or None
        if note and len(note) > 500:
            raise CalendarError("validation", 422, field="note")
    utc, first_date, local_time, offset_min = _parse_starts_at(b.get("starts_at"))
    repeat = b.get("repeat") or "none"
    if repeat not in REPEATS:
        raise CalendarError("validation", 422, field="repeat")
    repeat_days = b.get("repeat_days")
    if repeat == "weekly" and repeat_days:
        if (not isinstance(repeat_days, list) or not repeat_days or not all(isinstance(x, int) and 0 <= x <= 6 for x in repeat_days)):
            raise CalendarError("validation", 422, field="repeat_days")
        repeat_days = sorted(set(repeat_days))
    elif repeat == "weekly":
        repeat_days = [first_date.weekday()]
    else:
        repeat_days = None
    until = b.get("until_date")
    if until:
        try:
            until = date.fromisoformat(str(until))
        except ValueError as e:
            raise CalendarError("validation", 422, field="until_date") from e
        if until < first_date:
            raise CalendarError("validation", 422, field="until_date")
    remind = int(b.get("remind_before_min") or 0)
    agent_brief = _clean_brief(b.get("agent_brief"))
    channel = b.get("channel") or "app"
    duration = b.get("duration_min")
    row = conn.execute(
        text("""
            insert into calendar_items
              (person_id, created_by, updated_by, kind, title, note, first_date, local_time, tz_offset_min,
               duration_min, repeat, repeat_days, until_date, remind_before_min, channel, notify_family, agent_brief)
            values (:p, :m, :m, :k, :t, :n, :fd, :lt, :tz, :du, :r, cast(:rd as smallint[]), :un, :rb, :ch, :nf, :ab)
            returning id
        """),
        {"p": person_id, "m": me, "k": kind, "t": title, "n": note, "fd": first_date, "lt": local_time, "tz": offset_min,
         "du": duration, "r": repeat, "rd": repeat_days, "un": until, "rb": remind, "ch": channel,
         "nf": True if b.get("notify_family") is None else bool(b["notify_family"]), "ab": agent_brief},
    ).first()
    from . import warnings as warns  # late import: the warnings module imports expand from here

    return {"id": str(row.id), "warnings": warns.check(conn, person_id, utc, kind, exclude_item_id=str(row.id))}


def update_item(conn: Connection, me: str, item_id: str, **b) -> dict:
    item = _item(conn, item_id)
    acting(conn, me, str(item.person_id))  # the person's calendar decides who may edit, even for "me" urls
    sets: dict = {"updated_by": me}
    if "kind" in b:
        if b["kind"] not in KINDS:
            raise CalendarError("validation", 422, field="kind")
        sets["kind"] = b["kind"]
    if "title" in b:
        sets["title"] = _clean_title(b["title"])
    if "note" in b:
        note = (str(b["note"]).strip() or None) if b["note"] is not None else None
        if note and len(note) > 500:
            raise CalendarError("validation", 422, field="note")
        sets["note"] = note
    if "starts_at" in b and b["starts_at"]:
        _, first_date, local_time, offset_min = _parse_starts_at(b["starts_at"])
        sets.update(first_date=first_date, local_time=local_time, tz_offset_min=offset_min)
        if item.repeat == "weekly" and item.repeat_days is None:
            sets["repeat_days"] = [first_date.weekday()]
    for f in ("duration_min", "remind_before_min", "notify_family", "status"):
        if f in b and b[f] is not None:
            sets[f] = b[f]
    if "repeat" in b:
        if b["repeat"] not in REPEATS:
            raise CalendarError("validation", 422, field="repeat")
        sets["repeat"] = b["repeat"]
        if b["repeat"] == "weekly" and "repeat_days" not in b:
            sets["repeat_days"] = [item.first_date.weekday()]
    if "repeat_days" in b:
        rd = b["repeat_days"]
        if rd is not None and (not isinstance(rd, list) or not rd or not all(isinstance(x, int) and 0 <= x <= 6 for x in rd)):
            raise CalendarError("validation", 422, field="repeat_days")
        sets["repeat_days"] = sorted(set(rd)) if rd else None
    if "until_date" in b:
        until = b["until_date"]
        if until:
            try:
                until = date.fromisoformat(str(until))
            except ValueError as e:
                raise CalendarError("validation", 422, field="until_date") from e
            first = sets.get("first_date", item.first_date)
            if until < first:
                raise CalendarError("validation", 422, field="until_date")
        sets["until_date"] = until
    if "channel" in b:
        sets["channel"] = b["channel"]
    if "agent_brief" in b:
        sets["agent_brief"] = _clean_brief(b["agent_brief"])
    cols = ", ".join(f"{k} = :{k}" for k in sets)
    sets["i"] = item_id
    conn.execute(text(f"update calendar_items set {cols}, updated_at = now() where id = :i"), sets)
    if "starts_at" in b and b["starts_at"]:
        first = sets.get("first_date", item.first_date)
        local = sets.get("local_time", item.local_time)
        tz = int(sets.get("tz_offset_min", item.tz_offset_min))
        new_utc = datetime.combine(first, local, tzinfo=timezone.utc) - timedelta(minutes=tz)
        from . import warnings as warns  # late import: the warnings module imports expand from here

        return {"id": item_id, "warnings": warns.check(conn, str(item.person_id), new_utc, sets.get("kind", item.kind), exclude_item_id=item_id)}
    return {"id": item_id, "warnings": []}


def item_detail(conn: Connection, me: str, item_id: str) -> dict:
    """The one item, with who added it. The Item screen edits from this, not from guesses."""
    item = _item(conn, item_id)
    acting(conn, me, str(item.person_id))
    row = conn.execute(text("select display_name from users where id = :u"), {"u": str(item.created_by)}).first() if item.created_by else None
    return {
        "id": str(item.id), "person_id": str(item.person_id), "kind": item.kind, "title": item.title,
        "note": item.note, "first_date": item.first_date.isoformat(), "local_time": item.local_time.isoformat(
            "minutes") if item.local_time else "",
        "tz_offset_min": item.tz_offset_min, "duration_min": item.duration_min, "repeat": item.repeat,
        "repeat_days": list(item.repeat_days) if item.repeat_days is not None else None,
        "until_date": item.until_date.isoformat() if item.until_date else None,
        "remind_before_min": item.remind_before_min, "channel": item.channel, "status": item.status, "agent_brief": item.agent_brief,
        "added_by_name": (row.display_name or "") if row else "",
    }


def cancel_item(conn: Connection, me: str, item_id: str) -> dict:
    item = _item(conn, item_id)
    acting(conn, me, str(item.person_id))
    conn.execute(text("update calendar_items set status = 'cancelled', updated_by = :m, updated_at = now() where id = :i"),
                 {"m": me, "i": item_id})
    return {"id": item_id, "status": "cancelled"}


# ---------------------------------------------------------------- heartbeat, missed, warnings


def heartbeat(conn: Connection, me: str, tz_offset_min: int | None = None) -> dict:
    """The app is open. Remember the moment as a hint (never a promise), and the person's own time."""
    if tz_offset_min is not None and not -840 <= int(tz_offset_min) <= 840:
        raise CalendarError("validation", 422, field="tz_offset_min")
    if tz_offset_min is None:
        conn.execute(text("update users set app_seen_at = now() where id = :u"), {"u": me})
    else:
        conn.execute(text("update users set app_seen_at = now(), tz_offset_min = :t where id = :u"),
                     {"u": me, "t": int(tz_offset_min)})
    return {"ok": True}


def missed(conn: Connection, me: str, person_id: str | None) -> list[dict]:
    """The things of the last 24 hours that came and went without a mark (a 60-minute grace to tick them).

    Everything missed comes back, with notify_family on each row; the helper's list filters by it."""
    now = _now()
    pid = _checked_person(conn, me, person_id)
    start, end = now - timedelta(hours=24), now - timedelta(minutes=60)
    items = conn.execute(
        text("select * from calendar_items where person_id = :p and status = 'active'"),
        {"p": pid},
    ).all()
    marks = conn.execute(
        text("select item_id, occurs_at from calendar_marks where item_id = any(cast(:ids as uuid[])) and occurs_at >= :s and occurs_at < :e"),
        {"ids": [str(i.id) for i in items] or ["00000000-0000-0000-0000-000000000000"], "s": start, "e": end},
    ).all()
    marked = {(str(m.item_id), m.occurs_at) for m in marks}
    out: list[dict] = []
    for it in items:
        for occurs in expand(it, start, end):
            if (str(it.id), occurs) not in marked:
                out.append({
                    "item_id": str(it.id), "occurs_at": occurs.isoformat(), "kind": it.kind,
                    "title": it.title, "notify_family": bool(it.notify_family),
                })
    out.sort(key=lambda m: m["occurs_at"])
    return out


# ---------------------------------------------------------------- occurrences and marks


def _added_names(conn: Connection, items: dict) -> dict:
    ids = {items[i] for i in items if items[i]}
    if not ids:
        return {}
    rows = conn.execute(text("select id, display_name from users where id = any(cast(:ids as uuid[]))"), {"ids": list(ids)}).all()
    return {str(r.id): (r.display_name or "") for r in rows}


def occurrences(conn: Connection, me: str, person_id: str | None, range_start: datetime, range_end: datetime,
                include_events: bool) -> list[dict]:
    """The dated things in the range for one calendar: expanded items plus (for me) the community activities I go to."""
    if range_end <= range_start or (range_end - range_start).days > MAX_RANGE_DAYS:
        raise CalendarError("range_too_large", 422)
    pid = _checked_person(conn, me, person_id)
    items = conn.execute(
        text("select * from calendar_items where person_id = :p and status = 'active'"),
        {"p": pid},
    ).all()
    names = _added_names(conn, {str(i.created_by): str(i.created_by) for i in items})
    marks = conn.execute(
        text("select item_id, occurs_at, status from calendar_marks where item_id = any(cast(:ids as uuid[])) and occurs_at >= :s and occurs_at < :e"),
        {"ids": [str(i.id) for i in items] or ["00000000-0000-0000-0000-000000000000"], "s": range_start, "e": range_end},
    ).all()
    marked = {(str(m.item_id), m.occurs_at): m.status for m in marks}
    out: list[dict] = []
    for it in items:
        for occurs in expand(it, range_start, range_end):
            st = marked.get((str(it.id), occurs), "pending")
            out.append({
                "item_id": str(it.id), "occurs_at": occurs.isoformat(), "kind": it.kind, "title": it.title,
                "note": it.note, "duration_min": it.duration_min, "status": st,
                "added_by_name": names.get(str(it.created_by), ""), "channel": it.channel,
                "can_edit": True, "remind_before_min": it.remind_before_min,
            })
    if include_events and pid == me:
        events = conn.execute(
            text("""
                select a.id, a.title, a.starts_at, coalesce(c.name, '') as community_name, a.community_id
                from activity_participants ap
                join activities a on a.id = ap.activity_id
                join communities c on c.id = a.community_id
                where ap.user_id = :u and a.status = 'scheduled' and a.starts_at >= :s and a.starts_at < :e
            """),
            {"u": me, "s": range_start, "e": range_end},
        ).all()
        for e in events:
            out.append({
                "item_id": None, "occurs_at": e.starts_at.isoformat(), "kind": "event", "title": e.title,
                "note": None, "duration_min": None, "status": "pending", "added_by_name": e.community_name,
                "channel": "app", "can_edit": False, "remind_before_min": 0, "activity_id": str(e.id),
                "community_id": str(e.community_id),
            })
    out.sort(key=lambda x: x["occurs_at"])
    if len(out) > MAX_OCCURRENCES:
        raise CalendarError("range_too_large", 422)
    return out


def mark(conn: Connection, me: str, item_id: str, occurs_at: str, status: str) -> dict:
    item = _item(conn, item_id)
    acting(conn, me, str(item.person_id))
    if status not in ("done", "skipped"):
        raise CalendarError("validation", 422, field="status")
    try:
        occurs = datetime.fromisoformat((occurs_at or "").replace("Z", "+00:00"))
    except ValueError as e:
        raise CalendarError("validation", 422, field="occurs_at") from e
    if occurs.tzinfo is None:
        raise CalendarError("time_needs_offset", 422)
    occurs = occurs.astimezone(timezone.utc).replace(microsecond=0)
    if occurs not in expand(item, occurs - timedelta(minutes=1), occurs + timedelta(minutes=1)):
        raise CalendarError("not_an_occurrence", 422)  # only a real time of this item can be marked
    conn.execute(
        text("""
            insert into calendar_marks (item_id, occurs_at, status, marked_by)
            values (:i, :o, :s, :m)
            on conflict (item_id, occurs_at) do update set status = :s, marked_by = :m, marked_at = now()
        """),
        {"i": item_id, "o": occurs, "s": status, "m": me},
    )
    from ..nodes import feed
    feed.care(conn, me, item_id, occurs.isoformat(), str(item.title), str(item.kind), status == "done")
    return {"item_id": item_id, "occurs_at": occurs.isoformat(), "status": status}


def unmark(conn: Connection, me: str, item_id: str, occurs_at: str) -> dict:
    item = _item(conn, item_id)
    acting(conn, me, str(item.person_id))
    try:
        occurs = datetime.fromisoformat((occurs_at or "").replace("Z", "+00:00")).astimezone(timezone.utc).replace(microsecond=0)
    except ValueError as e:
        raise CalendarError("validation", 422, field="occurs_at") from e
    conn.execute(text("delete from calendar_marks where item_id = :i and occurs_at = :o"), {"i": item_id, "o": occurs})
    from ..nodes import feed
    feed.care(conn, me, item_id, occurs.isoformat(), str(item.title), str(item.kind), False)
    return {"item_id": item_id, "occurs_at": occurs.isoformat(), "status": "pending"}
