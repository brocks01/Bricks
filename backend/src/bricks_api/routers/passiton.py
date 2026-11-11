"""Pass It On: profiles, skill offers and thank-yous (docs/03 §4, app iteration 1.3)."""

from datetime import datetime
from typing import Annotated, Any, Literal

from fastapi import APIRouter, File, Form, HTTPException, Request, Response, UploadFile

from ..deps import Ctx, CtxDep, not_found
from ..ids import new_id
from ..repo import person, user_row
from ..schemas import (
    Badge,
    BadgeKey,
    EventCategory,
    Given,
    NewSkillOffer,
    PersonSummary,
    Profile,
    SkillOffer,
    SkillRef,
    ThanksPrompt,
    ThankYou,
    VoiceClip,
)
from ..storage import Storage, read_audio
from ..timeutil import iso, iso_opt
from .events import insert_event

router = APIRouter(tags=["pass-it-on"])

# Tag -> event category, for skill sessions that become Kampung events (PO-4).
CATEGORY_FOR_TAG: dict[str, EventCategory] = {
    "walking": "walk",
    "taichi": "exercise",
    "cooking": "cooking",
    "chess": "games",
    "music": "music",
    "gardening": "gardening",
    "teaching": "class",
    "technology": "class",
}
BADGE_ORDER: list[BadgeKey] = ["first_session", "kind_neighbour", "ten_thanks", "storyteller"]
# How long after an event we still ask "say thank you?".
THANKS_WINDOW = "7 days"
# An event's end, or an hour after it starts when no end was given.
EVENT_END = "coalesce(e.end_at, e.start_at + interval '1 hour')"


def _skill(row: dict[str, Any]) -> SkillOffer:
    return SkillOffer(
        id=row["id"],
        title=row["title"],
        tags=list(row["tags"]),
        start_at=iso_opt(row["start_at"]),
        place_name=row["place_name"],
        is_paid=row["is_paid"],
        event_id=row["event_id"],
        endorsement_count=int(row["endorsement_count"]),
    )


SKILL_SELECT = """
select s.*, (select count(*) from endorsements n where n.skill_offer_id = s.id)
  as endorsement_count
from skill_offers s
"""

THANKS_SELECT = """
select n.*, f.id as f_id, f.name as f_name, f.photo_url as f_photo_url,
  s.title as skill_title, e.title as event_title
from endorsements n
join users f on f.id = n.from_user
left join skill_offers s on s.id = n.skill_offer_id
left join events e on e.id = n.event_id
"""


def _thank_you(row: dict[str, Any]) -> ThankYou:
    voice = (
        VoiceClip(
            audio_url=row["audio_url"],
            duration_s=row["duration_s"] or 0,
            transcript=row["transcript"],
        )
        if row["kind"] == "voice" and row["audio_url"]
        else None
    )
    return ThankYou(
        id=row["id"],
        from_=person(row, "f_"),
        kind=row["kind"],
        voice=voice,
        skill=SkillRef(id=row["skill_offer_id"], title=row["skill_title"])
        if row["skill_offer_id"]
        else None,
        event_title=row["event_title"],
        created_at=iso(row["created_at"]),
    )


async def _badges(ctx: Ctx, user_id: str, row: dict[str, Any]) -> list[Badge]:
    earned: dict[str, datetime] = {
        b["key"]: b["earned_at"]
        for b in await (
            await ctx.conn.execute(
                "select key, earned_at from user_badges where user_id = %s", (user_id,)
            )
        ).fetchall()
    }
    first = await (
        await ctx.conn.execute(
            f"select min({EVENT_END}) as at from events e where e.host_id = %(u)s"
            f" and e.status = 'active' and {EVENT_END} < %(now)s and exists("
            " select 1 from rsvps r where r.event_id = e.id and r.status = 'going'"
            " and r.user_id <> %(u)s)",
            {"u": user_id, "now": ctx.now},
        )
    ).fetchone()
    if first and first["at"]:
        earned.setdefault("first_session", first["at"])
    tenth = await (
        await ctx.conn.execute(
            "select created_at from endorsements where to_user = %s"
            " order by created_at offset 9 limit 1",
            (user_id,),
        )
    ).fetchone()
    if tenth:
        earned.setdefault("ten_thanks", tenth["created_at"])
    if row["intro_audio_url"] and "storyteller" not in earned:
        earned["storyteller"] = row["created_at"]
    return [Badge(key=k, earned_at=iso(earned[k])) for k in BADGE_ORDER if k in earned]


