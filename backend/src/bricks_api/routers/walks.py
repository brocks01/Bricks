"""Walks: upload a finished walk, its summary, history and stats (docs/03 §4, §6), and
the group walk feed with Cheers (iteration 3.2, S19 / S23)."""

import json
from datetime import date, timedelta
from typing import Annotated, Any, Literal

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from psycopg.types.json import Jsonb

from ..deps import Ctx, CtxDep, not_found
from ..ids import new_id
from ..repo import people, person, user_row
from ..schemas import (
    GroupWalk,
    Split,
    VoiceClip,
    WalkBests,
    WalkCheer,
    WalkDay,
    WalkListItem,
    WalkPraise,
    WalkShare,
    WalkStats,
    WalkSummary,
    WalkUpload,
)
from ..storage import Storage, read_audio
from ..timeutil import iso, local_date, parse_iso, week_start
from ..walks import HistoryWalk, process_walk

router = APIRouter(tags=["walks"])

MAX_POINTS = 20_000  # ~28 hours at one point every 5 s
VOICE_CHEER_S = 10  # a voice cheer is short (docs/02b S19)
FEED_DAYS = 14
FEED_SIZE = 10
# Demo mode: when a member shares a walk, a Circle-mate (Lim, if he's one) cheers it a
# few seconds later, so the stage demo shows Share → cheer without a second phone
# (like the SOS helpers setting off, routers/sos.py).
DEMO_CHEER_AFTER_S = 5
DEMO_CHEERER = "u_lim"


async def _circle_mates(ctx: Ctx, other: str) -> bool:
    """True if the member and `other` are in at least one Circle together."""
    row = await (
        await ctx.conn.execute(
            "select 1 from circle_members a join circle_members b on a.circle_id = b.circle_id"
            " where a.user_id = %s and b.user_id = %s limit 1",
            (ctx.user_id, other),
        )
    ).fetchone()
    return row is not None


def _cheer(row: dict[str, Any]) -> WalkCheer:
    voice = (
        VoiceClip(audio_url=row["audio_url"], duration_s=row["duration_s"] or 0, transcript=None)
        if row["kind"] == "voice" and row["audio_url"]
        else None
    )
    return WalkCheer(
        id=row["id"],
        by=person(row, "by_"),
        kind=row["kind"],
        voice=voice,
        created_at=iso(row["created_at"]),
    )


async def _cheers(ctx: Ctx, walk_id: str) -> list[WalkCheer]:
    rows = await (
        await ctx.conn.execute(
            "select c.*, u.id as by_id, u.name as by_name, u.photo_url as by_photo_url"
            " from walk_cheers c join users u on u.id = c.from_user"
            # A demo cheer waits in the future until it "arrives".
            " where c.walk_id = %s and c.created_at <= %s order by c.created_at, c.id",
            (walk_id, ctx.now),
        )
    ).fetchall()
    return [_cheer(r) for r in rows]


async def _visible_walk(ctx: Ctx, walk_id: str) -> dict[str, Any]:
    """The walk if it's theirs, or shared by someone in one of their Circles."""
    row = await (await ctx.conn.execute("select * from walks where id = %s", (walk_id,))).fetchone()
    if not row:
        raise not_found(f"walk {walk_id}")
    mine = row["user_id"] == ctx.user_id
    if not mine and not (
        row["visibility"] == "circle" and await _circle_mates(ctx, row["user_id"])
    ):
        raise not_found(f"walk {walk_id}")
    return row


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
    cheers = await _cheers(ctx, row["id"])
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
        owner=(await people(ctx.conn, [row["user_id"]]))[0],
        visibility=row["visibility"],
        cheers=cheers,
        cheered_by_me=any(c.by.id == ctx.user_id and c.kind == "thumb" for c in cheers),
        can_cheer=row["user_id"] != ctx.user_id and row["visibility"] == "circle",
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
    return await _summary(ctx, await _visible_walk(ctx, walk_id))


@router.patch("/walks/{walk_id}")
async def share_walk(walk_id: str, body: WalkShare, ctx: CtxDep) -> WalkSummary:
    """S23 "Share with my Circle" (or stop sharing). Only the walker can."""
    row = await (
        await ctx.conn.execute(
            "update walks set visibility = %s where id = %s and user_id = %s returning *",
            (body.visibility, walk_id, ctx.user_id),
        )
    ).fetchone()
    if not row:
        raise not_found(f"walk {walk_id}")
    if body.visibility == "circle" and ctx.settings.demo_mode:
        await _demo_cheer(ctx, walk_id)
    return await _summary(ctx, row)


