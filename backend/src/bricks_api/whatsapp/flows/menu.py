"""The Menu list (iteration 3.2 §2.3): Today · Find events · Reminders · My progress ·
Help · Language.
"""

from ...routers.thrive import streak, today
from ...routers.walks import walk_stats
from ...timeutil import local_date, parse_iso, week_start
from ..i18n import LANGS, LANGUAGE_NAMES, when
from ..models import Buttons, Choice, ListMenu
from .base import Turn


async def show(turn: Turn, intro: str | None = None) -> None:
    items = [
        Choice("menu:today", turn.t("m_today")),
        Choice("menu:events", turn.t("m_events")),
        Choice("menu:reminders", turn.t("m_reminders")),
        Choice("menu:progress", turn.t("m_progress")),
        Choice("menu:help", turn.t("m_help"), turn.t("m_help_desc")),
        Choice("menu:language", turn.t("m_language")),
    ]
    body = f"{intro}\n\n{turn.t('menu_body')}" if intro else turn.t("menu_body")
    await turn.say(ListMenu(body, turn.t("menu_button"), items))


async def show_today(turn: Turn) -> None:
    ctx = turn.ctx()
    card = await today(ctx)
    lines = [turn.t("today_title")]
    if card.checkin.pending:
        lines.append(turn.t("today_checkin_pending"))
    else:
        lines.append(turn.t("today_checkin_done", streak=await streak(ctx)))
    if card.next_reminder:
        lines.append(
            turn.t("today_reminder", time=card.next_reminder.time, text=card.next_reminder.text)
        )
    if card.next_event:
        start = parse_iso(card.next_event.start_at)
        lines.append(
            turn.t(
                "today_event", title=card.next_event.title, when=when(start, turn.now, turn.lang)
            )
        )
    if card.checkin.pending:
        await turn.say(
            Buttons(
                "\n".join(lines) + "\n\n" + turn.t("checkin_question"),
                [
                    Choice(f"checkin:yes:{turn.today}", turn.t("yes")),
                    Choice(f"checkin:no:{turn.today}", turn.t("no")),
                ],
            )
        )
        return
    await turn.reply_text("\n".join(lines))


async def show_progress(turn: Turn) -> None:
    ctx = turn.ctx()
    stats = await walk_stats(ctx)
    monday = week_start(local_date(turn.now))
    thanks = await (
        await turn.conn.execute(
            "select count(*) as n from endorsements where to_user = %s"
            " and (created_at at time zone 'Asia/Singapore')::date >= %s",
            (ctx.user_id, monday),
        )
    ).fetchone()
    await turn.reply(
        "progress",
        km=f"{stats.distance_m / 1000:.1f}",
        walks=stats.walks,
        streak=await streak(ctx),
        thanks=thanks["n"] if thanks else 0,
    )


async def ask_help(turn: Turn) -> None:
    await turn.say(
        Buttons(
            turn.t("help_confirm"),
            [Choice("help:yes", turn.t("yes_help")), Choice("help:no", turn.t("no_im_ok"))],
        )
    )


async def pick_language(turn: Turn) -> None:
    await turn.say(
        ListMenu(
            turn.t("m_language"),
            turn.t("choose"),
            [Choice(f"lang:{code}", LANGUAGE_NAMES[code]) for code in LANGS],
        )
    )


async def set_language(turn: Turn, lang: str) -> None:
    assert turn.user
    await turn.conn.execute(
        "update users set language = %(l)s,"
        " languages = case when %(l)s = any(languages) then languages"
        "   else array_append(languages, %(l)s) end where id = %(id)s",
        {"l": lang, "id": turn.user["id"]},
    )
    await turn.reload_user()
    await turn.reply("language_set")
