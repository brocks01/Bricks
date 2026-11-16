"""Settings come from environment variables. For local work they are read from backend/.env (never committed, never shared)."""
import os
import re
from dataclasses import dataclass
from urllib.parse import quote, unquote
from pathlib import Path

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


def _load_env_file() -> None:
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env_file()


@dataclass(frozen=True)
class Settings:
    database_url: str
    jwt_secret: str
    app_env: str  # "dev" or "prod". In dev the login code is also returned by the API so you can test without email.
    access_minutes: int
    refresh_days: int
    code_minutes: int
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    email_from: str
    google_client_id: str  # public id, not a secret; empty means Google sign-in is off
    singpass_client_id: str  # empty until Interchange is registered with Singpass; sign-in stays off
    digilocker_client_id: str  # empty until Interchange is registered with DigiLocker (API Setu); sign-in stays off

    # Translation of member-written content. The provider KEYS are not here: GEMINI_API_KEY is read by the
    # provider module itself, exactly like the voice module reads it, and GOOGLE_TRANSLATE_API_KEY below is
    # the only one of these that can hold a secret (empty = Google Cloud Translation stays off).
    translate_providers: str  # ordered, comma separated: which providers to try, and in what order
    translate_daily_chars_per_user: int
    translate_daily_chars_total: int
    google_translate_api_key: str  # optional; empty = the Google provider is skipped
    local_translate_url: str  # optional; empty = the self-hosted provider is skipped
    translate_timeout_seconds: float

    @property
    def is_dev(self) -> bool:
        return self.app_env != "prod"


def clean_database_url(url: str) -> str:
    """Make a pasted database address safe to use. Hosts like Supabase and Render give `postgres://user:password@host:port/db`, and people paste the
    password raw, so a password with an @, :, / or # breaks the address. The LAST @ is the one before the host, so everything before it is the user and
    password: it is percent-encoded here (an already-encoded one is left as it was), and `postgres://` becomes `postgresql://`, which SQLAlchemy needs."""
    m = re.match(r"^(postgres(?:ql)?(?:\+\w+)?)://(.*)@([^@/]+(?::\d+)?(?:/.*)?)$", url.strip())
    if not m:
        return url.strip()
    scheme, userinfo, rest = m.groups()
    user, sep, password = userinfo.partition(":")
    safe = quote(unquote(user), safe="") + (":" + quote(unquote(password), safe="") if sep else "")
    scheme = "postgresql" + scheme[len("postgres"):] if scheme.startswith("postgres") and not scheme.startswith("postgresql") else scheme
    return f"{scheme}://{safe}@{rest}"


def get_settings() -> Settings:
    url = os.environ.get("DATABASE_URL", "")
    secret = os.environ.get("JWT_SECRET", "")
    if not url or not secret:
        raise RuntimeError("DATABASE_URL and JWT_SECRET must be set (see backend/.env.example).")
    return Settings(
        database_url=clean_database_url(url),
        jwt_secret=secret,
        app_env=os.environ.get("APP_ENV", "dev"),
        access_minutes=int(os.environ.get("ACCESS_MINUTES", "15")),
        refresh_days=int(os.environ.get("REFRESH_DAYS", "30")),
        code_minutes=int(os.environ.get("CODE_MINUTES", "10")),
        smtp_host=os.environ.get("SMTP_HOST", ""),
        smtp_port=int(os.environ.get("SMTP_PORT", "587")),
        smtp_user=os.environ.get("SMTP_USER", ""),
        smtp_password=os.environ.get("SMTP_PASSWORD", ""),
        email_from=os.environ.get("EMAIL_FROM", ""),
        google_client_id=os.environ.get("GOOGLE_CLIENT_ID", ""),
        singpass_client_id=os.environ.get("SINGPASS_CLIENT_ID", ""),
        digilocker_client_id=os.environ.get("DIGILOCKER_CLIENT_ID", ""),
        translate_providers=os.environ.get("TRANSLATE_PROVIDERS", "gemini,google,local"),
        translate_daily_chars_per_user=int(os.environ.get("TRANSLATE_DAILY_CHARS_PER_USER", "20000")),
        translate_daily_chars_total=int(os.environ.get("TRANSLATE_DAILY_CHARS_TOTAL", "500000")),
        google_translate_api_key=os.environ.get("GOOGLE_TRANSLATE_API_KEY", "").strip(),
        local_translate_url=os.environ.get("LOCAL_TRANSLATE_URL", "").strip(),
        translate_timeout_seconds=float(os.environ.get("TRANSLATE_TIMEOUT_SECONDS", "15")),
    )
