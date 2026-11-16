"""A voice note becomes text, so a person can talk instead of typing on any channel.
Gemini listens (inline audio, the same key and fallback chain as the text agent) and writes down
exactly what was said, in the speaker's own language. The transcript then walks the same road as
typed text: the same spam guard, the same commands, the same agent, the same memory.

Limits keep costs and waiting sane: 120 seconds and 5 MB per note. On any failure the person is
asked kindly to say it again or type it - never a stack trace, never silence."""
import base64
import logging

import httpx

from . import agent

log = logging.getLogger("channels.transcribe")

MAX_SECONDS = 120
MAX_BYTES = 5 * 1024 * 1024
CANNOT_HEAR = "I could not hear that clearly. Could you say it again, or type it?"
PROMPT = ("Transcribe this audio recording exactly as spoken, in the speaker's own language. "
          "Write only what was said - no commentary, no punctuation you did not hear.")


def _post(model: str, body: dict) -> httpx.Response:
    """One try against one model. A separate small seam so tests can mock it without touching httpx for everyone."""
    return httpx.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                      headers={"x-goog-api-key": agent._key()}, timeout=60, json=body)


def transcribe(audio_bytes: bytes, mime: str = "audio/ogg") -> str | None:
    """Audio in, exactly what was said out (or None when nothing usable came back). Never raises."""
    if not audio_bytes or not agent._key():
        return None
    body = {"contents": [{"role": "user", "parts": [{"text": PROMPT}, {"inlineData": {"mimeType": mime, "data": base64.b64encode(audio_bytes).decode()}}]}],
            "generationConfig": {"temperature": 0.0}}
    for model in agent._models():
        try:
            r = _post(model, body)
        except httpx.TransportError as e:  # a timeout or a dropped connection: the next model
            log.warning("transcribe model %s did not answer: %s", model, type(e).__name__)
            continue
        if r.status_code in (404, 429) or r.status_code >= 500:
            log.warning("transcribe model %s answered %s", model, r.status_code)
            continue
        try:
            r.raise_for_status()
            parts = ((r.json().get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
            out = "".join(p.get("text", "") for p in parts).strip()
            if out:
                return out
        except Exception:  # noqa: BLE001 - a strange answer: try the next model
            log.warning("transcribe: unreadable answer from %s", model)
    return None
