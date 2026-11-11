"""Circles: mine and near, detail, join and leave (docs/03 §4)."""

from typing import Any

from fastapi import APIRouter

from ..deps import Ctx, CtxDep, not_found
from ..repo import event_summary, people, upcoming_events
from ..schemas import CircleDetail, CircleList, CircleSummary, NextEventRef
from ..timeutil import iso

router = APIRouter(tags=["circles"])

CIRCLE_SELECT = """
select c.*,
  c.extra_members + (select count(*) from circle_members m where m.circle_id = c.id)
    as member_count,
  exists(select 1 from circle_members m where m.circle_id = c.id and m.user_id = %(me)s)
    as is_member,
  n.id as next_id, n.title as next_title, n.start_at as next_start_at
from circles c
left join lateral (
  select e.id, e.title, e.start_at from events e
  where e.circle_id = c.id and e.status = 'active' and e.start_at > %(now)s
  order by e.start_at limit 1
) n on true
"""


def _summary(row: dict[str, Any]) -> CircleSummary:
    return CircleSummary(
        id=row["id"],
        name=row["name"],
        type=row["type"],
        photo_url=row["photo_url"],
        member_count=int(row["member_count"]),
        whatsapp_link=row["whatsapp_link"],
        is_member=bool(row["is_member"]),
        next_event=NextEventRef(
            id=row["next_id"], title=row["next_title"], start_at=iso(row["next_start_at"])
        )
        if row["next_id"]
        else None,
    )


async def _circle(ctx: Ctx, circle_id: str) -> dict[str, Any]:
    row = await (
        await ctx.conn.execute(
            CIRCLE_SELECT + " where c.id = %(id)s",
            {"me": ctx.user_id, "now": ctx.now, "id": circle_id},
        )
    ).fetchone()
    if not row:
        raise not_found(f"circle {circle_id}")
    return row


@router.get("/circles")
async def list_circles(ctx: CtxDep) -> CircleList:
    rows = await (
        await ctx.conn.execute(
            CIRCLE_SELECT + " order by c.name",
            {"me": ctx.user_id, "now": ctx.now},
        )
    ).fetchall()
    all_ = [_summary(r) for r in rows]
    return CircleList(
        mine=[c for c in all_ if c.is_member], near=[c for c in all_ if not c.is_member]
    )


@router.get("/circles/{circle_id}")
async def get_circle(circle_id: str, ctx: CtxDep) -> CircleDetail:
    row = await _circle(ctx, circle_id)
    members = await (
        await ctx.conn.execute(
            "select user_id from circle_members where circle_id = %s"
            " order by (user_id = %s) desc, joined_at, user_id",
            (circle_id, row["captain_id"]),
        )
    ).fetchall()
    captain = await people(ctx.conn, [row["captain_id"]])
    upcoming = await upcoming_events(
        ctx.conn, ctx.user_id, ctx.now, "e.circle_id = %(circle)s", {"circle": circle_id}
    )
    return CircleDetail(
        **_summary(row).model_dump(),
        description=row["description"],
        captain=captain[0],
        members=await people(ctx.conn, [m["user_id"] for m in members]),
        upcoming=[event_summary(e) for e in upcoming],
    )


@router.post("/circles/{circle_id}/join")
async def join_circle(circle_id: str, ctx: CtxDep) -> CircleSummary:
    await _circle(ctx, circle_id)
    await ctx.conn.execute(
        "insert into circle_members (circle_id, user_id) values (%s, %s) on conflict do nothing",
        (circle_id, ctx.user_id),
    )
    return _summary(await _circle(ctx, circle_id))


@router.delete("/circles/{circle_id}/join")
async def leave_circle(circle_id: str, ctx: CtxDep) -> CircleSummary:
    await _circle(ctx, circle_id)
    await ctx.conn.execute(
        "delete from circle_members where circle_id = %s and user_id = %s",
        (circle_id, ctx.user_id),
    )
    return _summary(await _circle(ctx, circle_id))
