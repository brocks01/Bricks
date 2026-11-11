"""Call audio: pre-generated MP3s for the fixed prompt segments, and <Say> fallbacks.

Pre-generated audio (`python -m bricks_api.calls.gen_audio`, Google Cloud TTS) is
preferred: it sounds the same on every call and costs nothing per call. Until a file
exists the call falls back to Twilio <Say> with a Google voice in the same language, so
calls work before Google Cloud is set up. The text itself lives in `calls/prompts/`.
"""

from dataclasses import dataclass
from pathlib import Path

from ..schemas import Language
from .prompts import LANGS

AUDIO_DIR = Path(__file__).resolve().parent / "audio"

__all__ = ["AUDIO_DIR", "LANGS", "VOICES", "Voice", "audio_path", "audio_url", "has_audio"]


@dataclass(frozen=True)
class Voice:
    tts_language: str  # Google Cloud TTS language_code (pre-generation)
    say_language: str  # Twilio <Say language=...>
    say_voice: str  # Twilio <Say voice=...> fallback voice


# en-SG has no Google voice; en-IN is the closest match. Native speakers review each
# language (see calls/prompts/PRONUNCIATION.md).
VOICES: dict[Language, Voice] = {
    "en": Voice("en-IN", "en-IN", "Google.en-IN-Standard-A"),
    "ms": Voice("ms-MY", "ms-MY", "Google.ms-MY-Standard-A"),
    "zh": Voice("cmn-CN", "cmn-CN", "Google.cmn-CN-Standard-A"),
    "ta": Voice("ta-IN", "ta-IN", "Google.ta-IN-Standard-A"),
}


def audio_path(prompt_id: str, lang: Language) -> Path:
    """`"checkin.ask"` → `audio/checkin.ask.en.mp3`."""
    return AUDIO_DIR / f"{prompt_id}.{lang}.mp3"


def audio_url(base_url: str, prompt_id: str, lang: Language) -> str:
    return f"{base_url.rstrip('/')}/static/voice/{prompt_id}.{lang}.mp3"


def has_audio(prompt_id: str, lang: Language) -> bool:
    return audio_path(prompt_id, lang).is_file()
