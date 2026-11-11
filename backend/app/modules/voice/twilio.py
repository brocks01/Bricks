"""Twilio over its REST API with plain httpx (no SDK), and its wire formats in one place: the webhook signature, the TwiML that tells Twilio
to open a media stream to us, and the messages on that stream.
Media Streams: Twilio -> us: connected | start | media | stop | mark | dtmf.  us -> Twilio: media | clear | mark. Audio is base64 mu-law 8 kHz mono."""
import base64
import hashlib
import hmac
import json
import logging
from xml.sax.saxutils import quoteattr

import httpx

from .config import VoiceConfig

log = logging.getLogger("voice")
logging.getLogger("httpx").setLevel(logging.WARNING)  # its request lines carry the Twilio account id in the address
API = "https://api.twilio.com/2010-04-01"


def signature_for(auth_token: str, url: str, params: dict) -> str:
    """X-Twilio-Signature: base64 HMAC-SHA1 of the full URL followed by every POST parameter (name then value) in name order."""
    data = url + "".join(k + str(params[k]) for k in sorted(params))
    return base64.b64encode(hmac.new(auth_token.encode(), data.encode("utf-8"), hashlib.sha1).digest()).decode()


def valid_signature(auth_token: str, url: str, params: dict, header: str | None) -> bool:
    if not auth_token or not header:
        return False
    return hmac.compare_digest(signature_for(auth_token, url, params), header)


def twiml(stream_url: str, parameters: dict) -> str:
    ps = "".join(f"<Parameter name={quoteattr(k)} value={quoteattr(str(v))}/>" for k, v in parameters.items())
    return f'<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url={quoteattr(stream_url)}>{ps}</Stream></Connect></Response>'


def parse_incoming(raw: str | bytes) -> dict | None:
    """One raw stream message -> {type, ...} the call session understands, or None for what it ignores."""
    try:
        m = json.loads(raw)
    except (ValueError, TypeError):
        return None
    ev = m.get("event")
    if ev == "connected":
        return {"type": "connected"}
    if ev == "start":
        s = m.get("start") or {}
        return {"type": "start", "stream_sid": s.get("streamSid") or m.get("streamSid"), "call_sid": s.get("callSid"), "params": s.get("customParameters") or {}}
    if ev == "media":
        media = m.get("media") or {}
        if media.get("track") and media["track"] != "inbound":
            return None  # never echo our own audio back to the model
        return {"type": "media", "payload": base64.b64decode(media["payload"])} if media.get("payload") else None
    if ev == "stop":
        return {"type": "stop"}
    if ev == "mark":
        return {"type": "mark", "name": (m.get("mark") or {}).get("name")}
    if ev == "dtmf":
        return {"type": "dtmf", "digit": (m.get("dtmf") or {}).get("digit")}
    return None


def build_media(stream_sid: str, mulaw: bytes) -> str:
    return json.dumps({"event": "media", "streamSid": stream_sid, "media": {"payload": base64.b64encode(mulaw).decode()}})


def build_clear(stream_sid: str) -> str:
    return json.dumps({"event": "clear", "streamSid": stream_sid})


def build_mark(stream_sid: str, name: str) -> str:
    return json.dumps({"event": "mark", "streamSid": stream_sid, "mark": {"name": name}})


class CallRefused(Exception):
    def __init__(self, message: str, code: str = "PROVIDER_REFUSED", status: int = 400):
        super().__init__(message)
        self.code, self.status = code, status


class TwilioProvider:
    name = "twilio"

    def __init__(self, cfg: VoiceConfig):
        self.cfg = cfg

    @property
    def ready(self) -> bool:
        c = self.cfg
        return bool(c.twilio_sid and c.twilio_token and c.twilio_from and c.public_url)

    def _auth(self) -> tuple[str, str]:
        return (self.cfg.twilio_sid, self.cfg.twilio_token)

    async def create_call(self, to: str, call_id: str) -> dict:
        base = self.cfg.public_url
        body = {"To": to, "From": self.cfg.twilio_from, "Url": f"{base}/twilio/voice?callId={call_id}", "Method": "POST",
                "StatusCallback": f"{base}/twilio/status?callId={call_id}", "StatusCallbackMethod": "POST", "Timeout": "30",
                "StatusCallbackEvent": ["initiated", "ringing", "answered", "completed"]}  # a list value repeats the field, as Twilio wants
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(f"{API}/Accounts/{self.cfg.twilio_sid}/Calls.json", auth=self._auth(), data=body)
        j = r.json() if r.content else {}
        if r.status_code >= 300:
            log.warning("[voice] twilio refused the call: %s %s %s", r.status_code, j.get("code", ""), j.get("message", ""))
            code = f"TWILIO_{j['code']}" if j.get("code") else "PROVIDER_REFUSED"
            raise CallRefused(j.get("message") or f"Twilio answered {r.status_code}", code, 502 if r.status_code in (401, 403) else 400)
        return {"sid": j.get("sid"), "status": j.get("status")}

    async def hangup(self, sid: str) -> bool:
        if not sid:
            return False
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(f"{API}/Accounts/{self.cfg.twilio_sid}/Calls/{sid}.json", auth=self._auth(), data={"Status": "completed"})
        return r.status_code < 300


class MockProvider:
    """No network: for tests. A "call" is made by the test opening the media socket itself."""
    name = "mock"
    ready = True

    def __init__(self, cfg: VoiceConfig):
        self.cfg = cfg

    async def create_call(self, to: str, call_id: str) -> dict:
        return {"sid": f"MOCK{call_id[:8]}", "status": "queued"}

    async def hangup(self, sid: str) -> bool:
        return True


def provider_for(cfg: VoiceConfig):
    if cfg.provider == "twilio":
        return TwilioProvider(cfg)
    if cfg.provider == "mock":
        return MockProvider(cfg)
    return None
