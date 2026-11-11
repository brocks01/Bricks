"""Where calls are kept. The live truth during a call is in memory (the media socket needs it in microseconds). Memory only for now: history is
lost on a restart (the overview says so)."""
import secrets
import uuid
from datetime import datetime, timezone

MAX_IN_MEMORY = 200
ACTIVE = ["queued", "ringing", "in-progress"]
_calls: dict[str, dict] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create(**fields) -> dict:
    call_id = str(uuid.uuid4())
    r = {
        "call_id": call_id, "to": "", "from": "", "provider": "", "provider_sid": "", "status": "queued", "language": "auto", "voice": "", "brief": "",
        "name": "", "tools": [], "consent": False, "started_at": None, "ended_at": None, "duration_s": 0, "end_reason": "", "error": "",
        "usage": {"prompt_tokens": 0, "completion_tokens": 0}, "transcript": [], "created_at": _now(), "updated_at": _now(),
        **fields,
        "_token": secrets.token_hex(24),
        "_open": {"agent": False, "person": False},  # which side's transcript line is still being spoken
    }
    _calls[call_id] = r
    while len(_calls) > MAX_IN_MEMORY:
        _calls.pop(next(iter(_calls)))
    return r


def get_live(call_id: str | None) -> dict | None:
    return _calls.get(call_id or "")


def update(call_id: str, **patch) -> dict | None:
    r = _calls.get(call_id)
    if r:
        r.update(patch, updated_at=_now())
    return r


def append_transcript(call_id: str, role: str, text: str) -> None:
    """Fragments of one spoken turn join the same line until the turn is closed."""
    r = _calls.get(call_id)
    if not r or not text:
        return
    last = r["transcript"][-1] if r["transcript"] else None
    if last and last["role"] == role and r["_open"][role]:
        last["text"] += text
    else:
        r["transcript"].append({"role": role, "text": text, "at": _now()})
    r["_open"][role] = True
    r["updated_at"] = _now()


def add_line(call_id: str, role: str, text: str) -> None:
    """One whole line of its own (a tool being used, for example): never joined to the line before it."""
    r = _calls.get(call_id)
    if r and text:
        r["transcript"].append({"role": role, "text": text, "at": _now()})
        r["updated_at"] = _now()


def close_role(call_id: str, role: str) -> None:
    r = _calls.get(call_id)
    if r:
        r["_open"][role] = False


def close_turn(call_id: str) -> None:
    r = _calls.get(call_id)
    if r:
        r["_open"] = {"agent": False, "person": False}


def public_view(r: dict | None) -> dict | None:
    """The record without anything that opens the media stream (the secret token)."""
    if not r:
        return None
    return {k: v for k, v in r.items() if not k.startswith("_")}


def listing(limit: int = 50) -> list[dict]:
    rows = sorted(_calls.values(), key=lambda r: r["created_at"], reverse=True)[:limit]
    return [{**{k: v for k, v in public_view(r).items() if k != "transcript"}, "transcript_lines": len(r["transcript"])} for r in rows]


def active_count() -> int:
    return sum(1 for r in _calls.values() if r["status"] in ACTIVE)


def started_since(seconds: float) -> int:
    cutoff = _now().timestamp() - seconds
    return sum(1 for r in _calls.values() if r["created_at"].timestamp() >= cutoff)


def clear() -> None:  # tests only
    _calls.clear()
