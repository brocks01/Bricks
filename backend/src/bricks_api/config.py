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

    # The https address Twilio and Meta call us on (ngrok in development). Twilio
    # signs the full URL, so it must match what's set in the Twilio console.
    public_base_url: str = ""

    # ---- WhatsApp (docs/06) ----
    # Meta Cloud API: developers.facebook.com -> your app -> WhatsApp -> API Setup.
    meta_wa_token: SecretStr | None = None
    meta_wa_phone_number_id: str = ""
    meta_wa_waba_id: str = ""
    meta_app_secret: SecretStr | None = None
    meta_wa_verify_token: SecretStr | None = None
    meta_graph_version: str = "v20.0"
    # Twilio WhatsApp sandbox (backup route, walk-up judges).
    twilio_account_sid: str = ""
    twilio_auth_token: SecretStr | None = None
    twilio_wa_sandbox_number: str = "+14155238886"
    twilio_wa_join_code: str = ""
    twilio_validate_signature: bool = True
    # Runs the 8 am check-in, reminders and the missed check-in ladder. Off in tests.
    wa_scheduler: bool = False
    # Minutes instead of hours between the check-in ladder's steps (stage demo).
    demo_fast_escalation: bool = False

    # Speech for voice notes (Google AI Studio).
    gemini_api_key: SecretStr | None = None
    gemini_model: str = "gemini-flash-latest"

    @property
    def supabase_issuer(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
