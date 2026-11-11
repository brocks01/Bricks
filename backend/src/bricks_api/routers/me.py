"""The member: profile basics, sign-in, voice intro and Safe Circle (docs/03 §4)."""

from typing import Annotated, Any, Literal

from fastapi import APIRouter, File, Form, Request, UploadFile

from ..deps import Ctx, CtxDep
from ..ids import new_id
from ..repo import user_row
from ..schemas import (
    Me,
    MeUpdate,
    Prefill,
    SafeCircleMember,
    SafeCirclePut,
    SignInIn,
    SignInResult,
    VoiceClip,
)
from ..storage import Storage, read_audio

router = APIRouter(tags=["me"])


def _me(row: dict[str, Any]) -> Me:
    return Me(
        id=row["id"],
        name=row["name"],
        preferred_name=row["preferred_name"],
        phone=row["phone"],
        language=row["language"],
        channel_pref=row["channel_pref"],
        area_name=row["area_name"],
        singpass_verified=row["singpass_verified"],
        simple_mode=row["simple_mode"],
        onboarded_by=row["onboarded_by"],
        status=row["status"],
        interests=list(row["interests"]),
    )


async def _load(ctx: Ctx) -> dict[str, Any]:
    row = await user_row(ctx.conn, ctx.user_id)
    assert row, "the signed-in member always has a row"
    return row


@router.get("/me")
async def get_me(ctx: CtxDep) -> Me:
    return _me(await _load(ctx))


@router.patch("/me")
async def update_me(body: MeUpdate, ctx: CtxDep) -> Me:
    fields = body.model_dump(exclude_unset=True)
    if "name" in fields and fields["name"] is None:
        del fields["name"]  # a name can't be cleared
    if fields:
        sets = ", ".join(f"{k} = %({k})s" for k in fields)
        await ctx.conn.execute(
            f"update users set {sets} where id = %(id)s",
            {**fields, "id": ctx.user_id},
        )
    if body.language:
        # The languages they speak (shown on their profile) include the app's language.
        await ctx.conn.execute(
            "update users set languages = array_append(languages, %(l)s)"
            " where id = %(id)s and not (%(l)s = any(languages))",
            {"l": body.language, "id": ctx.user_id},
        )
    return _me(await _load(ctx))


@router.post("/auth/{method}")
async def sign_in(
    method: Literal["singpass", "google", "phone"], ctx: CtxDep, body: SignInIn | None = None
) -> SignInResult:
    """What we can fill in after sign-in. The session itself is Supabase's (or the demo's)."""
    row = await _load(ctx)
    if method == "singpass":
        # Singpass is a labelled mock: a verified sample profile (MyInfo comes later).
        await ctx.conn.execute(
            "update users set singpass_verified = true where id = %s", (ctx.user_id,)
        )
        return SignInResult(
            prefill=Prefill(name=row["name"], area_name=row["area_name"] or "Bishan"),
            singpass_verified=True,
        )
    if method == "phone" and body and body.phone and not row["phone"]:
        await ctx.conn.execute(
            "update users set phone = %s where id = %s and not exists"
            " (select 1 from users where phone = %s)",
            (body.phone, ctx.user_id, body.phone),
        )
    return SignInResult(
        prefill=Prefill(name=row["name"] if method == "google" else None, area_name=None),
        singpass_verified=row["singpass_verified"],
    )


@router.put("/me/intro")
async def save_intro(
    request: Request,
    ctx: CtxDep,
    audio: Annotated[UploadFile, File()],
    duration_s: Annotated[float, Form(ge=0, le=300)],
) -> VoiceClip:
    storage: Storage = request.app.state.storage
    data, content_type = await read_audio(audio)
    url = await storage.put(f"intro/{ctx.user_id}", data, content_type)
    await ctx.conn.execute(
        "update users set intro_audio_url = %s, intro_duration_s = %s, intro_transcript = null"
        " where id = %s",
        (url, duration_s, ctx.user_id),
    )
    await ctx.conn.execute(
        "insert into user_badges (user_id, key, earned_at) values (%s, 'storyteller', %s)"
        " on conflict do nothing",
        (ctx.user_id, ctx.now),
    )
    return VoiceClip(audio_url=url, duration_s=duration_s, transcript=None)


# ---------- Safe Circle ----------


async def safe_circle(ctx: Ctx, user_id: str | None = None) -> list[SafeCircleMember]:
    rows = await (
        await ctx.conn.execute(
            "select id, name, phone, is_family from safe_circle where user_id = %s"
            " order by order_no",
            (user_id or ctx.user_id,),
        )
    ).fetchall()
    return [SafeCircleMember(**r) for r in rows]


@router.get("/safe-circle")
async def get_safe_circle(ctx: CtxDep) -> list[SafeCircleMember]:
    return await safe_circle(ctx)


@router.put("/safe-circle")
async def set_safe_circle(body: SafeCirclePut, ctx: CtxDep) -> list[SafeCircleMember]:
    current = await safe_circle(ctx)
    await ctx.conn.execute("delete from safe_circle where user_id = %s", (ctx.user_id,))
    for i, m in enumerate(body.members):
        # Keep ids stable for people already in the circle (same phone).
        known = next((s for s in current if s.phone and s.phone == m.phone), None)
        helper = (
            await (
                await ctx.conn.execute("select id from users where phone = %s", (m.phone,))
            ).fetchone()
            if m.phone
            else None
        )
        await ctx.conn.execute(
            "insert into safe_circle (id, user_id, helper_id, name, phone, is_family, order_no)"
            " values (%s, %s, %s, %s, %s, %s, %s)",
            (
                known.id if known else new_id("sc"),
                ctx.user_id,
                helper["id"] if helper else None,
                m.name,
                m.phone,
                m.is_family,
                i,
            ),
        )
    return await safe_circle(ctx)
