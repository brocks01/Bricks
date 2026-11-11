"""Gemini: voice notes to text, and what a free-text message is asking for.

This is a small stand-in for the voice lane's orchestrator (docs/05): it picks
one of a few things the WhatsApp flows already do, and the flows do the work.
Anything that changes data is confirmed with buttons first.
"""

import base64
import json
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import httpx

from ..config import Settings
from ..timeutil import local

log = logging.getLogger("bricks.whatsapp")

API = "https://generativelanguage.googleapis.com/v1beta/models"
LANGUAGE_NAMES = {"en": "English", "ms": "Malay", "zh": "Mandarin Chinese", "ta": "Tamil"}


@dataclass(frozen=True)
class Intent:
    kind: str  # find_events, add_reminder, help, menu, checkin_yes, checkin_no, chat, unknown
    when: str | None = None  # today, tomorrow, week
    category: str | None = None  # walk, class, ...
    reminder_text: str | None = None
    reminder_time: str | None = None  # "HH:MM"
    reminder_repeat: str | None = None  # once, daily, weekdays
    reminder_kind: str | None = None  # medicine, doctor, event, other
    reply: str | None = None


_INTENT_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "kind": {
            "type": "STRING",
            "enum": [
                "find_events",
                "add_reminder",
                "help",
                "menu",
                "checkin_yes",
                "checkin_no",
                "chat",
                "unknown",
            ],
        },
        "when": {"type": "STRING", "enum": ["today", "tomorrow", "week"], "nullable": True},
        "category": {
            "type": "STRING",
            "enum": ["walk", "class", "exercise", "social", "kids", "skill"],
            "nullable": True,
        },
        "reminder_text": {"type": "STRING", "nullable": True},
        "reminder_time": {"type": "STRING", "nullable": True},
        "reminder_repeat": {
            "type": "STRING",
            "enum": ["once", "daily", "weekdays"],
            "nullable": True,
        },
        "reminder_kind": {
            "type": "STRING",
            "enum": ["medicine", "doctor", "event", "other"],
            "nullable": True,
        },
        "reply": {"type": "STRING", "nullable": True},
    },
    "required": ["kind"],
}


class Speech:
    def __init__(self, settings: Settings, client: httpx.AsyncClient) -> None:
        self.settings = settings
        self.client = client

    @property
    def configured(self) -> bool:
        return bool(self.settings.gemini_api_key)

    async def _generate(self, parts: list[dict[str, Any]], config: dict[str, Any]) -> str:
        key = self.settings.gemini_api_key
        assert key
        r = await self.client.post(
            f"{API}/{self.settings.gemini_model}:generateContent",
            headers={"x-goog-api-key": key.get_secret_value()},
            json={"contents": [{"role": "user", "parts": parts}], "generationConfig": config},
            timeout=30,
        )
        r.raise_for_status()
        candidates = r.json().get("candidates") or []
        if not candidates:
            return ""
        return "".join(p.get("text", "") for p in candidates[0]["content"].get("parts", []))

    async def transcribe(self, audio: bytes, mime_type: str, lang: str) -> str | None:
        """What was said, or None if we couldn't tell."""
        if not self.configured:
            return None
        prompt = (
            "Transcribe this voice note from an older person in Singapore. They usually speak "
            f"{LANGUAGE_NAMES.get(lang, 'English')}, maybe mixed with English or Singlish. "
            "Write exactly what they said in the language they said it, nothing else. "
            "If there is no speech, write nothing."
        )
        try:
            text = await self._generate(
                [
                    {
                        "inline_data": {
                            "mime_type": mime_type.split(";")[0] or "audio/ogg",
                            "data": base64.b64encode(audio).decode(),
                        }
                    },
                    {"text": prompt},
                ],
                {"temperature": 0},
            )
        except httpx.HTTPError as error:
            log.warning("Transcription failed: %s", type(error).__name__)
            return None
        return text.strip() or None

    async def understand(self, text: str, lang: str, now: datetime) -> Intent:
        if not self.configured:
            return Intent("unknown")
        today = local(now)
        prompt = (
            "You help older people in Singapore use Bricks, a community app, on WhatsApp. "
            f"It is {today:%A %d %B %Y, %H:%M} in Singapore. Classify the member's message.\n"
            "- find_events: they want activities or walks (set `when` and `category` if said).\n"
            "- add_reminder: they want a reminder. Set reminder_text (short, in their words, "
            "e.g. 'Take your medicine'), reminder_time as 24-hour HH:MM, reminder_repeat "
            "(daily if they say every day, otherwise once), reminder_kind.\n"
            "- help: they are in danger, hurt, fell, unwell, or ask for urgent help.\n"
            "- menu: they ask what you can do.\n"
            "- checkin_yes / checkin_no: they say whether they exercised or moved yesterday.\n"
            "- chat: greetings, thanks, small talk. Put a warm reply of at most two short "
            "sentences in `reply`, no emojis, in "
            f"{LANGUAGE_NAMES.get(lang, 'English')}.\n"
            "- unknown: anything else.\n\n"
            f"Message: {text}"
        )
        try:
            raw = await self._generate(
                [{"text": prompt}],
                {
                    "temperature": 0,
                    "responseMimeType": "application/json",
                    "responseSchema": _INTENT_SCHEMA,
                },
            )
            data = json.loads(raw)
        except (httpx.HTTPError, ValueError) as error:
            log.warning("Understanding failed: %s", type(error).__name__)
            return Intent("unknown")
        fields = {k: data.get(k) for k in Intent.__dataclass_fields__}
        fields["kind"] = fields.get("kind") or "unknown"
        return Intent(**fields)
