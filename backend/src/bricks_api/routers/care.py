"""Health Card (S27), Life Stories (S35) and the family overview (S10): 3.2 feature 6.

A member's health card and stories are theirs. Their accepted family can read them,
edit the health card, and ask for stories ("Ask Grandpa"). The overview shows family
only what the member shares (family_links.can_view_report). Organisation staff
never see any of it.
"""

import dataclasses
from typing import Annotated, Any

from fastapi import APIRouter, File, Form, Request, Response, UploadFile

from ..deps import Ctx, CtxDep, not_found
from ..ids import new_id
from ..repo import event_summary, people, upcoming_events
from ..schemas import (
    FamilyOverview,
    HealthCard,
    HealthCardIn,
    Language,
    Stories,
    Story,
    StoryQuestion,
    StoryQuestionIn,
    VoiceClip,
)
from ..storage import Storage, read_audio
from ..timeutil import at_local, iso, iso_opt, local_date, week_start
from .me import safe_circle
from .thrive import streak

router = APIRouter(tags=["care"])

# A life story can take a while to tell: up to 3 minutes.
STORY_SECONDS = 180


async def _family_of(ctx: Ctx, senior_id: str, *, report: bool = False) -> None:
    """The member is the senior's accepted family (and, for `report`, the senior shares
    their week). Anyone else gets a 404, so nothing about the senior leaks."""
    row = await (
        await ctx.conn.execute(
            "select can_view_report from family_links where senior_id = %s and family_id = %s"
            " and status = 'accepted'",
            (senior_id, ctx.user_id),
        )
    ).fetchone()
    if not row or (report and not row["can_view_report"]):
        raise not_found(f"family member {senior_id}")


def _as(ctx: Ctx, user_id: str) -> Ctx:
    return dataclasses.replace(ctx, user_id=user_id)


# ---------- Health Card ----------


async def _health_card(ctx: Ctx, user_id: str) -> HealthCard:
    row = await (
        await ctx.conn.execute("select * from health_cards where user_id = %s", (user_id,))
    ).fetchone()
    by = await people(ctx.conn, [row["updated_by"]]) if row and row["updated_by"] else []
    return HealthCard(
        blood_group=row["blood_group"] if row else None,
        conditions=row["conditions"] if row else "",
        medicines=row["medicines"] if row else "",
        emergency_contacts=await safe_circle(ctx, user_id),
        updated_by=by[0] if by else None,
        updated_at=iso_opt(row["updated_at"]) if row else None,
    )


async def _save_health_card(ctx: Ctx, user_id: str, body: HealthCardIn) -> HealthCard:
    await ctx.conn.execute(
        "insert into health_cards (user_id, blood_group, conditions, medicines, updated_by,"
        " updated_at) values (%(u)s, %(b)s, %(c)s, %(m)s, %(by)s, %(now)s)"
        " on conflict (user_id) do update set blood_group = %(b)s, conditions = %(c)s,"
        " medicines = %(m)s, updated_by = %(by)s, updated_at = %(now)s",
        {
            "u": user_id,
            "b": body.blood_group,
            "c": body.conditions.strip(),
            "m": body.medicines.strip(),
            "by": ctx.user_id,
            "now": ctx.now,
        },
    )
    return await _health_card(ctx, user_id)


@router.get("/health-card")
async def my_health_card(ctx: CtxDep) -> HealthCard:
    return await _health_card(ctx, ctx.user_id)


@router.put("/health-card")
async def save_my_health_card(body: HealthCardIn, ctx: CtxDep) -> HealthCard:
    return await _save_health_card(ctx, ctx.user_id, body)


@router.get("/family/seniors/{senior_id}/health-card")
async def parent_health_card(senior_id: str, ctx: CtxDep) -> HealthCard:
    await _family_of(ctx, senior_id)
    return await _health_card(ctx, senior_id)


@router.put("/family/seniors/{senior_id}/health-card")
async def save_parent_health_card(senior_id: str, body: HealthCardIn, ctx: CtxDep) -> HealthCard:
    """Family can edit it (S27): often they know the medicines best."""
    await _family_of(ctx, senior_id)
    return await _save_health_card(ctx, senior_id, body)


# ---------- Life Stories ----------


async def _stories(ctx: Ctx, user_id: str) -> Stories:
    rows = await (
        await ctx.conn.execute(
            "select * from stories where user_id = %s order by created_at desc", (user_id,)
        )
    ).fetchall()
    questions = await (
        await ctx.conn.execute(
            "select * from story_questions where senior_id = %s and story_id is null"
            " order by created_at",
            (user_id,),
        )
    ).fetchall()
    askers = {
        p.id: p
        for p in await people(
            ctx.conn,
            [r["asked_by"] for r in [*rows, *questions] if r["asked_by"]],
        )
    }
    return Stories(
        stories=[_story(r, askers) for r in rows],
        questions=[
            StoryQuestion(
                id=q["id"],
                text=q["text"],
                asked_by=askers[q["asked_by"]],
                created_at=iso(q["created_at"]),
            )
            for q in questions
            if q["asked_by"] in askers
        ],
    )


