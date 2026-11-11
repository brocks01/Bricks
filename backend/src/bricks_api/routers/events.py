"""Happenings: list, detail, Start Something, join and undo (docs/03 §4)."""

from datetime import timedelta

from fastapi import APIRouter, HTTPException

from ..deps import Ctx, CtxDep, not_found
from ..ids import new_id
from ..repo import event_row, event_summary, people, upcoming_events, user_row
from ..schemas import CircleRef, EventCategory, EventDetail, EventFilter, EventSummary, NewEvent
from ..timeutil import local_date, parse_iso

router = APIRouter(tags=["events"])

# Bishan Community Club: where new events are pinned when we don't know the member's area.
DEFAULT_PLACE = (1.3505, 103.8486)


def _filter(f: EventFilter | None) -> str:
    if f == "today":
        return "(e.start_at at time zone 'Asia/Singapore')::date = %(today)s"
    if f == "week":
        return "e.start_at < %(now)s + interval '7 days'"
    if f == "walk":
        return "e.category = 'walk'"
    if f == "class":
        return "e.category in ('class', 'exercise')"
    if f == "kids":
        return "e.category = 'kids'"
    return "true"


@router.get("/events")
async def list_events(
    ctx: CtxDep, when: EventFilter | None = None, category: EventFilter | None = None
) -> list[EventSummary]:
    rows = await upcoming_events(
        ctx.conn, ctx.user_id, ctx.now, _filter(when or category), {"today": local_date(ctx.now)}
    )
    return [event_summary(r) for r in rows]


async def event_detail(ctx: Ctx, event_id: str) -> EventDetail:
    row = await event_row(ctx.conn, ctx.user_id, event_id)
    if not row:
        raise not_found(f"event {event_id}")
    # Host first, then in the order people joined.
    going = await (
        await ctx.conn.execute(
            "select user_id from rsvps where event_id = %s and status = 'going'"
            " order by (user_id = %s) desc, created_at, user_id",
            (event_id, row["host_id"]),
        )
    ).fetchall()
    circle = None
    if row["circle_id"]:
        c = await (
            await ctx.conn.execute(
                "select id, name from circles where id = %s", (row["circle_id"],)
            )
        ).fetchone()
        circle = CircleRef(id=c["id"], name=c["name"]) if c else None
    return EventDetail(
        **event_summary(row).model_dump(),
        description=row["description"],
        attendees=await people(ctx.conn, [g["user_id"] for g in going]),
        circle=circle,
    )


@router.get("/events/{event_id}")
async def get_event(event_id: str, ctx: CtxDep) -> EventDetail:
    return await event_detail(ctx, event_id)


@router.post("/events/{event_id}/rsvp")
async def rsvp(event_id: str, ctx: CtxDep) -> EventSummary:
    if not await event_row(ctx.conn, ctx.user_id, event_id):
        raise not_found(f"event {event_id}")
    await ctx.conn.execute(
        "insert into rsvps (event_id, user_id, status) values (%s, %s, 'going')"
        " on conflict (event_id, user_id) do update set status = 'going'",
        (event_id, ctx.user_id),
    )
    row = await event_row(ctx.conn, ctx.user_id, event_id)
    assert row
    return event_summary(row)


@router.delete("/events/{event_id}/rsvp")
async def cancel_rsvp(event_id: str, ctx: CtxDep) -> EventSummary:
    row = await event_row(ctx.conn, ctx.user_id, event_id)
    if not row:
        raise not_found(f"event {event_id}")
    # The host stays going to their own event.
    if row["host_id"] != ctx.user_id:
        await ctx.conn.execute(
            "update rsvps set status = 'cancelled' where event_id = %s and user_id = %s",
            (event_id, ctx.user_id),
        )
        row = await event_row(ctx.conn, ctx.user_id, event_id)
        assert row
    return event_summary(row)


async def insert_event(
    ctx: Ctx,
    *,
    title: str,
    category: EventCategory,
    start_at: str,
    end_at: str | None,
    place_name: str,
    whatsapp_link: str | None = None,
) -> str:
    """Creates an event hosted by the member, who is going to it."""
    start = parse_iso(start_at)
    if start <= ctx.now:
        raise HTTPException(422, "Pick a time that hasn't passed yet.")
    end = parse_iso(end_at) if end_at else start + timedelta(hours=1)
    if end <= start:
        raise HTTPException(422, "The end time must be after the start.")
    me = await user_row(ctx.conn, ctx.user_id)
    assert me
    lat, lng = (me["home_lat"], me["home_lng"]) if me["home_lat"] is not None else DEFAULT_PLACE
    event_id = new_id("e")
    await ctx.conn.execute(
        "insert into events (id, host_id, title, category, start_at, end_at, place_name, lat, lng,"
        " language, whatsapp_link) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (
            event_id,
            ctx.user_id,
            title,
            category,
            start,
            end,
            place_name,
            lat,
            lng,
            me["language"],
            whatsapp_link,
        ),
    )
    await ctx.conn.execute(
        "insert into rsvps (event_id, user_id, status) values (%s, %s, 'going')",
        (event_id, ctx.user_id),
    )
    return event_id


@router.post("/events", status_code=201)
async def create_event(body: NewEvent, ctx: CtxDep) -> EventDetail:
    event_id = await insert_event(
        ctx,
        title=body.title,
        category=body.category,
        start_at=body.start_at,
        end_at=body.end_at,
        place_name=body.place_name,
        whatsapp_link=body.whatsapp_link,
    )
    return await event_detail(ctx, event_id)
