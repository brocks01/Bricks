"""Spam and abuse safety for every interface, in one place. A chat, a WhatsApp number or a caller can be flooded by a stranger or a script, and every reply costs AI money,
so the limits sit in front of the agent, before anything runs: a blocklist, a burst and an hourly limit per sender, a daily limit of agent replies per person, and a cap on very long messages.
All numbers can be changed with environment variables; the defaults suit a pilot.

  WISDOM_BLOCKED            comma-separated senders to ignore (phone numbers like +6591234567, or chat ids)
  WISDOM_MSG_BURST          messages allowed per minute per sender            (default 8)
  WISDOM_MSG_PER_HOUR       messages allowed per hour per sender              (default 60)
  WISDOM_REPLIES_PER_DAY    agent replies per person per day                  (default 300)
  WISDOM_CALLS_PER_NUMBER   inbound calls per number per hour                 (default 4)
"""
import os
import threading
import time
from collections import defaultdict, deque

from sqlalchemy import text

from ...core.db import engine

MAX_BODY = 1000
SLOW_DOWN = "I'm getting a lot of messages at once. Let's pause for a minute, then carry on."
TOO_MUCH_TODAY = "We've talked a lot today! I'll be here again tomorrow, and you can still use /today and /tree."

_lock = threading.Lock()
_seen: dict[tuple[str, str], deque] = defaultdict(deque)
_warned: dict[tuple[str, str], float] = {}


def _num(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name) or default)
    except ValueError:
        return default


def blocked(sender: str) -> bool:
    return sender in {x.strip() for x in (os.environ.get("WISDOM_BLOCKED") or "").split(",") if x.strip()}


def check(channel: str, sender: str, now: float | None = None) -> list[str] | None:
    """None: carry on. A list: send these lines (possibly none, which means stay silent) and stop. The first time over the limit the sender is told once; after that they get silence until it passes."""
    if blocked(sender):
        return []
    now = time.time() if now is None else now
    key = (channel, sender)
    with _lock:
        q = _seen[key]
        while q and now - q[0] > 3600:
            q.popleft()
        q.append(now)
        minute = sum(1 for t in q if now - t <= 60)
        if minute > _num("WISDOM_MSG_BURST", 8) or len(q) > _num("WISDOM_MSG_PER_HOUR", 60):
            if now - _warned.get(key, 0) > 300:
                _warned[key] = now
                return [SLOW_DOWN]
            return []
    return None


def too_many_replies_today(user_id: str) -> bool:
    with engine().connect() as conn:
        n = conn.execute(text("select count(*) from channel_messages where user_id = :u and role = 'agent' and created_at > now() - interval '1 day'"), {"u": user_id}).scalar_one()
    return n >= _num("WISDOM_REPLIES_PER_DAY", 300)


def clip(body: str) -> str:
    return body[:MAX_BODY]


def calls_allowed(number: str, recent_from_number: int) -> bool:
    """For an inbound call: not blocked, and under the hourly limit for this number."""
    return not blocked(number) and recent_from_number < _num("WISDOM_CALLS_PER_NUMBER", 4)


def reset() -> None:
    with _lock:
        _seen.clear()
        _warned.clear()