def _story(row: dict[str, Any], askers: dict[str, Any]) -> Story:
    return Story(
        id=row["id"],
        title=row["title"],
        voice=VoiceClip(
            audio_url=row["audio_url"], duration_s=row["duration_s"], transcript=row["transcript"]
        ),
        prompt_text=row["prompt_text"],
        asked_by=askers.get(row["asked_by"]) if row["asked_by"] else None,
        created_at=iso(row["created_at"]),
    )


@router.get("/stories")
async def my_stories(ctx: CtxDep) -> Stories:
    return await _stories(ctx, ctx.user_id)


@router.post("/stories", status_code=201)
async def record_story(
    request: Request,
    ctx: CtxDep,
    title: Annotated[str, Form(min_length=1, max_length=120)],
    duration_s: Annotated[float, Form(gt=0, le=STORY_SECONDS + 1)],
    audio: Annotated[UploadFile, File()],
    language: Annotated[Language, Form()] = "en",
    prompt_text: Annotated[str | None, Form(max_length=200)] = None,
    question_id: Annotated[str | None, Form(max_length=40)] = None,
) -> Stories:
    """A story they recorded, maybe answering a question their family asked."""
    asked_by = None
    if question_id:
        q = await (
            await ctx.conn.execute(
                "select * from story_questions where id = %s and senior_id = %s",
                (question_id, ctx.user_id),
            )
        ).fetchone()
        if not q:
            raise not_found(f"question {question_id}")
        asked_by, prompt_text = q["asked_by"], q["text"]
    storage: Storage = request.app.state.storage
    data, content_type = await read_audio(audio)
    url = await storage.put(f"stories/{ctx.user_id}", data, content_type)
    story_id = new_id("st")
    await ctx.conn.execute(
        "insert into stories (id, user_id, title, audio_url, duration_s, language, prompt_text,"
        " asked_by, created_at) values (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (
            story_id,
            ctx.user_id,
            title.strip(),
            url,
            duration_s,
            language,
            prompt_text,
            asked_by,
            ctx.now,
        ),
    )
    if question_id:
        await ctx.conn.execute(
            "update story_questions set story_id = %s where id = %s", (story_id, question_id)
        )
    return await _stories(ctx, ctx.user_id)


@router.delete("/stories/{story_id}", status_code=204)
async def delete_story(story_id: str, ctx: CtxDep) -> Response:
    row = await (
        await ctx.conn.execute(
            "delete from stories where id = %s and user_id = %s returning id",
            (story_id, ctx.user_id),
        )
    ).fetchone()
    if not row:
        raise not_found(f"story {story_id}")
    return Response(status_code=204)


@router.get("/family/seniors/{senior_id}/stories")
async def parent_stories(senior_id: str, ctx: CtxDep) -> Stories:
    await _family_of(ctx, senior_id)
    return await _stories(ctx, senior_id)


@router.post("/family/seniors/{senior_id}/questions", status_code=201)
async def ask_for_story(senior_id: str, body: StoryQuestionIn, ctx: CtxDep) -> Stories:
    """ "Ask Grandpa": the question waits on their Life Stories page."""
    await _family_of(ctx, senior_id)
    await ctx.conn.execute(
        "insert into story_questions (id, senior_id, asked_by, text, created_at)"
        " values (%s, %s, %s, %s, %s)",
        (new_id("q"), senior_id, ctx.user_id, body.text.strip(), ctx.now),
    )
    return await _stories(ctx, senior_id)


# ---------- Family overview (S10) ----------


@router.get("/family/seniors/{senior_id}/overview")
async def parent_overview(senior_id: str, ctx: CtxDep) -> FamilyOverview:
    await _family_of(ctx, senior_id, report=True)
    senior = _as(ctx, senior_id)
    # Monday midnight in Singapore, the same week the member's own stats use.
    monday = at_local(week_start(local_date(ctx.now)), 0)
    walks = await (
        await ctx.conn.execute(
            "select count(*) as n, coalesce(sum(distance_m), 0) as m from walks"
            " where user_id = %s and started_at >= %s",
            (senior_id, monday),
        )
    ).fetchone()
    assert walks
    going = await upcoming_events(
        ctx.conn,
        senior_id,
        ctx.now,
        "exists(select 1 from rsvps r where r.event_id = e.id and r.user_id = %(me)s"
        " and r.status = 'going')",
    )
    stories = await (
        await ctx.conn.execute("select count(*) as n from stories where user_id = %s", (senior_id,))
    ).fetchone()
    assert stories
    name = (await people(ctx.conn, [senior_id]))[0].name
    return FamilyOverview(
        name=name,
        walks_this_week=walks["n"],
        distance_m_this_week=walks["m"],
        checkin_streak=await streak(senior),
        next_event=event_summary(going[0]) if going else None,
        stories=stories["n"],
    )
