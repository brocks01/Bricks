"""Identity: email one-time-code sign-in, sessions, and the person's profile. Plain functions over one database connection."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import Connection, text

from ...core import auth_state, mail, security
from ...core.config import get_settings

MAX_ATTEMPTS = 5
MAX_CODES_PER_HOUR = 5
MIN_SECONDS_BETWEEN_CODES = 30
PROFILE_COLUMNS = ("display_name", "language", "age_band", "phone", "area_name", "tz_offset_min", "spoken_languages", "comm_language", "interests", "voice_intro_url")


class AuthError(Exception):
    """A refusal with a machine code the app turns into words in the person's language."""

    def __init__(self, code: str, status: int = 400, **extra):
        super().__init__(code)
        self.code, self.status, self.extra = code, status, extra


def _now() -> datetime:
    return datetime.now(timezone.utc)


def clean_email(email: str) -> str:
    return email.strip().lower()


def user_dict(row) -> dict:
    return {
        "id": str(row.id),
        "email": row.email,
        "display_name": row.display_name,
        "language": row.language,
        "age_band": row.age_band,
        "phone": row.phone,
        "area_name": row.area_name,
        "tz_offset_min": row.tz_offset_min,
        "spoken_languages": list(row.spoken_languages or []),
        "comm_language": row.comm_language,
        "interests": list(row.interests or []),
        "voice_intro_url": row.voice_intro_url,
        "login_kind": row.login_kind,
        "profile_complete": bool(row.display_name and row.display_name.strip()),
    }


def request_code(conn: Connection, email: str) -> tuple[str, int]:
    email = clean_email(email)
    s = get_settings()
    recent = conn.execute(
        text("select count(*) as n, max(created_at) as last from login_codes where email = :e and created_at > now() - interval '1 hour'"), {"e": email}
    ).one()
    if recent.n >= MAX_CODES_PER_HOUR:
        raise AuthError("rate_limited", 429, retry_after=3600)
    if recent.last is not None:
        wait = MIN_SECONDS_BETWEEN_CODES - (_now() - recent.last).total_seconds()
        if wait > 0:
            raise AuthError("rate_limited", 429, retry_after=int(wait) + 1)
    # The free email plan has a daily cap (copied from the Jambagrad sender pool idea): past it, new codes wait until tomorrow.
    if mail.configured():
        today = conn.execute(text("select count(*) from login_codes where created_at >= date_trunc('day', now())")).scalar_one()
        if today >= mail.daily_limit():
            raise AuthError("email_busy", 503)
    code = security.new_code()
    conn.execute(
        text("insert into login_codes (email, code_hash, expires_at) values (:e, :h, :x)"),
        {"e": email, "h": security.hash_code(email, code), "x": _now() + timedelta(minutes=s.code_minutes)},
    )
    try:
        mail.send_login_code(email, code, s.code_minutes)
    except mail.MailError as e:
        raise AuthError("email_failed", 502, reason=e.code)
    return code, s.code_minutes * 60


def _issue_session(conn: Connection, user_id: str, user_agent: str, session_id: str | None = None) -> tuple[str, str]:
    """A new refresh token (kept as a hash) and an access token. A refresh keeps the SAME session id, so one sign-out ends the whole session."""
    s = get_settings()
    refresh = security.new_refresh_token()
    row = conn.execute(
        text("insert into refresh_tokens (user_id, token_hash, expires_at, user_agent, session_id) values (:u, :h, :x, :ua, coalesce(cast(:sid as uuid), gen_random_uuid())) returning session_id"),
        {"u": user_id, "h": security.hash_token(refresh), "x": _now() + timedelta(days=s.refresh_days), "ua": user_agent[:200], "sid": session_id},
    ).one()
    return security.make_access_token(user_id, str(row.session_id)), refresh


def verify_code(conn: Connection, email: str, code: str, user_agent: str = "") -> dict:
    email = clean_email(email)
    row = conn.execute(
        text("select id, code_hash, attempts from login_codes where email = :e and used_at is null and expires_at > now() order by created_at desc limit 1 for update"),
        {"e": email},
    ).first()
    if row is None:
        raise AuthError("code_invalid")
    if row.attempts >= MAX_ATTEMPTS:
        raise AuthError("too_many_attempts", 429)
    if not security.same(row.code_hash, security.hash_code(email, code)):
        # The router answers with a normal response (not an exception) so this count is saved even though we refuse the request.
        conn.execute(text("update login_codes set attempts = attempts + 1 where id = :i"), {"i": row.id})
        raise AuthError("code_invalid")
    conn.execute(text("update login_codes set used_at = now() where id = :i"), {"i": row.id})
    user = conn.execute(text("select * from users where email = :e"), {"e": email}).first()
    is_new = user is None
    if is_new:
        user = conn.execute(text("insert into users (email) values (:e) returning *"), {"e": email}).one()
    access, refresh = _issue_session(conn, str(user.id), user_agent)
    return {"access_token": access, "refresh_token": refresh, "user": user_dict(user), "is_new": is_new}


def verify_google_token(id_token: str) -> dict:
    """Checks a Google ID token (signature, expiry, our client id as audience). Returns its claims, or raises AuthError."""
    client_id = get_settings().google_client_id
    if not client_id:
        raise AuthError("provider_off", 503)
    from google.auth.transport import requests as g_requests
    from google.oauth2 import id_token as g_id_token

    try:
        claims = g_id_token.verify_oauth2_token(id_token, g_requests.Request(), client_id, clock_skew_in_seconds=10)
    except ValueError:
        raise AuthError("token_invalid", 401)
    except Exception:  # Google's key server not reachable
        raise AuthError("provider_unavailable", 503)
    if claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise AuthError("token_invalid", 401)
    if claims.get("email_verified") is not True or not claims.get("email"):
        raise AuthError("email_not_verified", 400)  # an unverified address proves nothing about who owns it
    return claims


