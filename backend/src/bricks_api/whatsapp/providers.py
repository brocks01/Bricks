"""The two routes to WhatsApp: Meta Cloud API and the Twilio sandbox (docs/06 §5.1).

Each one checks webhook signatures, turns webhooks into `Inbound`, sends and
downloads media. Twilio can only send text (and images), so `Sender` turns
buttons and lists into numbered choices before they get here.
"""

import asyncio
import base64
import hashlib
import hmac
import logging
from collections.abc import Mapping
from typing import Any

import httpx

from ..config import Settings
from .models import (
    Buttons,
    Inbound,
    ListMenu,
    LocationRequest,
    Outbound,
    SendResult,
    Text,
    normalize_phone,
)

log = logging.getLogger("bricks.whatsapp")

# Our language codes -> Meta template language codes.
META_LANGUAGE = {"en": "en", "ms": "ms", "zh": "zh_CN", "ta": "ta"}
RETRY_DELAYS_S = (0.5, 1.5)  # three tries in all, on 429 and 5xx


async def _post_with_retry(client: httpx.AsyncClient, url: str, **kwargs: Any) -> httpx.Response:
    for delay in (*RETRY_DELAYS_S, None):
        response = await client.post(url, **kwargs)
        if (response.status_code != 429 and response.status_code < 500) or delay is None:
            return response
        await asyncio.sleep(delay)
    raise AssertionError("unreachable")


def _error(response: httpx.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        return f"HTTP {response.status_code}"
    err = body.get("error") if isinstance(body, dict) else None
    if isinstance(err, dict):  # Meta
        return f"{err.get('code')}: {err.get('message')}"
    if isinstance(body, dict) and "message" in body:  # Twilio
        return f"{body.get('code')}: {body['message']}"
    return f"HTTP {response.status_code}"


# ---------- Meta ----------


class Meta:
    route = "meta"

    def __init__(self, settings: Settings, client: httpx.AsyncClient) -> None:
        self.settings = settings
        self.client = client
        self.graph = f"https://graph.facebook.com/{settings.meta_graph_version}"

    @property
    def configured(self) -> bool:
        return bool(self.settings.meta_wa_token and self.settings.meta_wa_phone_number_id)

    def _headers(self) -> dict[str, str]:
        token = self.settings.meta_wa_token
        return {"Authorization": f"Bearer {token.get_secret_value() if token else ''}"}

    def signature_ok(self, body: bytes, header: str | None) -> bool:
        secret = self.settings.meta_app_secret
        if not secret or not header or not header.startswith("sha256="):
            return False
        expected = hmac.new(secret.get_secret_value().encode(), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, header.removeprefix("sha256="))

    @staticmethod
    def parse(payload: Mapping[str, Any]) -> list[Inbound]:
        """Messages in a webhook (delivery statuses are skipped)."""
        out: list[Inbound] = []
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                names = {
                    c.get("wa_id"): c.get("profile", {}).get("name", "")
                    for c in value.get("contacts", [])
                }
                for m in value.get("messages", []):
                    out.append(Meta._message(m, names.get(m.get("from"), "")))
        return out

    @staticmethod
    def _message(m: Mapping[str, Any], profile_name: str) -> Inbound:
        base: dict[str, Any] = {
            "id": m["id"],
            "phone": normalize_phone(m["from"]),
            "route": "meta",
            "profile_name": profile_name or "",
        }
        kind = m.get("type")
        if kind == "text":
            return Inbound(**base, kind="text", text=m["text"]["body"])
        if kind == "interactive":
            i = m["interactive"]
            if i.get("type") == "button_reply":
                r = i["button_reply"]
                return Inbound(**base, kind="button", payload=r["id"], text=r.get("title", ""))
            if i.get("type") == "list_reply":
                r = i["list_reply"]
                return Inbound(**base, kind="list", payload=r["id"], text=r.get("title", ""))
        if kind == "button":  # a template's quick-reply button
            b = m["button"]
            return Inbound(**base, kind="button", payload=b.get("payload", ""), text=b["text"])
        if kind in ("audio", "voice"):
            a = m.get("audio") or m.get("voice") or {}
            return Inbound(
                **base, kind="audio", media_id=a["id"], media_type=a.get("mime_type", "")
            )
        if kind == "location":
            loc = m["location"]
            return Inbound(
                **base, kind="location", lat=float(loc["latitude"]), lng=float(loc["longitude"])
            )
        return Inbound(**base, kind="other")

    @staticmethod
    def body(to: str, msg: Outbound) -> dict[str, Any]:
        """The Cloud API request for one message."""
        base: dict[str, Any] = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to.removeprefix("+"),
        }
        if isinstance(msg, Text):
            return {**base, "type": "text", "text": {"body": msg.body, "preview_url": True}}
        if isinstance(msg, Buttons):
            buttons = [
                {"type": "reply", "reply": {"id": c.id, "title": c.title[:20]}}
                for c in msg.choices[:3]
            ]
            interactive = {
                "type": "button",
                "body": {"text": msg.body},
                "action": {"buttons": buttons},
            }
            return {**base, "type": "interactive", "interactive": interactive}
        if isinstance(msg, ListMenu):
            rows = [
                {
                    "id": c.id,
                    "title": c.title[:24],
                    **({"description": c.description[:72]} if c.description else {}),
                }
                for c in msg.choices[:10]
            ]
            interactive = {
                "type": "list",
                "body": {"text": msg.body},
                "action": {
                    "button": msg.button[:20],
                    "sections": [{"title": msg.button[:24], "rows": rows}],
                },
            }
            return {**base, "type": "interactive", "interactive": interactive}
        if isinstance(msg, LocationRequest):
            interactive = {
                "type": "location_request_message",
                "body": {"text": msg.body},
                "action": {"name": "send_location"},
            }
            return {**base, "type": "interactive", "interactive": interactive}
        components: list[dict[str, Any]] = []
        if msg.header_image:
            components.append(
                {
                    "type": "header",
                    "parameters": [{"type": "image", "image": {"link": msg.header_image}}],
                }
            )
        if msg.params:
            components.append(
                {"type": "body", "parameters": [{"type": "text", "text": p} for p in msg.params]}
            )
        for i, payload in enumerate(msg.payloads):
            components.append(
                {
                    "type": "button",
                    "sub_type": "quick_reply",
                    "index": str(i),
                    "parameters": [{"type": "payload", "payload": payload}],
                }
            )
        template = {
            "name": msg.name,
            "language": {"code": META_LANGUAGE.get(msg.language, msg.language)},
            "components": components,
        }
        return {**base, "type": "template", "template": template}

    async def send(self, to: str, msg: Outbound) -> SendResult:
        url = f"{self.graph}/{self.settings.meta_wa_phone_number_id}/messages"
        try:
            r = await _post_with_retry(
                self.client, url, json=self.body(to, msg), headers=self._headers()
            )
        except httpx.HTTPError as error:
            return SendResult(ok=False, error=type(error).__name__)
        if r.is_success:
            ids = r.json().get("messages", [{}])
            return SendResult(ok=True, provider_id=ids[0].get("id") if ids else None)
        return SendResult(ok=False, error=_error(r))

    async def send_image(self, to: str, url: str, caption: str) -> SendResult:
        body = {
            "messaging_product": "whatsapp",
            "to": to.removeprefix("+"),
            "type": "image",
            "image": {"link": url, "caption": caption},
        }
        r = await _post_with_retry(
            self.client,
            f"{self.graph}/{self.settings.meta_wa_phone_number_id}/messages",
            json=body,
            headers=self._headers(),
        )
        return SendResult(ok=r.is_success, error=None if r.is_success else _error(r))

    async def download(self, media_id: str) -> tuple[bytes, str]:
        meta = await self.client.get(f"{self.graph}/{media_id}", headers=self._headers())
        meta.raise_for_status()
        info = meta.json()
        data = await self.client.get(info["url"], headers=self._headers())
        data.raise_for_status()
        return data.content, str(info.get("mime_type", "audio/ogg"))


