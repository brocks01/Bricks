"""The text agent: the same skills as the phone call, over a written chat. Gemini decides which skill to run; the skills do the changing.
Needs GEMINI_API_KEY (the same key as the voice agent). The model can be set with GEMINI_TEXT_MODEL."""
import logging
import os

import httpx
from sqlalchemy import text

import app.core.config  # noqa: F401  (loads backend/.env)

from ...core.db import engine
from ..skills import registry

log = logging.getLogger("channels.agent")
MAX_STEPS = 5
MEMORY_TURNS = 10


def _system(user_id: str) -> str:
    from . import memory, persona

    return persona.PERSONA + " " + persona.CHAT + "\n\n" + memory.context(user_id)


FALLBACK_MODELS = ("gemini-3.5-flash", "gemini-3.8-flash")  # checked live 16 Nov 2026: gemini-2.5-flash is closed to new keys; 3.8 answered 503 or timed out under load, 3.6 and 3.5 answered


def _models() -> list[str]:
    """The model to try first (GEMINI_TEXT_MODEL, else the newest that answered), then the fallbacks, so one busy or retired model never silences the agent."""
    first = os.environ.get("GEMINI_TEXT_MODEL") or "gemini-3.6-flash"
    return [first, *[m for m in FALLBACK_MODELS if m != first]]


def _key() -> str:
    return (os.environ.get("GEMINI_API_KEY") or "").strip()


def _history(user_id: str) -> list[dict]:
    from . import memory

    return [{"role": "user" if m["role"] == "person" else "model", "parts": [{"text": m["body"]}]} for m in memory.recent(user_id, MEMORY_TURNS)]


def _call(contents: list[dict], system: str = "") -> dict:
    body = {"systemInstruction": {"parts": [{"text": system}]}, "contents": contents, "tools": [{"functionDeclarations": registry.declarations()}], "generationConfig": {"temperature": 0.4}}
    last: Exception | None = None
    for model in _models():
        try:
            r = httpx.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", headers={"x-goog-api-key": _key()}, timeout=25, json=body)
        except httpx.TransportError as e:  # a timeout or a dropped connection: the next model
            last = e
            log.warning("text model %s did not answer: %s", model, type(e).__name__)
            continue
        if r.status_code in (404, 429) or r.status_code >= 500:
            last = httpx.HTTPStatusError(f"{r.status_code}", request=r.request, response=r)
            log.warning("text model %s answered %s", model, r.status_code)
            continue
        r.raise_for_status()
        return r.json()
    raise last or RuntimeError("no text model answered")


def reply(user_id: str, channel: str, body: str) -> str:
    if not _key():
        return "My thinking part is not switched on yet, but the quick words work: /today, /tree, /markets."
    from . import memory

    system = _system(user_id)
    contents = _history(user_id) + [{"role": "user", "parts": [{"text": body}]}]
    memory.remember(user_id, channel, "person", body)
    answer = ""
    try:
        for _ in range(MAX_STEPS):
            cand = (_call(contents, system).get("candidates") or [{}])[0].get("content") or {}
            parts = cand.get("parts") or []
            calls = [p["functionCall"] for p in parts if "functionCall" in p]
            answer = "".join(p.get("text", "") for p in parts).strip() or answer
            if not calls:
                break
            contents.append({"role": "model", "parts": parts})
            results = [{"functionResponse": {"name": c["name"], "response": registry.run_for_user(user_id, c["name"], c.get("args") or {})}} for c in calls]
            contents.append({"role": "user", "parts": results})
    except Exception:  # noqa: BLE001 - network, quota, a bad model name: the person gets a calm line, the log gets the cause
        log.exception("text agent failed")
        return "I could not think that through just now. Try /today or /tree, or ask me again in a minute."
    answer = answer or "Done."
    memory.remember(user_id, channel, "agent", answer)
    return answer
