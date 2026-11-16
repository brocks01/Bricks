"""Placing and hanging up calls. The rules that protect people and money all live here, before anything is dialled:
only numbers on the allowlist, only with the administrator's word that the person agreed, one call at a time, and a cap per hour."""
import logging

from . import logic as L, store, tools
from .config import config, status
from .session import hangup_live, live_count
from .twilio import CallRefused, provider_for

log = logging.getLogger("voice")


class Refused(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(message)
        self.status_code, self.code, self.message = status_code, code, message


async def start_call(data: dict, admin_id: str = "admin") -> dict:
    cfg = config()
    provider = provider_for(cfg)
    if not provider:
        raise Refused(503, "PROVIDER_UNKNOWN", f'VOICE_PROVIDER "{cfg.provider}" is not one of: twilio, mock')
    if not provider.ready:
        raise Refused(503, "PROVIDER_NOT_READY", "The provider is not set up: for Twilio it needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER and VOICE_PUBLIC_URL")
    if not cfg.gemini_key:
        raise Refused(503, "NO_AI_KEY", "GEMINI_API_KEY is not set")

    to = L.normalize_number(data.get("to"))
    if not L.is_e164(to):
        raise Refused(400, "BAD_NUMBER", "The number must be in international form, like +6591234567")
    if not L.is_allowed(to, cfg.allowed_numbers):
        raise Refused(403, "NUMBER_NOT_ALLOWED", "That number is not on the allowed list (VOICE_ALLOWED_NUMBERS)")
    if data.get("consent") is not True:
        raise Refused(400, "CONSENT_REQUIRED", "Confirm that the person agreed to receive this test call")

    language = data.get("language") or "auto"
    if language not in L.LANGUAGES:
        raise Refused(400, "BAD_LANGUAGE", f"Language must be one of: {', '.join(L.LANGUAGES)}")
    brief = str(data.get("brief") or "")
    if len(brief) > L.MAX_BRIEF:
        raise Refused(400, "BRIEF_TOO_LONG", f"The brief can be at most {L.MAX_BRIEF} characters")
    bad = tools.unknown(data.get("tools"))
    if bad:
        raise Refused(400, "BAD_TOOL", f"Unknown tool: {', '.join(bad)}. Available: {', '.join(tools.names())}")
    if store.active_count() > 0:
        raise Refused(409, "CALL_IN_PROGRESS", "A call is already in progress. Hang it up first.")
    if store.started_since(3600) >= cfg.max_calls_per_hour:
        raise Refused(429, "RATE_LIMITED", f"At most {cfg.max_calls_per_hour} calls an hour")

    if data.get("user_id"):  # the same companion as in the chats: persona and what it knows about this person
        from ..channels import memory, persona

        brief = _with_memory(brief + "\n\n" + persona.PERSONA + " " + persona.PHONE, memory.context(str(data["user_id"]), 900))
    rec = store.create(to=to, language=language, brief=brief, voice=str(data.get("voice") or "")[:40], name=L.clean_name(data.get("name")),
                       tools=tools.pick(data.get("tools")), consent=True, by_admin=admin_id, provider=provider.name, **{"from": cfg.twilio_from},
                       reminder=data.get("reminder") if isinstance(data.get("reminder"), dict) else None,
                       user_id=str(data["user_id"]) if data.get("user_id") else None)  # the person this call acts for (their skills); None = web tools only
    try:
        placed = await provider.create_call(to, rec["call_id"])
        store.update(rec["call_id"], provider_sid=placed["sid"], status="ringing" if provider.name == "twilio" else "queued")
    except CallRefused as e:
        store.update(rec["call_id"], status="failed", error=str(e)[:300], end_reason="start-failed")
        raise Refused(e.status, e.code, str(e))
    except Exception as e:  # noqa: BLE001
        store.update(rec["call_id"], status="failed", error=type(e).__name__, end_reason="start-failed")
        log.warning("[voice] call %s could not be placed: %s: %s", rec["call_id"][:8], type(e).__name__, str(e)[:120])
        raise Refused(502, "PROVIDER_UNREACHABLE", "The call could not be placed.")
    log.info("[voice] call %s placed to %s (%s, %s)", rec["call_id"][:8], L.mask(to), provider.name, language)
    return store.public_view(rec)


INBOUND_BRIEF = ("The person is calling YOU, Wisdom. Greet them warmly by name, say it is good to hear from them, and ask how you can help. "
                 "You can tell them what is on today, how their tree is growing, note something for them, or tell them about gatherings and market events.")


def _with_memory(head: str, memory_text: str) -> str:
    """The call brief has a length limit. What the agent knows about the person must never be the part that is cut: shorten the instructions instead."""
    keep = max(0, L.MAX_BRIEF - len(memory_text) - 2)
    return (head[:keep].rstrip() + "\n\n" + memory_text)[:L.MAX_BRIEF]


def accept_inbound(from_number: str, call_sid: str) -> tuple[dict | None, str]:
    """A person dials the Wisdom number. Returns (call record, "") if they may talk, or (None, reason): unknown number, busy, or too many calls.
    The caller's number only says WHICH account to open; anything risky still needs the person's spoken yes (skills with risk "confirm")."""
    from ..channels import core, memory, persona
    from ..skills import registry

    cfg = config()
    number = L.normalize_number(from_number)
    from ..channels import guard

    recent = sum(1 for r in store._calls.values() if r.get("direction") == "inbound" and r.get("to") == number and (store._now() - r["created_at"]).total_seconds() < 3600)
    if guard.blocked(number):
        return None, "unknown"
    if not guard.calls_allowed(number, recent):
        return None, "limit"
    user_id = core.resolve("phone", number)[0] if L.is_e164(number) else None
    if user_id is None:
        return None, "unknown"
    for r in list(store._calls.values()):  # a caller who hung up before the audio opened leaves a "ringing" record that would block everyone: drop it after 90 s
        if r.get("direction") == "inbound" and r["status"] == "ringing" and (store._now() - r["created_at"]).total_seconds() > 90:
            store.update(r["call_id"], status="failed", ended_at=store._now(), end_reason="never-connected")
    if store.active_count() > 0:
        return None, "busy"
    if store.started_since(3600) >= cfg.max_calls_per_hour:
        return None, "limit"
    from sqlalchemy import text

    from ...core.db import engine

    with engine().connect() as conn:
        name = conn.execute(text("select coalesce(nullif(split_part(display_name, ' ', 1), ''), '') from users where id = :u"), {"u": user_id}).scalar() or ""
    brief = _with_memory(INBOUND_BRIEF + "\n\n" + persona.PERSONA + " " + persona.PHONE, memory.context(user_id, 900))
    rec = store.create(to=number, language="auto", brief=brief, voice="", name=L.clean_name(name), tools=["web_search", *[s["name"] for s in registry.listing(voice_only=True)]],
                       consent=True, by_admin="inbound", provider="twilio" if cfg.provider == "twilio" else cfg.provider, provider_sid=call_sid, status="ringing",
                       direction="inbound", user_id=user_id, **{"from": number})
    return rec, ""


async def hang_up(call_id: str) -> dict:
    rec = store.get_live(call_id)
    if not rec:
        raise Refused(404, "NOT_FOUND", "No such call")
    if not hangup_live(call_id, "admin-hangup") and rec["status"] in store.ACTIVE:
        p = provider_for(config())
        if p and rec["provider_sid"]:
            await p.hangup(rec["provider_sid"])
        store.update(call_id, status="canceled", end_reason="admin-hangup")
    return store.public_view(store.get_live(call_id))


def get_call(call_id: str) -> dict:
    rec = store.get_live(call_id)
    if not rec:
        raise Refused(404, "NOT_FOUND", "No such call")
    return store.public_view(rec)


def overview() -> dict:
    return {**status(), "allowed": len(config().allowed_numbers), "tools": tools.listing(), "languages": L.LANGUAGES, "active_calls": store.active_count(), "live_sockets": live_count(), "persisted": False}
