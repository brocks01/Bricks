"""Buddy's system prompt (system_prompt.md), filled in for one member and turn."""

from datetime import datetime
from functools import cache
from pathlib import Path
from zoneinfo import ZoneInfo

from ..schemas import ChannelPref, Language

PROMPT_FILE = Path(__file__).with_name("system_prompt.md")
SINGAPORE = ZoneInfo("Asia/Singapore")

LANGUAGE_NAMES: dict[Language, str] = {
    "en": "English (Singapore English is fine)",
    "ms": "Malay (Bahasa Melayu)",
    "zh": "Simplified Chinese (Mandarin)",
    "ta": "Tamil",
}

CHANNEL_NOTES: dict[ChannelPref, str] = {
    "app": (
        "They are in the Bricks app and can see the screen. Show, don't tell: do everything "
        "on screen so they watch it happen. Open the screen first, then fill its fields one "
        "by one with fill_field, keeping what they typed themselves. They may carry on by "
        "hand or by voice; read_screen tells you what the form holds now."
    ),
    "whatsapp": (
        "They are messaging on WhatsApp: there is no app screen, so never open screens or "
        "talk about buttons."
    ),
    "call": (
        "They are on a phone call: there is no screen at all. Keep it short and clear, and "
        "say numbers and times slowly."
    ),
}


@cache
def _template() -> str:
    return PROMPT_FILE.read_text(encoding="utf-8")


def render_system_prompt(
    *,
    language: Language,
    member_name: str,
    channel: ChannelPref,
    now: datetime,
    screen_name: str | None = None,
    screen_script: str | None = None,
    user_memory: str | None = None,
) -> str:
    local = now.astimezone(SINGAPORE)
    has_screen = channel == "app" and screen_name
    return _template().format(
        language_name=LANGUAGE_NAMES[language],
        member_name=member_name or "friend",
        channel=channel,
        channel_note=CHANNEL_NOTES[channel],
        now=local.strftime("%A %d %B %Y, %H:%M"),
        screen_name=screen_name if has_screen else "no screen",
        screen_script=(screen_script or "") if has_screen else "",
        user_memory=user_memory or "nothing yet.",
    )