DEMO_FIRST = ["Lim", "Tan", "Ng", "Wong", "Chua", "Goh", "Teo", "Koh", "Rahmah", "Aminah", "Kumar", "Devi", "Muthu", "Selvi", "Anthony", "Cecilia", "Priya", "Daniel", "Mei Lin", "Siew Hwa"]
DEMO_LAST = ["Kok Leong", "Bee Choo", "binte Ismail", "bin Hamid", "Pillai", "Nair", "D'Cruz", "Pereira", "Subramaniam", "Hock Seng", "Mei Hwa", "Krishnan"]


def demo_sign_in(conn: Connection, user_agent: str = "") -> dict:
    """PROTOTYPE ONLY: a throwaway account with a random name and a random address, signed in at once with no code. The address ends in @demo.wisdom.test
    so these accounts can always be told apart and removed. Used by the 'Start demo' button."""
    import secrets

    email = f"demo-{secrets.token_hex(4)}@demo.wisdom.test"
    name = f"{secrets.choice(DEMO_FIRST)} {secrets.choice(DEMO_LAST)}"
    user = conn.execute(text("insert into users (email, display_name) values (:e, :n) returning *"), {"e": email, "n": name}).one()
    access, refresh = _issue_session(conn, str(user.id), user_agent)
    return {"access_token": access, "refresh_token": refresh, "user": user_dict(user), "is_new": True}


def google_sign_in(conn: Connection, id_token: str, user_agent: str = "") -> dict:
    claims = verify_google_token(id_token)
    email = clean_email(claims["email"])
    user = conn.execute(text("select * from users where email = :e"), {"e": email}).first()
    is_new = user is None
    if is_new:
        name = (claims.get("name") or "").strip()[:80] or None
        user = conn.execute(text("insert into users (email, display_name) values (:e, :n) returning *"), {"e": email, "n": name}).one()
    elif user.status != "active":
        raise AuthError("unauthorized", 401)
    access, refresh = _issue_session(conn, str(user.id), user_agent)
    return {"access_token": access, "refresh_token": refresh, "user": user_dict(user), "is_new": is_new}


def providers() -> dict:
    s = get_settings()
    return {"email": True, "google": bool(s.google_client_id), "singpass": bool(s.singpass_client_id), "digilocker": bool(s.digilocker_client_id)}


def refresh_session(conn: Connection, token: str, user_agent: str = "") -> dict:
    row = conn.execute(
        text("select id, user_id, session_id from refresh_tokens where token_hash = :h and revoked_at is null and expires_at > now() for update"),
        {"h": security.hash_token(token)},
    ).first()
    if row is None:
        raise AuthError("unauthorized", 401)
    conn.execute(text("update refresh_tokens set revoked_at = now() where id = :i"), {"i": row.id})
    user = conn.execute(text("select * from users where id = :u and status = 'active'"), {"u": row.user_id}).first()
    if user is None:
        raise AuthError("unauthorized", 401)
    access, refresh = _issue_session(conn, str(user.id), user_agent, str(row.session_id))
    return {"access_token": access, "refresh_token": refresh, "user": user_dict(user), "is_new": False}


def sign_out(conn: Connection, token: str) -> None:
    """Ends the whole session: every refresh token of it, and (at once, in memory) the access tokens still alive."""
    row = conn.execute(text("select session_id from refresh_tokens where token_hash = :h"), {"h": security.hash_token(token)}).first()
    if row is None:
        return
    conn.execute(text("update refresh_tokens set revoked_at = now() where session_id = :s and revoked_at is null"), {"s": row.session_id})
    auth_state.deny_session(str(row.session_id))


def mark_changed(conn: Connection, user_id: str) -> None:
    """Something that tokens depend on changed for this person (a ban, a role or permission change): tokens issued before now answer "refresh"."""
    conn.execute(text("update users set auth_changed_at = now() where id = :u"), {"u": user_id})
    auth_state.forget(user_id)


def get_user(conn: Connection, user_id: str):
    return conn.execute(text("select * from users where id = :u and status = 'active'"), {"u": user_id}).first()


def open_from_contact(conn: Connection, phone: str | None = None) -> str:
    """An account for a person who reached Wisdom from a phone call, WhatsApp, SMS or Telegram, with no email yet. Which interface they came from does not matter:
    this is the one way such an account is made. They fill in the rest by onboarding (the agent asks), and may add an email later."""
    return str(conn.execute(text("insert into users (email, phone) values (null, :p) returning id"), {"p": phone}).scalar_one())


def update_profile(conn: Connection, user_id: str, fields: dict) -> dict:
    fields = {k: v for k, v in fields.items() if k in PROFILE_COLUMNS}
    if "display_name" in fields and fields["display_name"] is not None:
        fields["display_name"] = fields["display_name"].strip()
        if not fields["display_name"]:
            raise AuthError("validation", 422, field="display_name")
    if "spoken_languages" in fields and fields["spoken_languages"] is None:
        fields["spoken_languages"] = []  # the column is never null: no languages set
    if "interests" in fields and fields["interests"] is None:
        fields["interests"] = []  # likewise: no interests chosen rather than "unknown"
    if fields:
        sets = ", ".join(f"{k} = cast(:{k} as text[])" if k in ("spoken_languages", "interests") else f"{k} = :{k}" for k in fields)
        row = conn.execute(text(f"update users set {sets}, updated_at = now() where id = :u returning *"), {**fields, "u": user_id}).one()
    else:
        row = get_user(conn, user_id)
    return user_dict(row)
