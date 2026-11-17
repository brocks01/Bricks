"""Who has the app or website open right now, and a safe way to tell their screens something.

One connection per open tab or phone ("device"). The hub knows, per person, which devices are live, which page each is on and when each last said it was there.
Two kinds of message go down to a screen:
  {"type": "changed", "topics": ["calendar", "home"], "rev": 12}   something about this person changed (a call, a chat, another device): fetch those again
  {"type": "open", "page": "calendar.today", "params": {}}          show this page (only a page the app knows; the app checks it again)
No data is sent, only what changed: the screen asks for it through its normal signed-in requests, so permissions are never bypassed.
The hub lives in this one server process (right for the pilot). Several servers would need a shared channel (Postgres LISTEN/NOTIFY or Redis) behind the same two functions."""
import asyncio
import logging
import threading
import time
from dataclasses import dataclass, field

log = logging.getLogger("live")
IDLE_SECONDS = 70  # no ping for this long: the screen is gone
MAX_DEVICES = 8  # per person; more than this is a runaway client


@dataclass(eq=False)
class Conn:
    user_id: str
    device: str
    loop: asyncio.AbstractEventLoop
    queue: "asyncio.Queue[dict]"
    page: str = ""
    since: float = field(default_factory=time.time)
    seen: float = field(default_factory=time.time)


_conns: dict[str, set[Conn]] = {}
_rev: dict[str, int] = {}
_lock = threading.Lock()


def register(c: Conn) -> bool:
    with _lock:
        group = _conns.setdefault(c.user_id, set())
        if len(group) >= MAX_DEVICES:
            return False
        group.add(c)
        return True


def unregister(c: Conn) -> None:
    with _lock:
        group = _conns.get(c.user_id)
        if group:
            group.discard(c)
            if not group:
                _conns.pop(c.user_id, None)


def _send(c: Conn, msg: dict) -> bool:
    try:
        c.loop.call_soon_threadsafe(c.queue.put_nowait, msg)
        return True
    except RuntimeError:  # that screen's loop is closed: it is gone
        return False


def publish(user_id: str, msg: dict) -> int:
    """Hands one message to every live screen of this person, from any thread. Returns how many screens it was handed to."""
    with _lock:
        group = list(_conns.get(user_id, ()))
    return sum(1 for c in group if _send(c, msg))


def changed(user_id: str, topics: list[str] | set[str]) -> int:
    """Tells this person's live screens that these things changed. Nothing is stored: a screen that was away refetches everything when it returns."""
    if not user_id or not topics:
        return 0
    with _lock:
        if user_id not in _conns:
            return 0
        _rev[user_id] = _rev.get(user_id, 0) + 1
        rev = _rev[user_id]
    return publish(user_id, {"type": "changed", "topics": sorted(set(topics)), "rev": rev})


def open_page(user_id: str, page: str, params: dict | None = None) -> int:
    return publish(user_id, {"type": "open", "page": page, "params": params or {}})


def devices(user_id: str) -> list[dict]:
    now = time.time()
    with _lock:
        group = list(_conns.get(user_id, ()))
    return sorted(({"device": c.device, "page": c.page, "live_for_s": round(now - c.since), "last_seen_s_ago": round(now - c.seen)} for c in group), key=lambda d: d["device"])


def is_live(user_id: str) -> bool:
    with _lock:
        return bool(_conns.get(user_id))


def current_rev(user_id: str) -> int:
    with _lock:
        return _rev.get(user_id, 0)