@router.get("/users/{user_id}/profile")
async def get_profile(user_id: str, ctx: CtxDep) -> Profile:
    uid = ctx.user_id if user_id == "me" else user_id
    row = await user_row(ctx.conn, uid)
    if not row or (row["status"] != "active" and uid != ctx.user_id):
        raise not_found(f"user {user_id}")
    given = await (
        await ctx.conn.execute(
            f"select count(distinct e.id) as sessions, count(distinct r.user_id) as people"
            f" from events e join rsvps r on r.event_id = e.id and r.status = 'going'"
            f" and r.user_id <> e.host_id"
            f" where e.host_id = %(u)s and e.status = 'active' and {EVENT_END} < %(now)s",
            {"u": uid, "now": ctx.now},
        )
    ).fetchone()
    assert given
    skills = await (
        await ctx.conn.execute(SKILL_SELECT + " where s.user_id = %s order by s.created_at", (uid,))
    ).fetchall()
    thanks = await (
        await ctx.conn.execute(
            THANKS_SELECT + " where n.to_user = %s order by n.created_at desc", (uid,)
        )
    ).fetchall()
    intro = (
        VoiceClip(
            audio_url=row["intro_audio_url"],
            duration_s=row["intro_duration_s"] or 0,
            transcript=row["intro_transcript"],
        )
        if row["intro_audio_url"]
        else None
    )
    return Profile(
        id=row["id"],
        name=row["name"],
        preferred_name=row["preferred_name"],
        photo_url=row["photo_url"],
        area_name=row["area_name"],
        languages=list(row["languages"]),
        singpass_verified=row["singpass_verified"],
        intro=intro,
        ask_me_about=list(row["interests"]),
        given=Given(
            sessions_taught=given["sessions"],
            people_helped=given["people"],
            thank_yous=len(thanks),
        ),
        skills=[_skill(s) for s in skills],
        badges=await _badges(ctx, uid, row),
        thank_yous=[_thank_you(t) for t in thanks],
    )


# ---------- Skills ----------


@router.get("/skills")
async def list_skills(ctx: CtxDep) -> list[SkillOffer]:
    rows = await (
        await ctx.conn.execute(
            SKILL_SELECT + " where s.user_id = %s order by s.created_at", (ctx.user_id,)
        )
    ).fetchall()
    return [_skill(r) for r in rows]


@router.post("/skills", status_code=201)
async def create_skill(body: NewSkillOffer, ctx: CtxDep) -> SkillOffer:
    event_id = None
    # A session with a date also appears as a Kampung event (PO-4).
    if body.start_at and body.place_name:
        event_id = await insert_event(
            ctx,
            title=body.title,
            category=CATEGORY_FOR_TAG.get(body.tags[0], "class") if body.tags else "class",
            start_at=body.start_at,
            end_at=None,
            place_name=body.place_name,
        )
    skill_id = new_id("s")
    await ctx.conn.execute(
        "insert into skill_offers (id, user_id, title, tags, start_at, place_name, is_paid,"
        " event_id, created_at) values (%s, %s, %s, %s, %s, %s, false, %s, %s)",
        (
            skill_id,
            ctx.user_id,
            body.title,
            list(body.tags),
            body.start_at if event_id else None,
            body.place_name,
            event_id,
            ctx.now,
        ),
    )
    row = await (await ctx.conn.execute(SKILL_SELECT + " where s.id = %s", (skill_id,))).fetchone()
    assert row
    return _skill(row)


@router.delete("/skills/{skill_id}", status_code=204)
async def delete_skill(skill_id: str, ctx: CtxDep) -> Response:
    row = await (
        await ctx.conn.execute(
            "delete from skill_offers where id = %s and user_id = %s returning event_id",
            (skill_id, ctx.user_id),
        )
    ).fetchone()
    if row and row["event_id"]:
        # Its session comes off Kampung too; past RSVPs and thank-yous stay.
        await ctx.conn.execute(
            "update events set status = 'cancelled' where id = %s and start_at > %s",
            (row["event_id"], ctx.now),
        )
    return Response(status_code=204)


