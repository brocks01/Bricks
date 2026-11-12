"""The webhooks (iteration 0.2) and demo controls.

- GET  /wa/webhook   Meta's verification handshake.
- POST /wa/webhook   Meta messages: signature checked, answered at once, handled after.
- POST /wa/twilio    Twilio sandbox messages: signature checked the same way.
- POST /wa/admin/…   Fire the check-in, an invite, a reminder or a scheduler tick
                     now. Demo mode only.
"""

import asyncio
import json
import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from ..repo import user_row
from ..timeutil import local_date
from .flows import checkin, events, family, reminders
from .models import Inbound
from .providers import Meta, Twilio
from .router import handle
from .scheduler import tick
from .service import WhatsApp
from .speech import Speech

log = logging.getLogger("bricks.whatsapp")

router = APIRouter(prefix="/wa", tags=["whatsapp"])

_locks: dict[str, asyncio.Lock] = {}


def _wa(request: Request) -> WhatsApp:
    wa: WhatsApp = request.app.state.wa
    return wa


async def process(app: FastAPI, msg: Inbound) -> None:
    """Handles one message, once, one at a time per number."""
    wa: WhatsApp = app.state.wa
    speech: Speech = app.state.speech
    lock = _locks.setdefault(msg.phone, asyncio.Lock())
    async with lock, wa.connection() as conn:
        if not msg.id or not await wa.first_time(conn, msg.id):
            return
        await conn.commit()
        try:
            await handle(wa, speech, conn, msg)
        except Exception:
            log.exception("WhatsApp message failed (%s, %s)", msg.route, msg.kind)
            await conn.rollback()


@router.get("/webhook")
async def verify(
    request: Request,
    mode: Annotated[str, Query(alias="hub.mode")] = "",
    token: Annotated[str, Query(alias="hub.verify_token")] = "",
    challenge: Annotated[str, Query(alias="hub.challenge")] = "",
) -> PlainTextResponse:
    expected = _wa(request).settings.meta_wa_verify_token
    if mode == "subscribe" and expected and token == expected.get_secret_value():
        return PlainTextResponse(challenge)
    raise HTTPException(403, "Verification failed.")


@router.post("/webhook")
async def meta_webhook(request: Request, background: BackgroundTasks) -> dict[str, bool]:
    wa = _wa(request)
    body = await request.body()
    if not wa.meta.signature_ok(body, request.headers.get("x-hub-signature-256")):
        raise HTTPException(403, "Bad signature.")
    try:
        payload = json.loads(body)
        messages = Meta.parse(payload)
    except (ValueError, KeyError, TypeError):
        log.warning("Unreadable Meta webhook")
        return {"ok": True}  # never make Meta retry something we can't read
    for msg in messages:
        background.add_task(process, request.app, msg)
    return {"ok": True}


@router.post("/twilio")
async def twilio_webhook(request: Request, background: BackgroundTasks) -> Response:
    wa = _wa(request)
    form = {k: str(v) for k, v in (await request.form()).items()}
    base = wa.settings.public_base_url.rstrip("/") or str(request.base_url).rstrip("/")
    url = base + request.url.path + (f"?{request.url.query}" if request.url.query else "")
    if not wa.twilio.signature_ok(url, form, request.headers.get("x-twilio-signature")):
        raise HTTPException(403, "Bad signature.")
    background.add_task(process, request.app, Twilio.parse(form))
    # An empty TwiML reply: our answer goes out through the API.
    return Response("<Response></Response>", media_type="application/xml")


# ---------- Demo controls ----------


class UserIn(BaseModel):
    user_id: str


class EventInviteIn(BaseModel):
    user_id: str
    event_id: str


class ReminderIn(BaseModel):
    reminder_id: str


def _demo_only(request: Request) -> WhatsApp:
    wa = _wa(request)
    if not wa.settings.demo_mode:
        raise HTTPException(403, "Demo mode only.")
    return wa


@router.post("/admin/checkin")
async def admin_checkin(body: UserIn, request: Request) -> dict[str, bool]:
    """Sends the morning check-in to one member now (and starts their ladder)."""
    wa = _demo_only(request)
    async with wa.connection() as conn:
        user = await user_row(conn, body.user_id)
        if not user or not user["phone"]:
            raise HTTPException(404, "No such member with a phone.")
        return {"sent": await checkin.send_checkin(wa, conn, user, wa.clock())}


@router.post("/admin/event-invite")
async def admin_event_invite(body: EventInviteIn, request: Request) -> dict[str, bool]:
    wa = _demo_only(request)
    async with wa.connection() as conn:
        user = await user_row(conn, body.user_id)
        if not user or not user["phone"]:
            raise HTTPException(404, "No such member with a phone.")
        return {"sent": await events.send_invite(wa, conn, user, body.event_id)}


@router.post("/admin/reminder")
async def admin_reminder(body: ReminderIn, request: Request) -> dict[str, bool]:
    wa = _demo_only(request)
    now = wa.clock()
    async with wa.connection() as conn:
        row = await (
            await conn.execute(
                "select r.*, to_jsonb(u) as owner from reminders r join users u on u.id = r.user_id"
                " where r.id = %s",
                (body.reminder_id,),
            )
        ).fetchone()
        if not row:
            raise HTTPException(404, "No such reminder.")
        await conn.execute(
            "insert into reminder_sends (reminder_id, date, sent_at) values (%s, %s, %s)"
            " on conflict (reminder_id, date) do update set sent_at = excluded.sent_at,"
            " snooze_until = null",
            (row["id"], local_date(now), now),
        )
        return {"sent": await reminders.send_reminder(wa, conn, row["owner"], row, now)}


@router.post("/admin/family-invite/{invite_id}")
async def admin_family_invite(invite_id: str, request: Request) -> dict[str, bool]:
    wa = _demo_only(request)
    async with wa.connection() as conn:
        return {"sent": await family.send_invite(wa, conn, invite_id)}


@router.post("/admin/tick")
async def admin_tick(request: Request, morning: bool = False) -> dict[str, int]:
    """Runs the scheduler once now: the ladder, reminders and event reminders, and
    with ?morning=true the morning check-in to every WhatsApp member."""
    wa = _demo_only(request)
    return await tick(wa, morning=morning)
