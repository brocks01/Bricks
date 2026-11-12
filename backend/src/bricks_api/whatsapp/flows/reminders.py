"""Reminders (iteration 2.2 §3.1): the `reminder` template with [Done] [Snooze 10 min],
and reminders made by voice or text, confirmed with [Yes] [No] first.
"""

from datetime import datetime, timedelta
from typing import Any

from ...db import Conn
from ...routers.thrive import complete_reminder, create_reminder, list_reminders_for
from ...schemas import NewReminder
from ...timeutil import at_local, local_date
from .. import templates
from ..i18n import clock
from ..models import Buttons, Choice
from ..service import WhatsApp
from ..speech import Intent
from .base import Turn, display_name


def snooze_for(wa: WhatsApp) -> timedelta:
    return timedelta(minutes=1 if wa.settings.demo_fast_escalation else 10)


def _time_text(hhmm: str, day: datetime, lang: str) -> str:
    h, m = (int(x) for x in hhmm.split(":"))
    return clock(at_local(local_date(day), h, m), lang)


async def send_reminder(
    wa: WhatsApp, conn: Conn, user: dict[str, Any], reminder: dict[str, Any], now: datetime
) -> bool:
    lang, day = user["language"], local_date(now).isoformat()
    msg = templates.build(
        "reminder",
        lang,
        [_time_text(reminder["time"], now, lang), reminder["text"], display_name(user)],
        [f"rem:done:{reminder['id']}:{day}", f"rem:snooze:{reminder['id']}:{day}"],
    )
    return (await wa.send(conn, user["phone"], msg, lang=lang)).ok


async def done(turn: Turn, reminder_id: str) -> None:
    ctx = turn.ctx()
    exists = await (
        await turn.conn.execute(
            "select 1 from reminders where id = %s and user_id = %s", (reminder_id, ctx.user_id)
        )
    ).fetchone()
    if not exists:
        await turn.reply("rem_gone")
        return
    await complete_reminder(reminder_id, ctx)
    await turn.conn.execute(
        "update reminder_sends set snooze_until = null where reminder_id = %s and date = %s",
        (reminder_id, turn.today),
    )
    await turn.reply("rem_done")


async def snooze(turn: Turn, reminder_id: str, day: str) -> None:
    result = await turn.conn.execute(
        "update reminder_sends set snooze_until = %s where reminder_id = %s and date = %s",
        (turn.now + snooze_for(turn.wa), reminder_id, day),
    )
    if result.rowcount == 0:
        await turn.reply("rem_gone")
        return
    await turn.reply("rem_snoozed")


def _repeat(turn: Turn, repeat: str) -> str:
    return turn.t(f"repeat_{repeat}")


async def propose(turn: Turn, intent: Intent) -> None:
    """ "Remind me to take my medicine at 8" -> [Yes] [No] before anything is saved."""
    hhmm = intent.reminder_time or ""
    if not intent.reminder_text or len(hhmm) != 5 or hhmm[2] != ":":
        await turn.reply("didnt_understand")
        return
    repeat = intent.reminder_repeat or "once"
    # A one-off reminder for a time that's passed today is for tomorrow.
    day = local_date(turn.now)
    h, m = (int(x) for x in hhmm.split(":"))
    if repeat == "once" and at_local(day, h, m) <= turn.now:
        day += timedelta(days=1)
    data = {
        "action": "reminder",
        "text": intent.reminder_text[:120],
        "time": hhmm,
        "repeat": repeat,
        "kind": intent.reminder_kind or "other",
        "date": day.isoformat(),
    }
    await turn.wa.set_session(turn.conn, turn.phone, "confirm", "reminder", data)
    await turn.say(
        Buttons(
            turn.t(
                "rem_confirm",
                text=data["text"],
                time=_time_text(hhmm, turn.now, turn.lang),
                repeat=_repeat(turn, repeat),
            ),
            [Choice("confirm:yes", turn.t("yes")), Choice("confirm:no", turn.t("no"))],
        )
    )


async def confirm(turn: Turn, data: dict[str, Any]) -> None:
    ctx = turn.ctx()
    reminder = await create_reminder(
        NewReminder(
            kind=data["kind"],
            text=data["text"],
            time=data["time"],
            repeat=data["repeat"],
            date=data["date"] if data["repeat"] == "once" else None,
        ),
        ctx,
    )
    await turn.conn.execute(
        "update reminders set created_by = 'whatsapp' where id = %s", (reminder.id,)
    )
    await turn.reply(
        "rem_created",
        text=reminder.text,
        time=_time_text(reminder.time, turn.now, turn.lang),
        repeat=_repeat(turn, reminder.repeat),
    )


async def show(turn: Turn) -> None:
    items = await list_reminders_for(turn.ctx())
    if not items:
        await turn.reply("reminders_none")
        return
    lines = "\n".join(
        f"- {_time_text(r.time, turn.now, turn.lang)}: {r.text} ({_repeat(turn, r.repeat)})"
        for r in items[:10]
    )
    await turn.reply("reminders_list", lines=lines)
