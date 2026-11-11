"""What WhatsApp sends on its own, every 30 seconds (docs/06 §3.2, iteration 2.2 §3.4):

- 08:00-10:00 SGT: the morning check-in, once a day, to WhatsApp members.
- The missed check-in ladder: +2 h nudge, +3 h call (voice lane), +4 h family.
  With DEMO_FAST_ESCALATION it's +1 / +2 / +3 minutes.
- Reminders at their time (once a day each), and again after a snooze.
- "Starts in an hour" for events WhatsApp members are going to.

Every send is recorded first, so a restart or a second tick never sends twice.
"""

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import timedelta
from typing import Any

from ..db import Conn
from ..timeutil import hhmm, local, local_date
from . import templates
from .flows import checkin, events, family, reminders
from .flows.base import display_name
from .service import WhatsApp

log = logging.getLogger("bricks.whatsapp")

TICK_S = 30
MORNING = (8, 10)  # send the check-in between 08:00 and 10:00
LATE_LIMIT = timedelta(minutes=30)  # don't send a reminder this long after its time

# Members who get WhatsApp's scheduled messages.
WA_MEMBERS = """
select u.* from users u join wa_contacts c on c.user_id = u.id
where u.channel_pref = 'whatsapp' and u.status = 'active' and u.phone is not null
  and not c.opt_out
"""


def ladder_steps(wa: WhatsApp) -> tuple[timedelta, timedelta, timedelta]:
    unit = timedelta(minutes=1) if wa.settings.demo_fast_escalation else timedelta(hours=1)
    return 2 * unit, 3 * unit, 4 * unit


async def tick(wa: WhatsApp, *, morning: bool | None = None) -> dict[str, int]:
    """One round. `morning`: None sends the check-in only between 08:00 and 10:00,
    True sends it now, False skips it."""
    counts = {"checkins": 0, "nudges": 0, "calls": 0, "family": 0, "reminders": 0, "events": 0}
    async with wa.connection() as conn:
        if morning is not False:
            counts["checkins"] = await _morning(wa, conn, force=bool(morning))
        await conn.commit()
        for key, n in (await _ladder(wa, conn)).items():
            counts[key] = n
        await conn.commit()
        counts["reminders"] = await _reminders(wa, conn)
        await conn.commit()
        counts["events"] = await _event_reminders(wa, conn)
    return counts


async def _morning(wa: WhatsApp, conn: Conn, *, force: bool) -> int:
    now = wa.clock()
    if not force and not (MORNING[0] <= local(now).hour < MORNING[1]):
        return 0
    day = local_date(now)
    users = await (
        await conn.execute(
            WA_MEMBERS + " and not exists(select 1 from checkin_runs r"
            "   where r.user_id = u.id and r.date = %(day)s)"
            " and not exists(select 1 from checkins k where k.user_id = u.id and k.date = %(day)s)",
            {"day": day},
        )
    ).fetchall()
    sent = 0
    for user in users:
        sent += await checkin.send_checkin(wa, conn, user, now)
    return sent


async def _ladder(wa: WhatsApp, conn: Conn) -> dict[str, int]:
    now = wa.clock()
    day = local_date(now)
    nudge_after, call_after, family_after = ladder_steps(wa)
    # Answered on any channel (app, call, WhatsApp): the ladder stops.
    await conn.execute(
        "update checkin_runs r set stopped_at = %s where r.date = %s and r.stopped_at is null"
        " and exists(select 1 from checkins k where k.user_id = r.user_id and k.date = r.date)",
        (now, day),
    )
    runs = await (
        await conn.execute(
            "select r.*, to_jsonb(u) as member from checkin_runs r join users u on u.id = r.user_id"
            " where r.date = %s and r.stopped_at is null and r.family_at is null",
            (day,),
        )
    ).fetchall()
    counts = {"nudges": 0, "calls": 0, "family": 0}
    for run in runs:
        member: dict[str, Any] = run["member"]
        waited = now - run["asked_at"]
        if run["nudged_at"] is None and waited >= nudge_after:
            await _mark(conn, run, "nudged_at", now)
            msg = templates.build(
                "checkin_nudge",
                member["language"],
                [display_name(member)],
                [f"nudge:ok:{day}", f"nudge:help:{day}"],
            )
            counts["nudges"] += (
                await wa.send(conn, member["phone"], msg, lang=member["language"])
            ).ok
        elif run["nudged_at"] and run["called_at"] is None and waited >= call_after:
            # The "are you okay?" call belongs to the voice lane (docs/05 §3.2).
            await _mark(conn, run, "called_at", now)
            log.info("Check-in ladder: call step for %s (voice lane)", member["id"])
            counts["calls"] += 1
        elif run["called_at"] and waited >= family_after:
            await _mark(conn, run, "family_at", now)
            counts["family"] += await family.send_missed_checkin(wa, conn, member)
    return counts


