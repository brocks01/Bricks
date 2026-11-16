"""Small, dependency-free security helpers: signed access tokens (HS256), keyed hashes for codes, random tokens.

The access token is STATELESS: checking it needs only the signature, the expiry and a few fixed claims, no database call.
  sub  the person            t  type: "a" access, "g" agent (an agent token is for the in-app agent: shorter, never wider than its owner)
  s    the session id        iss/aud  "wisdom"        iat/exp  issued at / expires at (15 minutes by default)
Instant revocation without a database call per request is in auth_state.py (a logged-out session list and a per-person "changed at")."""
import base64
import hashlib
import hmac
import json
import secrets
import time

from .config import get_settings

ISSUER = "wisdom"
AUDIENCE = "wisdom"
ACCESS, AGENT = "a", "g"


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _sign(signing_input: str) -> str:
    return _b64(hmac.new(get_settings().jwt_secret.encode(), signing_input.encode(), hashlib.sha256).digest())


def make_access_token(user_id: str, session_id: str, kind: str = ACCESS, minutes: int | None = None) -> str:
    s = get_settings()
    now = int(time.time())
    life = (minutes if minutes is not None else s.access_minutes) * 60
    header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    claims = {"sub": user_id, "t": kind, "s": session_id, "iss": ISSUER, "aud": AUDIENCE, "iat": now, "exp": now + life}
    payload = _b64(json.dumps(claims, separators=(",", ":")).encode())
    return f"{header}.{payload}.{_sign(f'{header}.{payload}')}"


def read_claims(token: str, kinds: tuple[str, ...] = (ACCESS,)) -> dict | None:
    """The token's claims if it is genuine, not expired, ours, and of an allowed type. Otherwise None. No database."""
    try:
        header, payload, sig = token.split(".")
        if json.loads(_unb64(header)).get("alg") != "HS256":  # never trust the token to choose its own algorithm
            return None
        if not hmac.compare_digest(sig, _sign(f"{header}.{payload}")):
            return None
        c = json.loads(_unb64(payload))
        if int(c["exp"]) < time.time() or c.get("iss") != ISSUER or c.get("aud") != AUDIENCE or c.get("t") not in kinds or not c.get("sub") or not c.get("s"):
            return None
        return c
    except Exception:  # noqa: BLE001 - anything unreadable is simply "not a valid token"
        return None


def read_access_token(token: str) -> str | None:
    """Returns the user id if the token is a genuine, unexpired access token, else None (signature and claims only)."""
    c = read_claims(token)
    return str(c["sub"]) if c else None


def new_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_code(email: str, code: str) -> str:
    return hmac.new(get_settings().jwt_secret.encode(), f"{email}:{code}".encode(), hashlib.sha256).hexdigest()


def same(a: str, b: str) -> bool:
    return hmac.compare_digest(a, b)


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
