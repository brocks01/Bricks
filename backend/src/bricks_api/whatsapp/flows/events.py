"""Event invites, joining, "tell me more" and finding events (iteration 2.1 §3.2).

We can't add people to WhatsApp groups, so joining sends the group's invite
link, pasted by the captain (docs/06 §5.3).
"""

from datetime import timedelta
from typing import Any

from ...db import Conn
from ...repo import event_row, upcoming_events
from ...routers.events import cancel_rsvp, rsvp
from ...timeutil import local_date
from .. import templates
from ..i18n import clock, when
from ..models import Buttons, Choice, ListMenu, Text
from ..service import WhatsApp
from .base import Turn

REMIND_BEFORE = timedelta(hours=1)


async def _group_link(conn: Conn, row: dict[str, Any]) -> str | None:
    if row["whatsapp_link"]:
        return str(row["whatsapp_link"])
    if not row["circle_id"]:
        return None
    circle = await (
        await conn.execute("select whatsapp_link from circles where id = %s", (row["circle_id"],))
    ).fetchone()
    return str(circle["whatsapp_link"]) if circle and circle["whatsapp_link"] else None


async def send_invite(wa: WhatsApp, conn: Conn, user: dict[str, Any], event_id: str) -> bool:
    """The `event_invite` template, e.g. when a captain invites their circle."""
    now = wa.clock()
    row = await event_row(conn, user["id"], event_id)
    if not row:
        return False
    lang = user["language"]
    msg = templates.build(
        "event_invite",
        lang,
        [
            row["title"],
            when(row["start_at"], now, lang),
            row["place_name"],
            str(row["going_count"]),
            row["host_name"],
        ],
        [f"join:{event_id}", f"skip:{event_id}", f"more:{event_id}"],
    )
    return (await wa.send(conn, user["phone"], msg, lang=lang)).ok


async def join(turn: Turn, event_id: str) -> None:
    ctx = turn.ctx()
    row = await event_row(turn.conn, ctx.user_id, event_id)
    if not row or row["start_at"] <= turn.now:
        await turn.reply("event_gone")
        return
    if row["mine"]:
        await turn.reply("already_going", title=row["title"])
        return
    await rsvp(event_id, ctx)
    lines = [
        turn.t(
            "going",
            title=row["title"],
            when=when(row["start_at"], turn.now, turn.lang),
            place=row["place_name"],
        )
    ]
    link = await _group_link(turn.conn, row)
    if link:
        lines.append(turn.t("group_link", link=link))
    remind_at = row["start_at"] - REMIND_BEFORE
    if remind_at > turn.now:
        lines.append(turn.t("remind_at", time=clock(remind_at, turn.lang)))
    await turn.say(Text("\n\n".join(lines)))


async def more(turn: Turn, event_id: str) -> None:
    row = await event_row(turn.conn, turn.ctx().user_id, event_id)
    if not row or row["start_at"] <= turn.now:
        await turn.reply("event_gone")
        return
    body = turn.t(
        "event_more",
        title=row["title"],
        when=when(row["start_at"], turn.now, turn.lang),
        place=row["place_name"],
        going=row["going_count"],
        host=row["host_name"],
        description=row["description"] or "",
    ).strip()
    if row["mine"]:
        await turn.say(Text(body))
        return
    await turn.say(
        Buttons(
            body[:1024],
            [
                Choice(f"join:{event_id}", turn.t("im_going")),
                Choice(f"skip:{event_id}", turn.t("not_this_time")),
            ],
        )
    )


async def cant_make_it(turn: Turn, event_id: str) -> None:
    ctx = turn.ctx()
    if await event_row(turn.conn, ctx.user_id, event_id):
        await cancel_rsvp(event_id, ctx)
    await turn.reply("cant_make_it")


async def find(turn: Turn, when_filter: str | None = None, category: str | None = None) -> None:
    """Up to 10 coming events as a list; picking one shows "tell me more"."""
    where: list[str] = ["true"]
    params: dict[str, Any] = {}
    if when_filter == "today":
        where.append("(e.start_at at time zone 'Asia/Singapore')::date = %(day)s")
        params["day"] = local_date(turn.now)
    elif when_filter == "tomorrow":
        where.append("(e.start_at at time zone 'Asia/Singapore')::date = %(day)s")
        params["day"] = local_date(turn.now) + timedelta(days=1)
    elif when_filter == "week":
        where.append("e.start_at < %(now)s + interval '7 days'")
    if category:
        where.append("e.category = %(category)s")
        params["category"] = category
    rows = await upcoming_events(
        turn.conn, turn.ctx().user_id, turn.now, " and ".join(where), params
    )
    if not rows and (when_filter or category):
        rows = await upcoming_events(turn.conn, turn.ctx().user_id, turn.now)
    if not rows:
        await turn.reply("no_events")
        return
    choices = [
        Choice(
            f"more:{r['id']}",
            _short(r["title"], 24),
            _short(f"{when(r['start_at'], turn.now, turn.lang)} · {r['place_name']}", 72),
        )
        for r in rows[:10]
    ]
    await turn.say(ListMenu(turn.t("events_list"), turn.t("events_button"), choices))


async def send_event_reminder(
    wa: WhatsApp, conn: Conn, user: dict[str, Any], row: dict[str, Any]
) -> bool:
    lang = user["language"]
    msg = templates.build(
        "event_reminder",
        lang,
        [row["title"], clock(row["start_at"], lang), row["place_name"]],
        [f"evr:onway:{row['id']}", f"evr:cant:{row['id']}"],
    )
    return (await wa.send(conn, user["phone"], msg, lang=lang)).ok


def _short(text: str, n: int) -> str:
    return text if len(text) <= n else text[: n - 1].rstrip() + "…"
