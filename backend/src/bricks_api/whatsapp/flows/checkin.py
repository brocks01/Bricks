"""The daily check-in (docs/06 §3.2, iteration 2.1): Yes / No, and No becomes a walk."""

from datetime import datetime
from typing import Any

from ...db import Conn
from ...routers.thrive import answer_checkin
from ...schemas import CheckinIn
from ...timeutil import local_date, parse_iso
from .. import templates
from ..i18n import when
from ..models import Buttons, Choice
from ..service import WhatsApp
from .base import Turn, display_name


async def send_checkin(
    wa: WhatsApp, conn: Conn, user: dict[str, Any], now: datetime, *, ladder: bool = True
) -> bool:
    """The morning question. With `ladder`, a missed answer escalates (scheduler)."""
    day = local_date(now).isoformat()
    msg = templates.build(
        "daily_checkin",
        user["language"],
        [display_name(user)],
        [f"checkin:yes:{day}", f"checkin:no:{day}"],
    )
    result = await wa.send(conn, user["phone"], msg, lang=user["language"])
    if result.ok and ladder:
        await conn.execute(
            "insert into checkin_runs (user_id, date, asked_at) values (%s, %s, %s)"
            " on conflict do nothing",
            (user["id"], day, now),
        )
    return result.ok


async def ask_now(turn: Turn) -> None:
    """Judges and new members try it straight away (iteration 3.1)."""
    await turn.say(
        Buttons(
            turn.t("checkin_now", name=turn.name),
            [
                Choice(f"checkin:yes:{turn.today}", turn.t("yes")),
                Choice(f"checkin:no:{turn.today}", turn.t("no")),
            ],
        )
    )


async def stop_ladder(conn: Conn, user_id: str, day: str, now: datetime) -> None:
    await conn.execute(
        "update checkin_runs set stopped_at = coalesce(stopped_at, %s)"
        " where user_id = %s and date = %s",
        (now, user_id, day),
    )


async def answer(turn: Turn, value: str, day: str | None = None) -> None:
    """checkin:yes:<date> / checkin:no:<date>, or a spoken "yes, I walked"."""
    if day and day != turn.today:
        await turn.reply("stale")
        return
    ctx = turn.ctx()
    result = await answer_checkin(
        CheckinIn(answer="yes" if value == "yes" else "no", channel="whatsapp"), ctx
    )
    # Answering stops the missed check-in ladder, whichever channel it came from.
    await stop_ladder(turn.conn, ctx.user_id, turn.today, turn.now)
    if result.answer == "yes":
        key = "checkin_yes_streak" if result.streak > 1 else "checkin_yes"
        await turn.reply(key, streak=result.streak)
        return
    walk = result.suggestion
    if walk is None:
        await turn.reply("checkin_no_rest")
        return
    body = turn.t(
        "checkin_no_walk",
        going=walk.going_count,
        when=when(parse_iso(walk.start_at), turn.now, turn.lang),
        place=walk.place_name,
    )
    await turn.say(
        Buttons(
            body,
            [
                Choice(f"join:{walk.id}", turn.t("join_walk")),
                Choice(f"later:{turn.today}", turn.t("maybe_later")),
            ],
        )
    )
