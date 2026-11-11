"""Settings from the environment (and backend/.env in development)."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    supabase_url: str
    supabase_secret_key: SecretStr
    database_url: SecretStr
    # Only for projects still signing tokens with the legacy HS256 secret.
    supabase_jwt_secret: SecretStr | None = None

    # Our tables live in their own schema, which Supabase's Data API doesn't expose,
    # so the app's publishable key can never read them directly.
    db_schema: str = "bricks"

    # Demo mode: requests without a sign-in act as the demo member (Raj), the
    # "on my way" SOS replies are simulated, and POST /demo/reset is on.
    demo_mode: bool = False
    demo_user_id: str = "u_raj"

    storage_bucket: str = "voice"
    cors_origins: list[str] = Field(default_factory=list)

    # Phone calls (voice track). The public https address Twilio calls back to (ngrok
    # locally). Webhook signatures are checked against it, so it must match the
    # address set on the Twilio number exactly.
    public_base_url: str = "http://localhost:8000"
    twilio_account_sid: str = ""
    twilio_auth_token: SecretStr | None = None
    twilio_number: str = ""
    # Keep on everywhere except quick local curl tests.
    twilio_validate_signature: bool = True

    @property
    def supabase_issuer(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
