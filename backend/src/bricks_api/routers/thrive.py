"""Today card, daily check-in and reminders (docs/03 §4, app iteration 1.2)."""

from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Response

from ..deps import Ctx, CtxDep
from ..ids import new_id
from ..repo import event_summary, upcoming_events
from ..schemas import (
    CheckinDay,
    CheckinIn,
    CheckinResult,
    CheckinStatus,
    CheckinWeek,
    NewReminder,
    Reminder,
    ReminderRef,
    Today,
)
from ..timeutil import hhmm, local, local_date, week_start

router = APIRouter(tags=["thrive"])


# ---------- Check-ins ----------


async def _answers(ctx: Ctx, since: date) -> dict[date, str]:
    rows = await (
        await ctx.conn.execute(
            "select date, answer from checkins where user_id = %s and date >= %s",
            (ctx.user_id, since),
        )
    ).fetchall()
    return {r["date"]: r["answer"] for r in rows}


async def streak(ctx: Ctx) -> int:
    """Days in a row answered "yes", counting today only once it's answered."""
    today = local_date(ctx.now)
    answers = await _answers(ctx, today - timedelta(days=366))
    day = today if today in answers else today - timedelta(days=1)
    n = 0
    while answers.get(day) == "yes":
        n += 1
        day -= timedelta(days=1)
    return n


async def _checkin_pending(ctx: Ctx) -> bool:
    row = await (
        await ctx.conn.execute(
            "select 1 from checkins where user_id = %s and date = %s",
            (ctx.user_id, local_date(ctx.now)),
        )
    ).fetchone()
    return row is None


async def _walk_to_join(ctx: Ctx) -> dict[str, Any] | None:
    rows = await upcoming_events(
        ctx.conn,
        ctx.user_id,
        ctx.now,
        "e.category = 'walk' and not exists(select 1 from rsvps r where r.event_id = e.id"
        " and r.user_id = %(me)s and r.status = 'going')",
    )
    return rows[0] if rows else None


@router.post("/checkins")
async def answer_checkin(body: CheckinIn, ctx: CtxDep) -> CheckinResult:
    await ctx.conn.execute(
        "insert into checkins (user_id, date, question_key, answer, channel, answered_at)"
        " values (%s, %s, %s, %s, %s, %s)"
        " on conflict (user_id, date) do update"
        " set answer = excluded.answer, channel = excluded.channel,"
        " answered_at = excluded.answered_at",
        (ctx.user_id, local_date(ctx.now), body.question_key, body.answer, body.channel, ctx.now),
    )
    # On "no": a nearby group walk to join (Walk With Me).
    walk = await _walk_to_join(ctx) if body.answer == "no" else None
    return CheckinResult(
        answer=body.answer,
        streak=await streak(ctx),
        suggestion=event_summary(walk) if walk else None,
    )


@router.get("/checkins/week")
async def checkin_week(ctx: CtxDep) -> CheckinWeek:
    monday = week_start(local_date(ctx.now))
    answers = await _answers(ctx, monday)
    days = [monday + timedelta(days=i) for i in range(7)]
    return CheckinWeek(
        streak=await streak(ctx),
        days=[CheckinDay(date=d.isoformat(), answer=answers.get(d, "none")) for d in days],
    )


# ---------- Reminders ----------


def _reminder(row: dict[str, Any], today: date) -> Reminder:
    return Reminder(
        id=row["id"],
        kind=row["kind"],
        text=row["text"],
        time=row["time"],
        repeat=row["repeat"],
        date=row["date"].isoformat() if row["date"] else None,
        done_today=row["done_on"] == today,
        created_by=row["created_by"],
    )


async def list_reminders_for(ctx: Ctx) -> list[Reminder]:
    today = local_date(ctx.now)
    rows = await (
        await ctx.conn.execute(
            "select * from reminders where user_id = %s and active"
            " and (repeat <> 'once' or date >= %s) order by time, created_at",
            (ctx.user_id, today),
        )
    ).fetchall()
    return [_reminder(r, today) for r in rows]


def _rings_today(r: Reminder, today: date) -> bool:
    if r.repeat == "once":
        return r.date == today.isoformat()
    if r.repeat == "weekdays":
        return today.weekday() < 5
    return True


@router.get("/reminders")
async def list_reminders(ctx: CtxDep) -> list[Reminder]:
    return await list_reminders_for(ctx)


@router.post("/reminders", status_code=201)
async def create_reminder(body: NewReminder, ctx: CtxDep) -> Reminder:
    if body.repeat == "once" and not body.date:
        raise HTTPException(422, "A one-off reminder needs a date.")
    owner, created_by = ctx.user_id, "self"
    if body.for_senior_id:
        # Family can set reminders only for a parent who said yes (ON-5).
        link = await (
            await ctx.conn.execute(
                "select 1 from family_links where senior_id = %s and family_id = %s"
                " and status = 'accepted' and can_set_reminders",
                (body.for_senior_id, ctx.user_id),
            )
        ).fetchone()
        if not link:
            raise HTTPException(403, "You can set reminders once they've said yes.")
        owner, created_by = body.for_senior_id, "family"
    reminder_id = new_id("r")
    row = await (
        await ctx.conn.execute(
            "insert into reminders (id, user_id, kind, text, time, repeat, date, created_by,"
            " created_by_user) values (%s,%s,%s,%s,%s,%s,%s,%s,%s) returning *",
            (
                reminder_id,
                owner,
                body.kind,
                body.text,
                body.time,
                body.repeat,
                body.date if body.repeat == "once" else None,
                created_by,
                ctx.user_id,
            ),
        )
    ).fetchone()
    assert row
    return _reminder(row, local_date(ctx.now))


@router.delete("/reminders/{reminder_id}", status_code=204)
async def delete_reminder(reminder_id: str, ctx: CtxDep) -> Response:
    await ctx.conn.execute(
        "delete from reminders where id = %s and (user_id = %s or created_by_user = %s)",
        (reminder_id, ctx.user_id, ctx.user_id),
    )
    return Response(status_code=204)


@router.post("/reminders/{reminder_id}/done", status_code=204)
async def complete_reminder(reminder_id: str, ctx: CtxDep) -> Response:
    await ctx.conn.execute(
        "update reminders set done_on = %s where id = %s and user_id = %s",
        (local_date(ctx.now), reminder_id, ctx.user_id),
    )
    return Response(status_code=204)


# ---------- Today ----------


@router.get("/home/today")
async def today(ctx: CtxDep) -> Today:
    upcoming = await upcoming_events(ctx.conn, ctx.user_id, ctx.now)
    # Something new to join first (it gives purpose); otherwise their next plan.
    nxt = next((e for e in upcoming if not e["mine"] and e["category"] == "walk"), None) or next(
        (e for e in upcoming if e["mine"]), None
    )
    day = local_date(ctx.now)
    now_hm = hhmm(local(ctx.now))
    due = [r for r in await list_reminders_for(ctx) if _rings_today(r, day) and not r.done_today]
    reminder = next((r for r in due if r.time >= now_hm), None) or (due[0] if due else None)
    return Today(
        checkin=CheckinStatus(pending=await _checkin_pending(ctx), question_key="moved_yesterday"),
        next_event=event_summary(nxt) if nxt else None,
        next_reminder=ReminderRef(
            id=reminder.id, text=reminder.text, time=reminder.time, kind=reminder.kind
        )
        if reminder
        else None,
    )
