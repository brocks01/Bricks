"""What we remember during one phone call, keyed by Twilio's CallSid.

Kept in memory for 10 minutes after the last turn (a call never lasts that long
between turns). One API process serves calls for now; with more than one, this moves
to Redis with the same interface.
"""

import time
from dataclasses import dataclass, field
from typing import Any, Literal

from ..schemas import Language

TTL_S = 10 * 60

PendingKind = Literal["join", "remind", "remind_time", "remind_what"]


@dataclass
class Pending:
    """Something we asked "Is that right?" about, waiting for yes or no."""

    kind: PendingKind
    data: dict[str, Any] = field(default_factory=dict)


@dataclass
class CallState:
    user_id: str | None
    lang: Language = "en"
    pending: Pending | None = None
    silences: int = 0
    misses: int = 0
    touched: float = field(default_factory=time.monotonic)


_calls: dict[str, CallState] = {}


def get(call_sid: str) -> CallState | None:
    _expire()
    state = _calls.get(call_sid)
    if state:
        state.touched = time.monotonic()
    return state


def put(call_sid: str, state: CallState) -> CallState:
    _expire()
    _calls[call_sid] = state
    return state


def end(call_sid: str) -> None:
    _calls.pop(call_sid, None)


def _expire() -> None:
    cutoff = time.monotonic() - TTL_S
    for sid in [s for s, st in _calls.items() if st.touched < cutoff]:
        del _calls[sid]
