"""Settings come from environment variables. For local work they are read from backend/.env (never committed, never shared)."""
import os
from dataclasses import dataclass
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
    singpass_client_id: str  # empty until Bricks is registered with Singpass; sign-in stays off
    digilocker_client_id: str  # empty until Bricks is registered with DigiLocker (API Setu); sign-in stays off

    @property
    def is_dev(self) -> bool:
        return self.app_env != "prod"


def get_settings() -> Settings:
    url = os.environ.get("DATABASE_URL", "")
    secret = os.environ.get("JWT_SECRET", "")
    if not url or not secret:
        raise RuntimeError("DATABASE_URL and JWT_SECRET must be set (see backend/.env.example).")
    return Settings(
        database_url=url,
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
    )
