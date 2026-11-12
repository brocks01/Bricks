"""SOS: tell the Safe Circle, show who's coming, resolve (docs/03 §4, §7).

Telling people (push, WhatsApp, calls) is the notifier's job (iteration 2.1/2.2,
with the WhatsApp and voice lanes). Here we record who was told and their replies.
In demo mode the first two helpers "set off" after 3 s and 6 s, so the stage
demo shows the whole story without real phones.
"""

from typing import Any

from fastapi import APIRouter, HTTPException, Response

from ..deps import Ctx, CtxDep, not_found
from ..geo import haversine
from ..ids import new_id
from ..repo import user_row
from ..schemas import SosAlert, SosHelper, SosIn, SosPatch, SosRespond
from ..timeutil import iso

router = APIRouter(tags=["sos"])

DEMO_SETS_OFF_AFTER_S = [3, 6]


async def _alert(ctx: Ctx, sos_id: str) -> SosAlert:
    row = await (
        await ctx.conn.execute(
            "select * from sos_events where id = %s and user_id = %s", (sos_id, ctx.user_id)
        )
    ).fetchone()
    if not row:
        raise not_found(f"sos {sos_id}")
    responses = await (
        await ctx.conn.execute(
            "select * from sos_responses where sos_id = %s order by order_no", (sos_id,)
        )
    ).fetchall()
    elapsed = (ctx.now - row["created_at"]).total_seconds()

    def status(r: dict[str, Any], i: int) -> Any:
        if r["status"] != "notified" or not ctx.settings.demo_mode:
            return r["status"]
        after = DEMO_SETS_OFF_AFTER_S[i] if i < len(DEMO_SETS_OFF_AFTER_S) else None
        return "on_way" if after is not None and elapsed >= after else "notified"

    helpers = [
        SosHelper(
            id=r["helper_key"],
            name=r["name"],
            is_family=r["is_family"],
            distance_m=r["distance_m"],
            status=status(r, i),
        )
        for i, r in enumerate(responses)
    ]
    state = row["status"]
    if state in ("open", "helper_coming"):
        state = "helper_coming" if any(h.status != "notified" for h in helpers) else "open"
    return SosAlert(id=row["id"], status=state, created_at=iso(row["created_at"]), helpers=helpers)


@router.post("/sos", status_code=201)
async def trigger_sos(body: SosIn, ctx: CtxDep) -> SosAlert:
    me = await user_row(ctx.conn, ctx.user_id)
    assert me
    sos_id = new_id("s")
    await ctx.conn.execute(
        "insert into sos_events (id, user_id, trigger, lat, lng, created_at)"
        " values (%s, %s, %s, %s, %s, %s)",
        (sos_id, ctx.user_id, body.trigger, body.lat, body.lng, ctx.now),
    )
    # Where they are now, or home if the phone couldn't tell us.
    here = (body.lat, body.lng) if body.lat is not None and body.lng is not None else None
    here = here or ((me["home_lat"], me["home_lng"]) if me["home_lat"] is not None else None)
    circle = await (
        await ctx.conn.execute(
            "select s.*, u.home_lat, u.home_lng from safe_circle s"
            " left join users u on u.id = s.helper_id"
            " where s.user_id = %s order by s.order_no",
            (ctx.user_id,),
        )
    ).fetchall()
    for h in circle:
        distance = None
        # Family may live far away; neighbours show how close they are.
        if not h["is_family"] and here and h["home_lat"] is not None:
            distance = round(haversine(here[0], here[1], h["home_lat"], h["home_lng"]) / 50) * 50
        await ctx.conn.execute(
            "insert into sos_responses (sos_id, helper_key, name, is_family, distance_m, order_no,"
            " at) values (%s, %s, %s, %s, %s, %s, %s)",
            (sos_id, h["id"], h["name"], h["is_family"], distance, h["order_no"], ctx.now),
        )
    return await _alert(ctx, sos_id)


@router.get("/sos/active")
async def active_sos(ctx: CtxDep) -> SosAlert | None:
    """Their alert that is still going (started anywhere: app, WhatsApp, a call), so
    the app can show who's coming when it opens. Null when there isn't one."""
    row = await (
        await ctx.conn.execute(
            "select id from sos_events where user_id = %s and status in ('open', 'helper_coming')"
            " and created_at > %s - interval '2 hours' order by created_at desc limit 1",
            (ctx.user_id, ctx.now),
        )
    ).fetchone()
    return await _alert(ctx, row["id"]) if row else None


@router.get("/sos/{sos_id}")
async def get_sos(sos_id: str, ctx: CtxDep) -> SosAlert:
    return await _alert(ctx, sos_id)


@router.patch("/sos/{sos_id}", status_code=204)
async def update_sos(sos_id: str, body: SosPatch, ctx: CtxDep) -> Response:
    result = await ctx.conn.execute(
        "update sos_events set status = %s, resolved_at = %s where id = %s and user_id = %s",
        (body.status, ctx.now, sos_id, ctx.user_id),
    )
    if result.rowcount == 0:
        raise not_found(f"sos {sos_id}")
    return Response(status_code=204)


@router.post("/sos/{sos_id}/respond", status_code=204)
async def respond(sos_id: str, body: SosRespond, ctx: CtxDep) -> Response:
    """A helper who is a member says "on my way" (or "I'm here")."""
    result = await ctx.conn.execute(
        "update sos_responses r set status = %s, at = %s from safe_circle s, sos_events e"
        " where r.sos_id = %s and s.id = r.helper_key and s.helper_id = %s"
        " and e.id = r.sos_id and e.status in ('open', 'helper_coming')",
        (body.status, ctx.now, sos_id, ctx.user_id),
    )
    if result.rowcount == 0:
        raise HTTPException(404, "This alert isn't open for you.")
    await ctx.conn.execute(
        "update sos_events set status = 'helper_coming' where id = %s and status = 'open'",
        (sos_id,),
    )
    return Response(status_code=204)
