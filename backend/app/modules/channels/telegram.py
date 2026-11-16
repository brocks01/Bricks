"""Telegram adapter: carries text in and out, nothing more. Two ways in:
- long polling (default; needs no public address, so it works on a laptop): `poll_loop()` runs inside the API when TELEGRAM_BOT_TOKEN is set;
- a webhook (for a hosted server): POST /v1/channels/telegram/webhook/{TELEGRAM_WEBHOOK_SECRET}; register it once with Telegram's setWebhook (url = your host + that path) and set TELEGRAM_MODE=webhook.
The token is a secret: it is read from the environment and never logged or returned."""
import asyncio
import logging
import os

import httpx

import app.core.config  # noqa: F401  (loads backend/.env)

from . import core

log = logging.getLogger("channels.telegram")
KEYBOARD = {"keyboard": [[{"text": "Today"}, {"text": "My tree"}], [{"text": "Markets"}, {"text": "Help"}]], "resize_keyboard": True}


def token() -> str:
    return (os.environ.get("TELEGRAM_BOT_TOKEN") or "").strip()


def enabled() -> bool:
    return bool(token())


def _url(method: str) -> str:
    return f"https://api.telegram.org/bot{token()}/{method}"


_username: str | None = None


def bot_username() -> str | None:
    """The bot's @name, for the 'open Telegram' link. Cached; None when not set up or unreachable."""
    global _username
    if _username is None and enabled():
        try:
            _username = httpx.get(_url("getMe"), timeout=10).json().get("result", {}).get("username")
        except Exception:  # noqa: BLE001
            return None
    return _username


def send(chat_id: str, body: str) -> bool:
    if not enabled() or not body:
        return False
    try:
        for i in range(0, len(body), 3800):  # Telegram's limit is 4096
            r = httpx.post(_url("sendMessage"), json={"chat_id": chat_id, "text": body[i:i + 3800], "reply_markup": KEYBOARD}, timeout=15)
            if r.status_code != 200:
                log.warning("telegram sendMessage failed: %s", r.status_code)
                return False
        return True
    except Exception:  # noqa: BLE001
        log.warning("telegram send failed")
        return False


def handle_update(update: dict) -> None:
    """One Telegram update. Only private text chats are answered: a group must never be able to read a person's day."""
    m = update.get("message") or {}
    chat = m.get("chat") or {}
    if chat.get("type") != "private" or not m.get("text"):
        return
    chat_id = str(chat["id"])
    for line in core.handle("telegram", chat_id, m["text"]):
        send(chat_id, line)


async def poll_loop() -> None:
    """Runs forever inside the API while a token is set. Safe to cancel."""
    if not enabled():
        return
    offset = 0
    log.info("telegram polling started")
    async with httpx.AsyncClient(timeout=40) as c:
        try:  # polling and a webhook cannot both be on
            await c.post(_url("deleteWebhook"))
        except Exception:  # noqa: BLE001
            pass
        while True:
            try:
                r = await c.get(_url("getUpdates"), params={"timeout": 25, "offset": offset, "allowed_updates": '["message"]'})
                data = r.json()
                if not data.get("ok"):
                    await asyncio.sleep(10)
                    continue
                for u in data.get("result", []):
                    offset = u["update_id"] + 1
                    await asyncio.to_thread(handle_update, u)
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001 - a dropped connection: wait and go on
                await asyncio.sleep(5)
