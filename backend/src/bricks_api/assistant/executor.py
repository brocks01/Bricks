"""Run one of Buddy's tools for a member: the same functions the app's buttons use.

Data tools return a small JSON-able result for the model to talk about. Screen tools
(navigate, fill_field, start_walk, ...) return an app action instead: the app plays them in
order so the member watches the change happen ("show, don't tell"). The health card is
never read here.
"""

from datetime import timedelta
from typing import Any

from ..deps import Ctx
from ..routers.events import cancel_rsvp, list_events, rsvp
from ..routers.me import update_me
from ..routers.sos import trigger_sos
from ..routers.thrive import (
    answer_checkin,
    checkin_week,
    create_reminder,
    delete_reminder,
    list_reminders_for,
    today,
)
from ..routers.walks import walk_stats
from ..schemas import CheckinIn, EventSummary, MeUpdate, NewReminder, SosIn
from ..timeutil import local, local_date, parse_iso
from .contract import (
    FillAction,
    FinishWalkAction,
    NavigateAction,
    OpenSosAction,
    StartWalkAction,
    StartWarmupAction,
    TurnIn,
    UiAction,
)

Result = dict[str, Any]


class ToolError(Exception):
    """The tool couldn't run (bad id, missing argument): tell the model, not the member."""


def _event(e: EventSummary, ctx: Ctx) -> Result:
    start = local(parse_iso(e.start_at))
    return {
        "id": e.id,
        "title": e.title,
        "when": start.strftime("%A %d %B, %H:%M"),
        "place": e.place_name,
        "going": e.going_count,
        "i_am_going": e.my_rsvp == "going",
        "whatsapp_link": e.whatsapp_link,
    }


async def run(
    name: str, args: dict[str, Any], ctx: Ctx, body: TurnIn
) -> tuple[Result, list[UiAction]]:
    """Runs the tool; returns (result for the model, app actions to play)."""
    a = args or {}
    match name:
        # ---- screen tools: actions the app plays ----
        case "navigate":
            return {"opened": a.get("screen")}, [NavigateAction(screen=a["screen"], id=a.get("id"))]
        case "fill_field":
            return {"filled": a.get("field")}, [
                FillAction(target=a["field"], value=str(a["value"]))
            ]
        case "read_screen":
            fields = [f.model_dump() for f in body.screen_fields or []]
            return {"screen": body.screen, "text": body.screen_script, "fields": fields}, []
        case "start_walk":
            return {"started": True}, [StartWalkAction()]
        case "finish_walk":
            return {"finished": True}, [FinishWalkAction()]
        case "start_warmup":
            return {"started": True}, [StartWarmupAction(exercise=a.get("exercise"))]
        case "trigger_sos":
            sos = await trigger_sos(SosIn(trigger="voice"), ctx)
            return {"sos_id": sos.id}, [OpenSosAction(reason=a.get("reason"))]

        # ---- data tools ----
        case "get_today":
            t = await today(ctx)
            return {
                "checkin_pending": t.checkin.pending,
                "next_event": _event(t.next_event, ctx) if t.next_event else None,
                "next_reminder": t.next_reminder.model_dump() if t.next_reminder else None,
            }, []
        case "find_events":
            when = a.get("when")
            category = a.get("category")
            events = await list_events(
                ctx,
                when="today" if when == "today" else "week" if when else None,
                category=category if category in ("walk", "class", "kids") else None,
            )
            if when == "tomorrow":
                tomorrow = local_date(ctx.now) + timedelta(days=1)
                events = [e for e in events if local(parse_iso(e.start_at)).date() == tomorrow]
            return {"events": [_event(e, ctx) for e in events[:5]]}, []
        case "join_event":
            return {"joined": _event(await rsvp(_need(a, "event_id"), ctx), ctx)}, []
        case "cancel_event":
            return {"cancelled": _event(await cancel_rsvp(_need(a, "event_id"), ctx), ctx)}, []
        case "check_in":
            channel = body.channel
            done = await answer_checkin(CheckinIn(answer=_need(a, "answer"), channel=channel), ctx)
            return done.model_dump(), []
        case "set_reminder":
            repeat = a.get("repeat") or "once"
            reminder = await create_reminder(
                NewReminder(
                    kind=a.get("kind") or "other",
                    text=_need(a, "text"),
                    time=_need(a, "time"),
                    repeat=repeat,
                    date=a.get("date")
                    or (local_date(ctx.now).isoformat() if repeat == "once" else None),
                ),
                ctx,
            )
            if body.channel != "app":
                await ctx.conn.execute(
                    "update reminders set created_by = %s where id = %s",
                    (body.channel, reminder.id),
                )
            return {"reminder": reminder.model_dump()}, []
        case "list_reminders":
            return {"reminders": [r.model_dump() for r in await list_reminders_for(ctx)]}, []
        case "delete_reminder":
            await delete_reminder(_need(a, "reminder_id"), ctx)
            return {"deleted": a["reminder_id"]}, []
        case "get_progress":
            return (await checkin_week(ctx)).model_dump(), []
        case "get_walk_stats":
            return (await walk_stats(ctx)).model_dump(), []
        case "set_language":
            me = await update_me(MeUpdate(language=_need(a, "lang")), ctx)
            return {"language": me.language}, []
    raise ToolError(f"{name} isn't available here")


def _need(args: dict[str, Any], key: str) -> Any:
    if args.get(key) in (None, ""):
        raise ToolError(f"missing {key}")
    return args[key]