# ---------- Thank-yous ----------


@router.get("/endorsements/pending")
async def thanks_prompts(ctx: CtxDep) -> list[ThanksPrompt]:
    rows = await (
        await ctx.conn.execute(
            f"select e.id, e.title, {EVENT_END} as ended_at,"
            " h.id as h_id, h.name as h_name, h.photo_url as h_photo_url,"
            " s.id as skill_id, s.title as skill_title"
            " from events e join rsvps r on r.event_id = e.id"
            " join users h on h.id = e.host_id"
            " left join skill_offers s on s.event_id = e.id"
            f" where r.user_id = %(me)s and r.status = 'going' and e.host_id <> %(me)s"
            f" and e.status = 'active' and {EVENT_END} <= %(now)s"
            f" and {EVENT_END} > %(now)s - interval '{THANKS_WINDOW}'"
            " and not exists(select 1 from endorsements n where n.from_user = %(me)s"
            " and n.event_id = e.id)"
            " and not exists(select 1 from thanks_skips k where k.user_id = %(me)s"
            " and k.event_id = e.id)"
            f" order by {EVENT_END} desc",
            {"me": ctx.user_id, "now": ctx.now},
        )
    ).fetchall()
    return [
        ThanksPrompt(
            event_id=r["id"],
            event_title=r["title"],
            host=PersonSummary(id=r["h_id"], name=r["h_name"], photo_url=r["h_photo_url"]),
            skill=SkillRef(id=r["skill_id"], title=r["skill_title"]) if r["skill_id"] else None,
            ended_at=iso(r["ended_at"]),
        )
        for r in rows
    ]


@router.delete("/endorsements/pending/{event_id}", status_code=204)
async def skip_thanks(event_id: str, ctx: CtxDep) -> Response:
    await ctx.conn.execute(
        "insert into thanks_skips (user_id, event_id) select %s, id from events where id = %s"
        " on conflict do nothing",
        (ctx.user_id, event_id),
    )
    return Response(status_code=204)


@router.post("/endorsements", status_code=201)
async def send_thanks(
    request: Request,
    ctx: CtxDep,
    event_id: Annotated[str, Form()],
    kind: Annotated[Literal["thumb", "voice"], Form()],
    duration_s: Annotated[float | None, Form(ge=0, le=300)] = None,
    audio: Annotated[UploadFile | None, File()] = None,
) -> ThankYou:
    # Only people who went can thank the host (docs/03 §3, endorsements).
    event = await (
        await ctx.conn.execute(
            "select e.id, e.host_id, s.id as skill_id from events e"
            " join rsvps r on r.event_id = e.id and r.user_id = %(me)s and r.status = 'going'"
            " left join skill_offers s on s.event_id = e.id"
            " where e.id = %(e)s and e.start_at <= %(now)s and e.host_id <> %(me)s",
            {"me": ctx.user_id, "e": event_id, "now": ctx.now},
        )
    ).fetchone()
    if not event:
        raise HTTPException(403, "You can say thank you after going to their session.")
    audio_url = None
    if kind == "voice":
        if audio is None:
            raise HTTPException(422, "A voice thank-you needs its recording.")
        storage: Storage = request.app.state.storage
        data, content_type = await read_audio(audio)
        audio_url = await storage.put(f"thanks/{ctx.user_id}", data, content_type)
    me = await user_row(ctx.conn, ctx.user_id)
    assert me
    thanks_id = new_id("t")
    inserted = await (
        await ctx.conn.execute(
            "insert into endorsements (id, from_user, to_user, event_id, skill_offer_id, kind,"
            " audio_url, duration_s, language, created_at)"
            " values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
            " on conflict (from_user, event_id) where event_id is not null do nothing"
            " returning id",
            (
                thanks_id,
                ctx.user_id,
                event["host_id"],
                event_id,
                event["skill_id"],
                kind,
                audio_url,
                duration_s if kind == "voice" else None,
                me["language"],
                ctx.now,
            ),
        )
    ).fetchone()
    if not inserted:
        raise HTTPException(409, "You've already said thank you for this one.")
    row = await (
        await ctx.conn.execute(THANKS_SELECT + " where n.id = %s", (thanks_id,))
    ).fetchone()
    assert row
    return _thank_you(row)
