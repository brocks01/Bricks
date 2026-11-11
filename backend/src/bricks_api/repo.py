"""Queries shared by several routes (people, event summaries)."""

from datetime import datetime
from typing import Any

from .db import Conn
from .schemas import EventSummary, PersonSummary
from .timeutil import iso, iso_opt

# Event rows with their going count, the member's RSVP and the host. Needs %(me)s.
EVENT_SELECT = """
select e.*,
  e.extra_going + (select count(*) from rsvps r where r.event_id = e.id and r.status = 'going')
    as going_count,
  exists(select 1 from rsvps r where r.event_id = e.id and r.user_id = %(me)s
         and r.status = 'going') as mine,
  h.name as host_name, h.photo_url as host_photo
from events e join users h on h.id = e.host_id
"""


def person(row: dict[str, Any], prefix: str = "") -> PersonSummary:
    return PersonSummary(
        id=row[f"{prefix}id"], name=row[f"{prefix}name"], photo_url=row[f"{prefix}photo_url"]
    )


def event_summary(row: dict[str, Any]) -> EventSummary:
    return EventSummary(
        id=row["id"],
        title=row["title"],
        category=row["category"],
        start_at=iso(row["start_at"]),
        end_at=iso_opt(row["end_at"]),
        place_name=row["place_name"],
        photo_url=row["photo_url"],
        going_count=int(row["going_count"]),
        my_rsvp="going" if row["mine"] else None,
        language=row["language"],
        whatsapp_link=row["whatsapp_link"],
        host=PersonSummary(id=row["host_id"], name=row["host_name"], photo_url=row["host_photo"]),
    )


async def upcoming_events(
    conn: Conn, me: str, now: datetime, where: str = "true", params: dict[str, Any] | None = None
) -> list[dict[str, Any]]:
    """Active events that haven't started yet, soonest first."""
    query = (
        EVENT_SELECT
        + f" where e.status = 'active' and e.start_at > %(now)s and ({where}) order by e.start_at"
    )
    cur = await conn.execute(query, {"me": me, "now": now, **(params or {})})
    return await cur.fetchall()


async def event_row(conn: Conn, me: str, event_id: str) -> dict[str, Any] | None:
    cur = await conn.execute(
        EVENT_SELECT + " where e.id = %(id)s and e.status = 'active'",
        {"me": me, "id": event_id},
    )
    return await cur.fetchone()


async def people(conn: Conn, ids: list[str]) -> list[PersonSummary]:
    """People in the order given (unknown ids are skipped)."""
    if not ids:
        return []
    rows = await (
        await conn.execute("select id, name, photo_url from users where id = any(%s)", (ids,))
    ).fetchall()
    by_id = {r["id"]: person(r) for r in rows}
    return [by_id[i] for i in ids if i in by_id]


async def user_row(conn: Conn, user_id: str) -> dict[str, Any] | None:
    return await (await conn.execute("select * from users where id = %s", (user_id,))).fetchone()