async def _mark(conn: Conn, run: dict[str, Any], column: str, now: Any) -> None:
    assert column in ("nudged_at", "called_at", "family_at")
    await conn.execute(
        f"update checkin_runs set {column} = %s where user_id = %s and date = %s",
        (now, run["user_id"], run["date"]),
    )


async def _reminders(wa: WhatsApp, conn: Conn) -> int:
    now = wa.clock()
    day = local_date(now)
    now_hm = hhmm(now)
    earliest = hhmm(now - LATE_LIMIT) if local(now - LATE_LIMIT).date() == day else "00:00"
    due = await (
        await conn.execute(
            "select r.*, to_jsonb(u) as owner from reminders r join (" + WA_MEMBERS + ") u"
            "   on u.id = r.user_id"
            " where r.active and r.done_on is distinct from %(day)s"
            " and r.time <= %(now)s and r.time >= %(earliest)s"
            " and (r.repeat = 'daily'"
            "   or (r.repeat = 'weekdays' and extract(isodow from %(day)s::date) < 6)"
            "   or (r.repeat = 'once' and r.date = %(day)s))"
            " and not exists(select 1 from reminder_sends s where s.reminder_id = r.id"
            "   and s.date = %(day)s)",
            {"day": day, "now": now_hm, "earliest": earliest},
        )
    ).fetchall()
    snoozed = await (
        await conn.execute(
            "select r.*, to_jsonb(u) as owner from reminder_sends s"
            " join reminders r on r.id = s.reminder_id join users u on u.id = r.user_id"
            " where s.date = %s and s.snooze_until <= %s and r.done_on is distinct from %s",
            (day, now, day),
        )
    ).fetchall()
    sent = 0
    for r in due:
        await conn.execute(
            "insert into reminder_sends (reminder_id, date, sent_at) values (%s, %s, %s)"
            " on conflict do nothing",
            (r["id"], day, now),
        )
        sent += await reminders.send_reminder(wa, conn, r["owner"], r, now)
    for r in snoozed:
        await conn.execute(
            "update reminder_sends set snooze_until = null, sent_at = %s"
            " where reminder_id = %s and date = %s",
            (now, r["id"], day),
        )
        sent += await reminders.send_reminder(wa, conn, r["owner"], r, now)
    return sent


async def _event_reminders(wa: WhatsApp, conn: Conn) -> int:
    now = wa.clock()
    rows = await (
        await conn.execute(
            "select e.*, to_jsonb(u) as member from rsvps v"
            " join events e on e.id = v.event_id join (" + WA_MEMBERS + ") u on u.id = v.user_id"
            " where v.status = 'going' and e.status = 'active'"
            " and e.start_at > %(now)s and e.start_at <= %(now)s + interval '1 hour'"
            " and e.start_at - interval '1 hour' >= %(now)s - interval '15 minutes'"
            " and e.host_id <> u.id"
            " and not exists(select 1 from event_reminder_sends s"
            "   where s.event_id = e.id and s.user_id = u.id)",
            {"now": now},
        )
    ).fetchall()
    sent = 0
    for row in rows:
        await conn.execute(
            "insert into event_reminder_sends (event_id, user_id, sent_at) values (%s, %s, %s)"
            " on conflict do nothing",
            (row["id"], row["member"]["id"], now),
        )
        sent += await events.send_event_reminder(wa, conn, row["member"], row)
    return sent


@asynccontextmanager
async def running(wa: WhatsApp) -> AsyncIterator[None]:
    """Ticks in the background while the app runs (WA_SCHEDULER=true)."""

    async def loop() -> None:
        while True:
            try:
                await tick(wa)
            except Exception:
                log.exception("WhatsApp scheduler tick failed")
            await asyncio.sleep(TICK_S)

    task = asyncio.create_task(loop())
    try:
        yield
    finally:
        task.cancel()
