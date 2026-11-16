"""The voice module's door.

  Phone provider only (public, through the tunnel):
    POST /twilio/voice   Twilio fetches the instructions when the person picks up (signature checked) -> TwiML that opens the stream
    POST /twilio/status  Twilio reports ringing / answered / completed / busy ... (signature checked)
    WS   /media          the audio stream; its first message must carry the call's one-time token
  Administrator only (header X-Voice-Admin-Key must equal VOICE_ADMIN_KEY; unset = switched off):
    GET /v1/voice/overview   POST /v1/voice/calls   GET /v1/voice/calls   GET /v1/voice/calls/{id}   POST /v1/voice/calls/{id}/hangup"""
import asyncio
import hmac
import logging

from fastapi import APIRouter, Header, Request, Response, WebSocket
from fastapi.responses import JSONResponse

from . import service, store, twilio as proto
from .config import config
from .logic import mask
from .session import CallSession, hangup_live

log = logging.getLogger("voice")
router = APIRouter()


def _refuse(e: service.Refused) -> JSONResponse:
    return JSONResponse(status_code=e.status_code, content={"success": False, "error": e.code, "message": e.message})


def _admin_ok(key: str | None) -> JSONResponse | None:
    want = config().admin_key
    if not want:
        return JSONResponse(status_code=503, content={"success": False, "error": "ADMIN_KEY_NOT_SET", "message": "VOICE_ADMIN_KEY is not set, so calls cannot be managed."})
    if not key or not hmac.compare_digest(key, want):
        return JSONResponse(status_code=401, content={"success": False, "error": "UNAUTHORIZED", "message": "Wrong or missing admin key."})
    return None


# ---- the phone provider ----

async def _verified(request: Request, params: dict) -> bool:
    cfg = config()
    if cfg.provider != "twilio":
        return True  # the mock provider has no real network
    full = cfg.public_url + request.url.path + (f"?{request.url.query}" if request.url.query else "")
    return proto.valid_signature(cfg.twilio_token, full, params, request.headers.get("x-twilio-signature"))


@router.post("/twilio/voice")
async def twilio_voice(request: Request):
    params = {k: str(v) for k, v in (await request.form()).items()}
    if not await _verified(request, params):
        log.warning("[voice] a webhook failed its signature check")
        return Response("bad signature", status_code=403)
    rec = store.get_live(request.query_params.get("callId"))
    if not rec:
        return Response("unknown call", status_code=404)
    log.info("[voice] call %s answered: the provider asked for instructions, opening the audio stream", rec["call_id"][:8])
    stream_url = config().public_url.replace("http", "ws", 1) + "/media"
    return Response(proto.twiml(stream_url, {"callId": rec["call_id"], "token": rec["_token"]}), media_type="text/xml")


UNKNOWN_CALLER = "Hello, this is Wisdom. I do not know this number yet. Please open the Wisdom app, go to Profile, and connect your phone. Goodbye."
BUSY = "Hello, this is Wisdom. I am helping someone else right now. Please call again in a few minutes. Goodbye."


def _say_and_hang_up(words: str) -> Response:
    return Response(f'<?xml version="1.0" encoding="UTF-8"?><Response><Say language="en-GB">{words}</Say><Hangup/></Response>', media_type="text/xml")


@router.post("/twilio/incoming")
async def twilio_incoming(request: Request):
    """Someone phones the Wisdom number (set it as the number's "A call comes in" webhook: VOICE_PUBLIC_URL + /twilio/incoming). Signature checked.
    A linked number gets the agent (the same one as in the chats); an unknown number hears one sentence and is hung up: no AI minutes for strangers."""
    params = {k: str(v) for k, v in (await request.form()).items()}
    if not await _verified(request, params):
        log.warning("[voice] a webhook failed its signature check")
        return Response("bad signature", status_code=403)
    rec, why = await asyncio.to_thread(service.accept_inbound, params.get("From", ""), params.get("CallSid", ""))
    if rec is None:
        log.info("[voice] inbound call refused: %s", why)
        return _say_and_hang_up(UNKNOWN_CALLER if why == "unknown" else BUSY)
    log.info("[voice] inbound call %s from %s: opening the audio stream", rec["call_id"][:8], mask(rec["to"]))
    stream_url = config().public_url.replace("http", "ws", 1) + "/media"
    return Response(proto.twiml(stream_url, {"callId": rec["call_id"], "token": rec["_token"]}), media_type="text/xml")


@router.post("/twilio/status")
async def twilio_status(request: Request):
    params = {k: str(v) for k, v in (await request.form()).items()}
    if not await _verified(request, params):
        log.warning("[voice] a webhook failed its signature check")
        return Response("bad signature", status_code=403)
    rec = store.get_live(request.query_params.get("callId"))
    if not rec:
        return Response("unknown call", status_code=404)
    s = params.get("CallStatus", "").lower()
    log.info("[voice] call %s provider status: %s%s", rec["call_id"][:8], s or "?", f" ({params['CallDuration']}s)" if params.get("CallDuration") else "")
    if s == "ringing":
        store.update(rec["call_id"], status="ringing")
    elif s in ("busy", "no-answer", "failed", "canceled"):
        store.update(rec["call_id"], status=s, ended_at=store._now(), end_reason=s)
        hangup_live(rec["call_id"], s)
    elif s == "completed":
        if not rec["ended_at"]:
            no_audio = not rec["started_at"]
            patch = {"status": "completed", "ended_at": store._now(), "duration_s": int(params.get("CallDuration") or 0) or rec["duration_s"], "end_reason": "ended-before-audio" if no_audio else rec["end_reason"]}
            if no_audio and not rec["error"]:
                patch["error"] = "The call ended before the audio stream started. On a Twilio trial, press any key when the trial message ends."
            store.update(rec["call_id"], **patch)
        hangup_live(rec["call_id"], "hangup")
    return Response("", media_type="text/plain")


@router.websocket("/media")
async def media(ws: WebSocket):
    await CallSession(ws).run()


# ---- the administrator ----

@router.get("/v1/voice/overview")
async def overview(x_voice_admin_key: str | None = Header(default=None)):
    return _admin_ok(x_voice_admin_key) or {"success": True, "data": service.overview()}


@router.get("/v1/voice/calls")
async def list_calls(limit: int = 50, x_voice_admin_key: str | None = Header(default=None)):
    return _admin_ok(x_voice_admin_key) or {"success": True, "data": store.listing(min(max(limit, 1), 200))}


@router.get("/v1/voice/calls/{call_id}")
async def get_call(call_id: str, x_voice_admin_key: str | None = Header(default=None)):
    if (bad := _admin_ok(x_voice_admin_key)) is not None:
        return bad
    try:
        return {"success": True, "data": service.get_call(call_id)}
    except service.Refused as e:
        return _refuse(e)


@router.post("/v1/voice/calls")
async def place_call(request: Request, x_voice_admin_key: str | None = Header(default=None)):
    if (bad := _admin_ok(x_voice_admin_key)) is not None:
        return bad
    try:
        return {"success": True, "data": await service.start_call(await request.json())}
    except service.Refused as e:
        return _refuse(e)


@router.post("/v1/voice/calls/{call_id}/hangup")
async def hang_up(call_id: str, x_voice_admin_key: str | None = Header(default=None)):
    if (bad := _admin_ok(x_voice_admin_key)) is not None:
        return bad
    try:
        return {"success": True, "data": await service.hang_up(call_id)}
    except service.Refused as e:
        return _refuse(e)