# ---------- Twilio ----------


class Twilio:
    route = "twilio"

    def __init__(self, settings: Settings, client: httpx.AsyncClient) -> None:
        self.settings = settings
        self.client = client

    @property
    def configured(self) -> bool:
        return bool(self.settings.twilio_account_sid and self.settings.twilio_auth_token)

    def _auth(self) -> tuple[str, str]:
        token = self.settings.twilio_auth_token
        return self.settings.twilio_account_sid, token.get_secret_value() if token else ""

    def signature_ok(self, url: str, params: Mapping[str, str], header: str | None) -> bool:
        """Twilio's X-Twilio-Signature: HMAC-SHA1 of the URL plus the sorted form fields."""
        if not self.settings.twilio_validate_signature:
            return True
        token = self.settings.twilio_auth_token
        if not token or not header:
            return False
        data = url + "".join(k + params[k] for k in sorted(params))
        digest = hmac.new(token.get_secret_value().encode(), data.encode(), hashlib.sha1).digest()
        return hmac.compare_digest(base64.b64encode(digest).decode(), header)

    @staticmethod
    def parse(form: Mapping[str, str]) -> Inbound:
        base: dict[str, Any] = {
            "id": form.get("MessageSid") or form.get("SmsMessageSid", ""),
            "phone": normalize_phone(form.get("From", "")),
            "route": "twilio",
            "profile_name": form.get("ProfileName", ""),
        }
        if form.get("Latitude") and form.get("Longitude"):
            return Inbound(
                **base, kind="location", lat=float(form["Latitude"]), lng=float(form["Longitude"])
            )
        media_type = form.get("MediaContentType0", "")
        if int(form.get("NumMedia", "0") or 0) > 0 and media_type.startswith("audio"):
            return Inbound(**base, kind="audio", media_id=form["MediaUrl0"], media_type=media_type)
        if form.get("ButtonPayload"):
            return Inbound(
                **base, kind="button", payload=form["ButtonPayload"], text=form.get("Body", "")
            )
        if form.get("Body"):
            return Inbound(**base, kind="text", text=form["Body"])
        return Inbound(**base, kind="other")

    async def send(self, to: str, msg: Outbound) -> SendResult:
        assert isinstance(msg, Text), "Sender turns everything into text for Twilio"
        return await self._create({"Body": msg.body}, to)

    async def send_image(self, to: str, url: str, caption: str) -> SendResult:
        return await self._create({"Body": caption, "MediaUrl": url}, to)

    async def _create(self, fields: dict[str, str], to: str) -> SendResult:
        sid = self.settings.twilio_account_sid
        data = {
            "From": f"whatsapp:{self.settings.twilio_wa_sandbox_number}",
            "To": f"whatsapp:{to}",
            **fields,
        }
        try:
            r = await _post_with_retry(
                self.client,
                f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                data=data,
                auth=self._auth(),
            )
        except httpx.HTTPError as error:
            return SendResult(ok=False, error=type(error).__name__)
        if r.is_success:
            return SendResult(ok=True, provider_id=r.json().get("sid"))
        return SendResult(ok=False, error=_error(r))

    async def download(self, media_url: str) -> tuple[bytes, str]:
        # Twilio media URLs redirect to a signed file URL.
        r = await self.client.get(media_url, auth=self._auth(), follow_redirects=True)
        r.raise_for_status()
        return r.content, r.headers.get("content-type", "audio/ogg")
