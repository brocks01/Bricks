"""Walks: upload a finished walk, its summary, history and weekly stats (docs/03 §4, §6)."""

import json
from datetime import date, timedelta
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from psycopg.types.json import Jsonb

from ..deps import Ctx, CtxDep, not_found
from ..ids import new_id
from ..repo import people, user_row
from ..schemas import (
    Split,
    WalkBests,
    WalkDay,
    WalkListItem,
    WalkPraise,
    WalkStats,
    WalkSummary,
    WalkUpload,
)
from ..timeutil import iso, local_date, parse_iso, week_start
from ..walks import HistoryWalk, process_walk

router = APIRouter(tags=["walks"])

MAX_POINTS = 20_000  # ~28 hours at one point every 5 s


def _list_item(row: dict[str, Any]) -> WalkListItem:
    return WalkListItem(
        id=row["id"],
        time_of_day=row["time_of_day"],
        start_place_name=row["start_place_name"],
        started_at=iso(row["started_at"]),
        distance_m=row["distance_m"],
        moving_s=row["moving_s"],
        steps=row["steps"],
        route_public_polyline=row["route_public_polyline"],
    )


async def _summary(ctx: Ctx, row: dict[str, Any]) -> WalkSummary:
    splits = row["splits"] if isinstance(row["splits"], list) else json.loads(row["splits"])
    praise = row["praise"] if isinstance(row["praise"], dict) else json.loads(row["praise"])
    return WalkSummary(
        **_list_item(row).model_dump(),
        ended_at=iso(row["ended_at"]),
        duration_s=row["duration_s"],
        avg_pace_s_per_km=row["avg_pace_s_per_km"],
        splits=[Split(**s) for s in splits],
        # The full route (with home) is only ever returned to the walker.
        route_polyline=row["route_polyline"] if row["user_id"] == ctx.user_id else None,
        walked_with=await people(ctx.conn, list(row["walked_with"])),
        praise=WalkPraise(**praise),
    )


async def save_walk(ctx: Ctx, upload: WalkUpload, walked_with: list[str]) -> dict[str, Any]:
    """Processes and stores a walk for the member (also used by the seed)."""
    started, ended = parse_iso(upload.started_at), parse_iso(upload.ended_at)
    if ended < started:
        raise HTTPException(422, "The walk ends before it starts.")
    if sum(len(s) for s in upload.segments) > MAX_POINTS:
        raise HTTPException(413, "That walk has too many points.")
    me = await user_row(ctx.conn, ctx.user_id)
    assert me
    history = await (
        await ctx.conn.execute(
            "select distance_m, started_at from walks where user_id = %s order by started_at desc",
            (ctx.user_id,),
        )
    ).fetchall()
    home = (me["home_lat"], me["home_lng"]) if me["home_lat"] is not None else None
    p = process_walk(
        upload.segments,
        started_at=started,
        ended_at=ended,
        home=home,
        area_name=me["area_name"] or "Singapore",
        history=[HistoryWalk(h["distance_m"], h["started_at"]) for h in history],
    )
    row = await (
        await ctx.conn.execute(
            "insert into walks (id, user_id, event_id, time_of_day, start_place_name, started_at,"
            " ended_at, distance_m, duration_s, moving_s, steps, avg_pace_s_per_km, splits,"
            " route_polyline, route_public_polyline, walked_with, praise)"
            " values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) returning *",
            (
                new_id("w"),
                ctx.user_id,
                upload.event_id,
                p.time_of_day,
                p.start_place_name,
                started,
                ended,
                p.distance_m,
                p.duration_s,
                p.moving_s,
                upload.steps,
                p.avg_pace_s_per_km,
                Jsonb([s.model_dump() for s in p.splits]),
                p.route_polyline,
                p.route_public_polyline,
                walked_with,
                Jsonb(p.praise.model_dump(exclude_none=True)),
            ),
        )
    ).fetchone()
    assert row
    return row


@router.post("/walks", status_code=201)
async def upload_walk(body: WalkUpload, ctx: CtxDep) -> WalkSummary:
    walked_with: list[str] = []
    if body.event_id:
        exists = await (
            await ctx.conn.execute("select 1 from events where id = %s", (body.event_id,))
        ).fetchone()
        if not exists:
            body = body.model_copy(update={"event_id": None})
        else:
            rows = await (
                await ctx.conn.execute(
                    "select user_id from rsvps where event_id = %s and status = 'going'"
                    " and user_id <> %s order by created_at, user_id",
                    (body.event_id, ctx.user_id),
                )
            ).fetchall()
            walked_with = [r["user_id"] for r in rows]
    return await _summary(ctx, await save_walk(ctx, body, walked_with))


@router.get("/walks/stats")
async def walk_stats(ctx: CtxDep, period: Literal["week", "month"] = "week") -> WalkStats:
    """S20 / S24: this week (a bar a day) or the last four weeks (a bar a week)."""
    today = local_date(ctx.now)
    monday = week_start(today)
    weeks = 1 if period == "week" else 4
    start = monday - timedelta(weeks=weeks - 1)
    before = start - timedelta(weeks=weeks)
    rows = await (
        await ctx.conn.execute(
            "select * from walks where user_id = %s order by started_at", (ctx.user_id,)
        )
    ).fetchall()
    dated = [(local_date(r["started_at"]), r) for r in rows]
    current = [r for d, r in dated if d >= start]
    previous = [r for d, r in dated if before <= d < start]

    if period == "week":
        buckets = [(monday + timedelta(days=i), timedelta(days=1)) for i in range(7)]
    else:
        buckets = [(start + timedelta(weeks=i), timedelta(weeks=1)) for i in range(weeks)]

    steps_by_day: dict[date, int] = {}
    for d, r in dated:
        steps_by_day[d] = steps_by_day.get(d, 0) + r["steps"]
    longest = max(rows, key=lambda r: r["distance_m"], default=None)
    month_start = today.replace(day=1)

    return WalkStats(
        period=period,
        distance_m=sum(r["distance_m"] for r in current),
        walks=len(current),
        moving_s=sum(r["moving_s"] for r in current),
        days=[
            WalkDay(
                date=b.isoformat(),
                distance_m=sum(r["distance_m"] for d, r in dated if b <= d < b + span),
            )
            for b, span in buckets
        ],
        previous_distance_m=sum(r["distance_m"] for r in previous),
        bests=WalkBests(
            longest_m=longest["distance_m"] if longest else 0,
            longest_walk_id=longest["id"] if longest else None,
            most_steps_day=max(steps_by_day.values(), default=0),
            walks_this_month=sum(1 for d, _ in dated if d >= month_start),
        ),
        items=[_list_item(r) for r in reversed(current)],
        last_walk=_list_item(rows[-1]) if rows else None,
    )


@router.get("/walks")
async def list_walks(ctx: CtxDep, period: Literal["week", "month"] = "week") -> list[WalkListItem]:
    since = ctx.now - timedelta(days=7 if period == "week" else 31)
    rows = await (
        await ctx.conn.execute(
            "select * from walks where user_id = %s and started_at >= %s order by started_at desc",
            (ctx.user_id, since),
        )
    ).fetchall()
    return [_list_item(r) for r in rows]


@router.get("/walks/{walk_id}")
async def get_walk(walk_id: str, ctx: CtxDep) -> WalkSummary:
    row = await (
        await ctx.conn.execute(
            "select * from walks where id = %s and (user_id = %s or visibility = 'circle')",
            (walk_id, ctx.user_id),
        )
    ).fetchone()
    if not row:
        raise not_found(f"walk {walk_id}")
    return await _summary(ctx, row)
