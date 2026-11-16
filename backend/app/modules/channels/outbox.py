"""The one way Wisdom speaks first: a message to a person outside a conversation (an introduction request, a nudge, a reminder).
- It goes to the channel the person prefers (their answer in onboarding), then their other connected chats, and always lands in the in-app inbox too.
- Not at night: a message that is not urgent waits for the morning in the person's own time (quiet hours 21:00 to 08:00, WISDOM_QUIET="HH:MM-HH:MM" to change).
- A failed send is tried again later, three times, then the message stays in the inbox only.
Everything that notifies a person calls send() here; no other module talks to Telegram, WhatsApp or SMS on its own."""
import asyncio
import logging
import os
from datetime import datetime, time, timedelta, timezone

import httpx
from sqlalchemy import Connection, text

from ...core.db import engine
from . import core, telegram

log = logging.getLogger("channels.outbox")
UTC = timezone.utc
CHAT_CHANNELS = ("telegram", "whatsapp", "sms")
MAX_TRIES = 3
RETRY_MIN = 10


def _quiet() -> tuple[time, time]:
    raw = os.environ.get("WISDOM_QUIET") or "21:00-08:00"
    try:
        a, b = raw.split("-")
        return time.fromisoformat(a.strip()), time.fromisoformat(b.strip())
    except ValueError:
        return time(21, 0), time(8, 0)


def _offset(conn: Connection, user_id: str) -> timedelta:
    return timedelta(minutes=conn.execute(text("select coalesce(tz_offset_min, 480) from users where id = :u"), {"u": user_id}).scalar_one())


def next_ok_time(conn: Connection, user_id: str, now: datetime) -> datetime:
    """Now if it is a polite hour for this person, else the start of the next polite hour."""
    start, end = _quiet()
    off = _offset(conn, user_id)
    local = (now + off).replace(tzinfo=None)
    t = local.time()
    quiet = (t >= start or t < end) if start > end else (start <= t < end)
    if not quiet:
        return now
    day = local.date() if t < end else local.date() + timedelta(days=1)
    return datetime.combine(day, end).replace(tzinfo=UTC) - off


def preferred(conn: Connection, user_id: str) -> str | None:
    a = conn.execute(text("select answers from profiles where user_id = :u"), {"u": user_id}).scalar() or {}
    p = (a.get("channels") or {}).get("preferred_channel")
    return p if p in CHAT_CHANNELS else None


def _routes(conn: Connection, user_id: str) -> list[tuple[str, str]]:
    """(channel, address) in the order to try: the preferred channel first."""
    rows = conn.execute(text("select channel, external_id from channel_links where user_id = :u and channel in ('telegram', 'whatsapp', 'sms')"), {"u": user_id}).all()
    pref = preferred(conn, user_id)
    order = {c: i for i, c in enumerate(([pref] if pref else []) + [c for c in CHAT_CHANNELS if c != pref])}
    return sorted(((r.channel, r.external_id) for r in rows), key=lambda x: order[x[0]])


def _twilio_send(channel: str, number: str, body: str) -> bool:
    sid, token = (os.environ.get("TWILIO_ACCOUNT_SID") or "").strip(), (os.environ.get("TWILIO_AUTH_TOKEN") or "").strip()
    sender = (os.environ.get("TWILIO_WHATSAPP_FROM") if channel == "whatsapp" else os.environ.get("TWILIO_FROM_NUMBER")) or ""
    if not (sid and token and sender.strip()) or (os.environ.get("VOICE_PROVIDER") or "").lower() == "mock":
        return False
    pre = "whatsapp:" if channel == "whatsapp" else ""
    try:
        r = httpx.post(f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json", auth=(sid, token), timeout=15,
                       data={"From": (pre + sender.strip().removeprefix("whatsapp:")), "To": pre + number, "Body": body[:1500]})
        if r.status_code >= 300:
            log.warning("twilio %s message refused: %s", channel, r.status_code)
        return r.status_code < 300
    except httpx.HTTPError:
        log.warning("twilio %s message failed", channel)
        return False


def _push(channel: str, address: str, body: str) -> bool:
    return telegram.send(address, body) if channel == "telegram" else _twilio_send(channel, address, body)


