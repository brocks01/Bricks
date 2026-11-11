"""The voice module's settings, read from the environment each time (so a test can change them). Nothing secret has a default.
Names are the same as in the Jambagrad voice module on purpose, so the same .env lines work here."""
import os
from dataclasses import dataclass, field

import app.core.config  # noqa: F401  (loads backend/.env into the environment)


def _num(v: str | None, d: float) -> float:
    try:
        return float(v) if v not in (None, "") else d
    except ValueError:
        return d


@dataclass(frozen=True)
class VoiceConfig:
    provider: str  # "twilio" | "mock"
    public_url: str  # https address that reaches THIS server from the internet (ngrok)
    allowed_numbers: list[str] = field(default_factory=list)  # E.164; empty = nobody may be called
    soft_limit_s: float = 300  # planned time: soft, the model asks before going on
    hard_limit_s: float = 1800  # safety backstop, reached only after warnings
    extend_s: float = 300
    end_grace_ms: float = 4000  # how long a goodbye may take to finish playing before the line is dropped
    max_calls_per_hour: int = 10
    uplink_ms: float = 100  # phone audio gathered before it is sent up
    voice: str = "Puck"
    twilio_sid: str = ""
    twilio_token: str = ""
    twilio_from: str = ""
    gemini_key: str = ""
    gemini_model: str = "gemini-3.8-live"
    parallel_key: str = ""
    parallel_mode: str = "fast"
    admin_key: str = ""  # who may place calls (header X-Voice-Admin-Key); unset = calls cannot be placed


def config() -> VoiceConfig:
    e = os.environ.get
    return VoiceConfig(
        provider=(e("VOICE_PROVIDER") or "mock").lower(),
        public_url=(e("VOICE_PUBLIC_URL") or "").rstrip("/"),
        allowed_numbers=[s.strip() for s in (e("VOICE_ALLOWED_NUMBERS") or "").split(",") if s.strip()],
        soft_limit_s=_num(e("VOICE_SOFT_LIMIT_SECONDS"), 300),
        hard_limit_s=_num(e("VOICE_HARD_LIMIT_SECONDS"), 1800),
        extend_s=_num(e("VOICE_EXTEND_SECONDS"), 300),
        end_grace_ms=_num(e("VOICE_END_GRACE_MS"), 4000),
        max_calls_per_hour=int(_num(e("VOICE_MAX_CALLS_PER_HOUR"), 10)),
        uplink_ms=_num(e("VOICE_UPLINK_MS"), 100),
        voice=e("VOICE_DEFAULT_VOICE") or "Puck",
        twilio_sid=(e("TWILIO_ACCOUNT_SID") or "").strip(),
        twilio_token=(e("TWILIO_AUTH_TOKEN") or "").strip(),
        twilio_from=(e("TWILIO_FROM_NUMBER") or "").strip(),
        gemini_key=(e("GEMINI_API_KEY") or "").strip(),
        gemini_model=e("GEMINI_LIVE_MODEL") or "gemini-3.8-live",
        parallel_key=(e("PARALLEL_API_KEY") or "").strip(),
        parallel_mode=e("PARALLEL_SEARCH_MODE") or "fast",
        admin_key=(e("VOICE_ADMIN_KEY") or "").strip(),
    )


def status() -> dict:
    """What an admin may see: which parts are set up, never the values."""
    c = config()
    twilio_ready = bool(c.twilio_sid and c.twilio_token and c.twilio_from)
    return {
        "provider": c.provider,
        "provider_ready": True if c.provider == "mock" else twilio_ready if c.provider == "twilio" else False,
        "public_url_set": bool(c.public_url),
        "gemini_key_set": bool(c.gemini_key),
        "search_key_set": bool(c.parallel_key),
        "allowed_numbers": len(c.allowed_numbers),
        "soft_limit_s": c.soft_limit_s,
        "hard_limit_s": c.hard_limit_s,
        "extend_s": c.extend_s,
        "max_calls_per_hour": c.max_calls_per_hour,
    }
