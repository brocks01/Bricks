import hmac
import os

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse
from xml.sax.saxutils import escape

from ..identity.router import current_user_id
from ..voice import twilio as proto
from ..voice.config import config
from . import core, telegram

router = APIRouter(prefix="/v1/channels")


@router.get("")
def status(user_id: str = Depends(current_user_id)):
    """What the Profile screen needs: is Telegram set up on the server, and is this person connected."""
    twilio = bool(config().twilio_sid and config().twilio_token)
    return {"telegram": {"available": telegram.enabled(), "connected": core.linked(user_id, "telegram"), "bot": telegram.bot_username()},
            "whatsapp": {"available": twilio, "connected": core.linked(user_id, "whatsapp"), "number": (os.environ.get("TWILIO_WHATSAPP_FROM") or config().twilio_from or "").removeprefix("whatsapp:")},
            "sms": {"available": twilio, "connected": core.linked(user_id, "sms"), "number": config().twilio_from or ""}, "phone": {"available": twilio, "connected": core.linked(user_id, "phone"), "number": config().twilio_from or ""}}


@router.post("/telegram/link-code")
def link_code(user_id: str = Depends(current_user_id)):
    """A one-time code (15 minutes). The person sends it to the bot, or opens the link, and the chat is theirs from then on."""
    if not telegram.enabled():
        return JSONResponse(status_code=503, content={"detail": {"code": "telegram_not_set_up"}})
    c = core.new_link_code(user_id, "telegram")
    bot = telegram.bot_username()
    return {**c, "bot": bot, "link": f"https://t.me/{bot}?start={c['code']}" if bot else None}


@router.delete("/telegram")
def disconnect(user_id: str = Depends(current_user_id)):
    return {"disconnected": core.unlink(user_id, "telegram") > 0}


@router.post("/telegram/webhook/{secret}")
async def webhook(secret: str, request: Request):
    """Telegram calls this when a hosted server uses a webhook instead of polling. The secret in the path is TELEGRAM_WEBHOOK_SECRET; unset = switched off."""
    want = (os.environ.get("TELEGRAM_WEBHOOK_SECRET") or "").strip()
    if not want or not hmac.compare_digest(secret, want):
        return JSONResponse(status_code=404, content={"detail": "not found"})
    import asyncio

    await asyncio.to_thread(telegram.handle_update, await request.json())
    return {"ok": True}


@router.post("/{channel}/link-code")
def link_code_for(channel: str, user_id: str = Depends(current_user_id)):
    """The same one-time code for WhatsApp or SMS: the person sends it as their first message to the Wisdom number."""
    if channel not in ("whatsapp", "sms"):
        return JSONResponse(status_code=404, content={"detail": {"code": "unknown_channel"}})
    if not (config().twilio_sid and config().twilio_token):
        return JSONResponse(status_code=503, content={"detail": {"code": "twilio_not_set_up"}})
    return core.new_link_code(user_id, channel)


@router.post("/twilio/{kind}")
async def twilio_message(kind: str, request: Request):
    """Twilio calls this for every WhatsApp or SMS message sent to our number (set it as the number's "when a message comes in" address:
    VOICE_PUBLIC_URL + /v1/channels/twilio/whatsapp or /sms). The signature is checked; the answer is TwiML."""
    if kind not in ("whatsapp", "sms"):
        return Response("not found", status_code=404)
    params = {k: str(v) for k, v in (await request.form()).items()}
    cfg = config()
    full = cfg.public_url + request.url.path + (f"?{request.url.query}" if request.url.query else "")
    if cfg.provider == "twilio" and not proto.valid_signature(cfg.twilio_token, full, params, request.headers.get("x-twilio-signature")):
        return Response("bad signature", status_code=403)
    number = params.get("From", "").removeprefix("whatsapp:").strip()
    if not number:
        return Response("<Response/>", media_type="text/xml")
    import asyncio

    lines = await asyncio.to_thread(core.handle, kind, number, params.get("Body", ""))
    return Response("<Response>" + "".join(f"<Message>{escape(x)}</Message>" for x in lines) + "</Response>", media_type="text/xml")


inbox_router = APIRouter(prefix="/v1/notifications")


@inbox_router.get("")
def inbox(user_id: str = Depends(current_user_id)):
    """What Wisdom told this person (nudges, introduction requests, reminders), on any channel, newest first, with the unread count."""
    from . import outbox

    return outbox.inbox(user_id)


@inbox_router.post("/read")
def read_all(user_id: str = Depends(current_user_id)):
    from . import outbox

    return {"marked": outbox.mark_read(user_id)}


@inbox_router.post("/{notification_id}/read")
def read_one(notification_id: int, user_id: str = Depends(current_user_id)):
    from . import outbox

    return {"marked": outbox.mark_read(user_id, notification_id)}