async def _demo_cheer(ctx: Ctx, walk_id: str) -> None:
    """Queues a thumbs-up from a Circle-mate, shown DEMO_CHEER_AFTER_S from now."""
    mate = await (
        await ctx.conn.execute(
            "select b.user_id from circle_members a"
            " join circle_members b on b.circle_id = a.circle_id"
            " where a.user_id = %s and b.user_id <> %s"
            " order by (b.user_id = %s) desc, b.user_id limit 1",
            (ctx.user_id, ctx.user_id, DEMO_CHEERER),
        )
    ).fetchone()
    if not mate:
        return
    await ctx.conn.execute(
        "insert into walk_cheers (id, walk_id, from_user, kind, created_at)"
        " values (%s, %s, %s, 'thumb', %s)"
        " on conflict (walk_id, from_user) where kind = 'thumb' do nothing",
        (
            new_id("c"),
            walk_id,
            mate["user_id"],
            ctx.now + timedelta(seconds=DEMO_CHEER_AFTER_S),
        ),
    )


@router.post("/walks/{walk_id}/cheers", status_code=201)
async def cheer_walk(
    walk_id: str,
    request: Request,
    ctx: CtxDep,
    kind: Annotated[Literal["thumb", "voice"], Form()] = "thumb",
    duration_s: Annotated[float | None, Form(ge=0, le=VOICE_CHEER_S + 1)] = None,
    audio: Annotated[UploadFile | None, File()] = None,
) -> WalkSummary:
    """Cheer someone's shared walk: a tap (once) or a short voice note."""
    row = await _visible_walk(ctx, walk_id)
    if row["user_id"] == ctx.user_id or row["visibility"] != "circle":
        raise HTTPException(403, "You can cheer walks people in your Circles share.")
    audio_url = None
    if kind == "voice":
        if audio is None:
            raise HTTPException(422, "A voice cheer needs its recording.")
        storage: Storage = request.app.state.storage
        data, content_type = await read_audio(audio)
        audio_url = await storage.put(f"cheers/{ctx.user_id}", data, content_type)
    await ctx.conn.execute(
        "insert into walk_cheers (id, walk_id, from_user, kind, audio_url, duration_s, created_at)"
        " values (%s, %s, %s, %s, %s, %s, %s)"
        # Once per person; tapping before a queued demo cheer arrives shows it now.
        " on conflict (walk_id, from_user) where kind = 'thumb'"
        " do update set created_at = least(walk_cheers.created_at, excluded.created_at)",
        (
            new_id("c"),
            walk_id,
            ctx.user_id,
            kind,
            audio_url,
            duration_s if kind == "voice" else None,
            ctx.now,
        ),
    )
    return await _summary(ctx, row)


@router.get("/circles/{circle_id}/walks")
async def circle_walks(circle_id: str, ctx: CtxDep) -> list[GroupWalk]:
    """S19 Recent group walks: what members shared in the last two weeks. Members only."""
    member = await (
        await ctx.conn.execute(
            "select 1 from circle_members where circle_id = %s and user_id = %s",
            (circle_id, ctx.user_id),
        )
    ).fetchone()
    if not member:
        return []
    rows = await (
        await ctx.conn.execute(
            "select w.*,"
            " (select count(*) from walk_cheers c where c.walk_id = w.id"
            "   and c.created_at <= %(now)s) as cheer_count,"
            " exists(select 1 from walk_cheers c where c.walk_id = w.id and c.kind = 'thumb'"
            "   and c.from_user = %(me)s) as cheered_by_me"
            " from walks w join circle_members m on m.user_id = w.user_id and m.circle_id = %(c)s"
            " where w.visibility = 'circle' and w.started_at >= %(since)s"
            " order by w.started_at desc limit %(n)s",
            {
                "me": ctx.user_id,
                "now": ctx.now,
                "c": circle_id,
                "since": ctx.now - timedelta(days=FEED_DAYS),
                "n": FEED_SIZE,
            },
        )
    ).fetchall()
    out = []
    for r in rows:
        walkers = await people(ctx.conn, [r["user_id"], *r["walked_with"]])
        out.append(
            GroupWalk(
                id=r["id"],
                owner=walkers[0],
                time_of_day=r["time_of_day"],
                start_place_name=r["start_place_name"],
                started_at=iso(r["started_at"]),
                distance_m=r["distance_m"],
                route_public_polyline=r["route_public_polyline"],
                walkers=walkers,
                cheer_count=r["cheer_count"],
                cheered_by_me=r["cheered_by_me"],
                is_mine=r["user_id"] == ctx.user_id,
            )
        )
    return out
