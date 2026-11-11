"""SOS on WhatsApp (docs/06 §3.5, iteration 2.2 §3.2).

Order matters: the member hears "Help is coming, call 995" first; then we ask
for their location and alert the Safe Circle concurrently (target < 10 s).
Helpers get the `sos_alert` template with [I'm on my way] [Call them]; when one
taps, the member is told and the app's SOS screen (S28) shows it.

In demo mode only helpers who have messaged us are alerted, so a judge's SOS
never reaches a stranger, and the first two others "set off" after 3 s and 6 s,
as in the app (routers/sos.py).
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any

from ...db import Conn
from ...routers.sos import DEMO_SETS_OFF_AFTER_S, trigger_sos
from ...schemas import SosIn
from .. import templates
from ..i18n import clock, join_names, t
from ..models import Buttons, Choice, LocationRequest, Text
from ..service import WhatsApp
from .base import Turn, display_name

log = logging.getLogger("bricks.whatsapp")

OPEN = ("open", "helper_coming")
LOCATION_WINDOW = timedelta(hours=2)


def map_link(lat: float, lng: float) -> str:
    return f"https://maps.google.com/?q={lat:.5f},{lng:.5f}"


async def _helpers(conn: Conn, sos_id: str) -> list[dict[str, Any]]:
    """Who was told, with their phone and language (when they're members)."""
    return await (
        await conn.execute(
            "select r.helper_key, r.name, r.is_family, r.distance_m, r.status, s.phone,"
            "  coalesce(u.language, %s) as language"
            " from sos_responses r join sos_events e on e.id = r.sos_id"
            " left join safe_circle s on s.id = r.helper_key"
            " left join users u on u.id = s.helper_id"
            " where r.sos_id = %s order by r.order_no",
            ("en", sos_id),
        )
    ).fetchall()


async def start(turn: Turn, trigger: str = "whatsapp") -> None:
    if not turn.user:
        await turn.reply("sos_no_circle")
        return
    ctx = turn.ctx()
    alert = await trigger_sos(SosIn(trigger="voice" if turn.voice else "whatsapp"), ctx)
    # Helpers' taps arrive on other connections: make the alert visible to them now.
    await turn.conn.commit()

    family = [h.name.split(" ")[0] for h in alert.helpers if h.is_family]
    others = [h for h in alert.helpers if not h.is_family]
    if not alert.helpers:
        await turn.reply("sos_no_circle")
        return
    names = family + ([turn.t("your_neighbours")] if others else [])
    first = alert.helpers[0].name.split(" ")[0]
    await turn.say(
        Buttons(
            turn.t("sos_now", names=join_names(names, turn.lang)),
            [
                Choice(f"sos:ok:{alert.id}", turn.t("im_ok_now")),
                Choice(f"sos:call:{alert.id}", turn.t("call_name", name=first)[:20]),
            ],
        )
    )
    await turn.say(LocationRequest(turn.t("sos_share_location"), turn.t("sos_share_location_text")))
    await fan_out(turn.wa, turn.conn, turn.user, alert.id, turn.now)
    await turn.conn.commit()
    if turn.wa.settings.demo_mode:
        _simulate_helpers(turn.wa, turn.user, alert.id, turn.phone)


async def fan_out(
    wa: WhatsApp, conn: Conn, member: dict[str, Any], sos_id: str, now: datetime
) -> int:
    """Sends `sos_alert` to every helper with a phone, all at once. Returns how many."""
    sos = await (
        await conn.execute("select lat, lng from sos_events where id = %s", (sos_id,))
    ).fetchone()
    lat = sos["lat"] if sos and sos["lat"] is not None else member["home_lat"]
    lng = sos["lng"] if sos and sos["lng"] is not None else member["home_lng"]
    link = map_link(lat, lng) if lat is not None and lng is not None else "-"
    helpers = [h for h in await _helpers(conn, sos_id) if h["phone"]]
    if wa.settings.demo_mode:
        known = {
            r["phone"]
            for r in await (
                await conn.execute(
                    "select phone from wa_contacts where phone = any(%s)",
                    ([h["phone"] for h in helpers],),
                )
            ).fetchall()
        }
        helpers = [h for h in helpers if h["phone"] in known]

    async def alert(h: dict[str, Any]) -> bool:
        msg = templates.build(
            "sos_alert",
            h["language"],
            [display_name(member), link, clock(now, h["language"])],
            [f"sos:onway:{sos_id}", f"sos:callme:{sos_id}"],
        )
        return (await wa.send(conn, h["phone"], msg, lang=h["language"], urgent=True)).ok

    results = await asyncio.gather(*(alert(h) for h in helpers))
    return sum(results)


def _simulate_helpers(wa: WhatsApp, member: dict[str, Any], sos_id: str, phone: str) -> None:
    """Demo: helpers we couldn't message "set off" after 3 s and 6 s, like the app shows."""

    async def run() -> None:
        try:
            async with wa.connection() as conn:
                helpers = await _helpers(conn, sos_id)
            for i, h in enumerate(helpers[: len(DEMO_SETS_OFF_AFTER_S)]):
                await asyncio.sleep(
                    DEMO_SETS_OFF_AFTER_S[i] - (DEMO_SETS_OFF_AFTER_S[i - 1] if i else 0)
                )
                async with wa.connection() as conn:
                    current = await (
                        await conn.execute(
                            "select e.status, c.phone is not null as messaged from sos_events e"
                            " left join wa_contacts c on c.phone = %s where e.id = %s",
                            (h["phone"], sos_id),
                        )
                    ).fetchone()
                    if not current or current["status"] not in OPEN or current["messaged"]:
                        continue
                    await wa.send(
                        conn,
                        phone,
                        Text(_on_way(member["language"], h)),
                        lang=member["language"],
                        urgent=True,
                    )
        except Exception:
            log.exception("SOS demo helpers failed")

    task = asyncio.create_task(run())
    _background.add(task)
    task.add_done_callback(_background.discard)


_background: set[asyncio.Task[None]] = set()


def _on_way(lang: str, helper: dict[str, Any]) -> str:
    first = str(helper["name"]).split(" ")[0]
    if helper["distance_m"] is not None and not helper["is_family"]:
        return t(lang, "sos_on_way_near", name=first, distance=helper["distance_m"])
    return t(lang, "sos_on_way", name=first)


async def _latest_open(conn: Conn, user_id: str, since: datetime) -> dict[str, Any] | None:
    return await (
        await conn.execute(
            "select * from sos_events where user_id = %s and status = any(%s) and created_at > %s"
            " order by created_at desc limit 1",
            (user_id, list(OPEN), since),
        )
    ).fetchone()


# ---------- The member's buttons ----------


async def im_ok(turn: Turn, sos_id: str) -> None:
    assert turn.user
    row = await (
        await turn.conn.execute(
            "update sos_events set status = 'resolved', resolved_at = %s"
            " where id = %s and user_id = %s and status = any(%s) returning id",
            (turn.now, sos_id, turn.user["id"], list(OPEN)),
        )
    ).fetchone()
    await turn.reply("sos_ok")
    if not row:
        return
    name = display_name(turn.user)
    for h in await _helpers(turn.conn, sos_id):
        if h["phone"] and await turn.wa.contact(turn.conn, h["phone"]):
            await turn.wa.send(
                turn.conn,
                h["phone"],
                Text(t(h["language"], "helper_all_clear", name=name)),
                lang=h["language"],
                urgent=True,
            )


async def call_family(turn: Turn, sos_id: str) -> None:
    helpers = [h for h in await _helpers(turn.conn, sos_id) if h["phone"]]
    if helpers:
        h = next((h for h in helpers if h["is_family"]), helpers[0])
        await turn.reply("tap_to_call", name=h["name"], phone=h["phone"])
    else:
        await turn.reply("sos_no_circle")


async def location(turn: Turn) -> bool:
    """A shared location goes on their open alert. False if there's no open alert."""
    if not turn.user or turn.msg.lat is None:
        return False
    sos = await _latest_open(turn.conn, turn.user["id"], turn.now - LOCATION_WINDOW)
    if not sos:
        return False
    await turn.conn.execute(
        "update sos_events set lat = %s, lng = %s where id = %s",
        (turn.msg.lat, turn.msg.lng, sos["id"]),
    )
    await turn.reply("sos_location_thanks")
    return True


# ---------- A helper's buttons ----------


async def helper_on_way(turn: Turn, sos_id: str) -> None:
    sos = await (
        await turn.conn.execute(
            "select e.*, u.language, u.name, u.preferred_name, u.phone as member_phone"
            " from sos_events e join users u on u.id = e.user_id where e.id = %s",
            (sos_id,),
        )
    ).fetchone()
    if not sos:
        return
    lang = turn.lang
    member_name = display_name(sos)
    if sos["status"] not in OPEN:
        await turn.say(Text(t(lang, "helper_closed", name=member_name)))
        return
    helper = await (
        await turn.conn.execute(
            "update sos_responses r set status = 'on_way', at = %s from safe_circle s"
            " where r.sos_id = %s and s.id = r.helper_key and s.phone = %s"
            " and r.status = 'notified' returning r.name, r.is_family, r.distance_m",
            (turn.now, sos_id, turn.phone),
        )
    ).fetchone()
    await turn.conn.execute(
        "update sos_events set status = 'helper_coming' where id = %s and status = 'open'",
        (sos_id,),
    )
    await turn.say(Text(t(lang, "helper_thanks", name=member_name)))
    if helper and sos["member_phone"]:
        await turn.wa.send(
            turn.conn,
            sos["member_phone"],
            Text(_on_way(sos["language"], helper)),
            lang=sos["language"],
            urgent=True,
        )


async def helper_call(turn: Turn, sos_id: str) -> None:
    sos = await (
        await turn.conn.execute(
            "select u.name, u.phone from sos_events e join users u on u.id = e.user_id"
            " join sos_responses r on r.sos_id = e.id"
            " join safe_circle s on s.id = r.helper_key"
            " where e.id = %s and s.phone = %s limit 1",
            (sos_id, turn.phone),
        )
    ).fetchone()
    if sos and sos["phone"]:
        await turn.reply("tap_to_call", name=sos["name"], phone=sos["phone"])
