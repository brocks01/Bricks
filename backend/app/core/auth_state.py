"""The two cheap checks on top of a token's signature, so revocation is fast WITHOUT a database call on every request
(the same idea as Jambagrad's "changed at" log, sized for one service):

  logged-out sessions   a list in memory: a signed-out session's token is refused at once.
  changed at            per person, kept in memory for a few seconds: a token issued BEFORE it is answered "refresh" (a ban, a role or
                        permission change, "sign out everywhere"). The app then refreshes once and the new token is right.

If the person's record cannot be read, the request is refused (503), never waved through. This is process-local memory: when Bricks runs
as several processes, the list and the cache move to a shared store (Redis); nothing else changes."""
import time

from sqlalchemy import text

from . import security
from .db import engine

FACT_TTL = 5.0  # seconds a person's facts are reused; far shorter than a token's life
FACT_MAX = 5000
_denied_sessions: set[str] = set()
_facts: dict[str, tuple[str, float, float]] = {}  # user id -> (status, changed_at epoch, fetched at monotonic)


class Unavailable(Exception):
    """The person's record cannot be read right now."""


def deny_session(session_id: str) -> None:
    if len(_denied_sessions) > 100_000:
        _denied_sessions.clear()  # tokens live minutes; a cleared list only matters for sessions older than a token's life
    _denied_sessions.add(str(session_id))


def forget(user_id: str) -> None:
    """Drop the cached facts of one person, so a change is seen at once in this process."""
    _facts.pop(str(user_id), None)


def _fact(user_id: str) -> tuple[str, float]:
    hit = _facts.get(user_id)
    now = time.monotonic()
    if hit and now - hit[2] < FACT_TTL:
        return hit[0], hit[1]
    try:
        with engine().connect() as conn:
            row = conn.execute(text("select status, extract(epoch from auth_changed_at) as changed from users where id = :u"), {"u": user_id}).first()
    except Exception as e:  # noqa: BLE001
        raise Unavailable() from e
    fact = (row.status, float(row.changed)) if row else ("missing", 0.0)
    if len(_facts) >= FACT_MAX:
        _facts.pop(next(iter(_facts)))
    _facts[user_id] = (*fact, now)
    return fact


def verify(token: str, kinds: tuple[str, ...] = (security.ACCESS,)) -> tuple[dict | None, str | None]:
    """(claims, None) when the token is good. Otherwise (None, reason): "invalid", "revoked" (signed out), "expired" (refresh and retry), "gone"."""
    claims = security.read_claims(token, kinds)
    if not claims:
        return None, "invalid"
    if claims["s"] in _denied_sessions:
        return None, "revoked"
    status, changed_at = _fact(str(claims["sub"]))
    if status != "active":
        return None, "gone"
    # `iat` is whole seconds: a token made in the same second as the change passes, so the refresh that follows a change is not refused again.
    if changed_at > 0 and int(claims["iat"]) < int(changed_at):
        return None, "expired"
    return claims, None