def send(user_id: str, body: str, kind: str = "info", urgent: bool = False, dedupe_key: str | None = None, now: datetime | None = None) -> dict:
    """Tell a person something. Returns {"id", "status", "channel"}. dedupe_key makes the same message go to the same person only once."""
    now = now or datetime.now(UTC)
    body = (body or "").strip()[:1000]
    if not body:
        return {"id": None, "status": "empty", "channel": None}
    with engine().begin() as conn:
        when = now if urgent else next_ok_time(conn, user_id, now)
        r = conn.execute(text("insert into notifications (user_id, kind, body, urgent, deliver_after, dedupe_key) values (:u, :k, :b, :x, :w, :d) on conflict do nothing returning id"),
                         {"u": user_id, "k": kind, "b": body, "x": urgent, "w": when, "d": dedupe_key}).first()
    if r is None:
        return {"id": None, "status": "duplicate", "channel": None}
    return deliver(r.id, now) if when <= now else {"id": r.id, "status": "queued", "channel": None}


def deliver(notification_id: int, now: datetime | None = None) -> dict:
    now = now or datetime.now(UTC)
    with engine().begin() as conn:
        n = conn.execute(text("select * from notifications where id = :i and status = 'queued' for update"), {"i": notification_id}).first()
        if n is None:
            return {"id": notification_id, "status": "skipped", "channel": None}
        routes = _routes(conn, str(n.user_id))
    used = next((ch for ch, addr in routes if _push(ch, addr, n.body)), None)
    with engine().begin() as conn:
        if used:
            conn.execute(text("update notifications set status = 'sent', channel_used = :c, sent_at = now(), tries = tries + 1 where id = :i"), {"c": used, "i": n.id})
            try:  # the agent should know what it just said, so "yes, I'll go" in reply makes sense
                from . import memory

                memory.remember(str(n.user_id), used, "agent", n.body)
            except Exception:  # noqa: BLE001
                pass
            return {"id": n.id, "status": "sent", "channel": used}
        if routes and n.tries + 1 < MAX_TRIES:
            conn.execute(text("update notifications set tries = tries + 1, deliver_after = :w where id = :i"), {"w": now + timedelta(minutes=RETRY_MIN), "i": n.id})
            return {"id": n.id, "status": "queued", "channel": None}
        conn.execute(text("update notifications set status = 'inbox', tries = tries + 1 where id = :i"), {"i": n.id})
    return {"id": n.id, "status": "inbox", "channel": None}


def run_due(now: datetime | None = None) -> int:
    """Deliver whatever is waiting and due. Returns how many were handled."""
    now = now or datetime.now(UTC)
    with engine().connect() as conn:
        ids = [r.id for r in conn.execute(text("select id from notifications where status = 'queued' and deliver_after <= :n order by id limit 50"), {"n": now})]
    for i in ids:
        deliver(i, now)
    return len(ids)


async def loop(every: float = 60.0) -> None:
    """The background ticker: nudges, then delivery. OUTBOX_LOOP=off holds it still (tests)."""
    from .. import recurrence
    from . import nudges

    while True:
        try:
            if (os.environ.get("OUTBOX_LOOP") or "on").lower() != "off":
                await asyncio.to_thread(recurrence.run_once)  # keeps repeating events filled ahead of time
                await asyncio.to_thread(nudges.run_once)
                await asyncio.to_thread(run_due)
        except Exception:  # noqa: BLE001 - a bad tick must not stop the loop
            log.exception("outbox tick failed")
        await asyncio.sleep(every)


# ---------- the in-app inbox ----------
def inbox(user_id: str, limit: int = 30) -> dict:
    with engine().connect() as conn:
        rows = conn.execute(text("select id, kind, body, status, channel_used, created_at, read_at from notifications where user_id = :u and status <> 'queued' order by id desc limit :n"), {"u": user_id, "n": limit}).all()
        unread = conn.execute(text("select count(*) from notifications where user_id = :u and status in ('sent', 'inbox')"), {"u": user_id}).scalar_one()
    return {"unread": unread, "notifications": [{"id": r.id, "kind": r.kind, "body": r.body, "read": r.status == "read", "via": r.channel_used or "app", "at": r.created_at.isoformat()} for r in rows]}


def mark_read(user_id: str, notification_id: int | None = None) -> int:
    with engine().begin() as conn:
        return conn.execute(text("update notifications set status = 'read', read_at = now() where user_id = :u and status in ('sent', 'inbox') and (cast(:i as bigint) is null or id = :i)"), {"u": user_id, "i": notification_id}).rowcount
