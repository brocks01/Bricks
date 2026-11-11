"""Tests run the real app against a throwaway `bricks_test` schema in the same
Supabase Postgres (seeded once per run), with a fake file store and a clock
we can move forward. Tests that change data sign in as a fresh member each,
so they don't depend on each other's order.
"""

import asyncio
import secrets
import time
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

import httpx
import jwt
import pytest
from fastapi import FastAPI
from psycopg import AsyncConnection, sql
from psycopg.rows import dict_row

from bricks_api.config import Settings
from bricks_api.db import loop_factory, migrate
from bricks_api.main import create_app
from bricks_api.seed import seed
from bricks_api.whatsapp.models import Outbound, SendResult
from bricks_api.whatsapp.providers import Meta, Twilio
from bricks_api.whatsapp.speech import Intent, Speech

TEST_SCHEMA = "bricks_test"


def pytest_asyncio_loop_factories(
    config: pytest.Config, item: pytest.Item
) -> dict[str, Callable[[], asyncio.AbstractEventLoop]]:
    # psycopg's async mode can't use Windows' default (Proactor) loop.
    factory = loop_factory()
    return {"selector": factory} if factory else {"default": asyncio.new_event_loop}


@dataclass
class Clock:
    """Real time, unless frozen; `advance` moves it forward either way."""

    offset: timedelta = field(default_factory=timedelta)
    frozen: datetime | None = None

    def __call__(self) -> datetime:
        return (self.frozen or datetime.now(UTC)) + self.offset

    def advance(self, seconds: float) -> None:
        self.offset += timedelta(seconds=seconds)

    def freeze(self) -> None:
        self.frozen = datetime.now(UTC)

    def reset(self) -> None:
        self.frozen, self.offset = None, timedelta()


class FakeStorage:
    def __init__(self) -> None:
        self.saved: list[tuple[str, int, str]] = []

    async def put(self, folder: str, data: bytes, content_type: str) -> str:
        self.saved.append((folder, len(data), content_type))
        return f"https://storage.test/{folder}/{len(self.saved)}.m4a"

    async def put_fixed(self, path: str, data: bytes, content_type: str) -> str:
        return f"https://storage.test/{path}"


class Outbox:
    """Everything "sent" on WhatsApp in tests: (route, to, message)."""

    def __init__(self) -> None:
        self.sent: list[tuple[str, str, Outbound]] = []

    def to(self, phone: str) -> list[Outbound]:
        return [m for _, p, m in self.sent if p == phone]


class FakeMeta(Meta):
    def __init__(self, base: Meta, outbox: Outbox) -> None:
        super().__init__(base.settings, base.client)
        self.outbox = outbox

    async def send(self, to: str, msg: Outbound) -> SendResult:
        self.outbox.sent.append(("meta", to, msg))
        return SendResult(ok=True, provider_id=f"wamid.{len(self.outbox.sent)}")

    async def download(self, media_id: str) -> tuple[bytes, str]:
        return b"OggS fake audio", "audio/ogg"


class FakeTwilio(Twilio):
    def __init__(self, base: Twilio, outbox: Outbox) -> None:
        super().__init__(base.settings, base.client)
        self.outbox = outbox

    async def send(self, to: str, msg: Outbound) -> SendResult:
        self.outbox.sent.append(("twilio", to, msg))
        return SendResult(ok=True, provider_id=f"SM{len(self.outbox.sent)}")


class FakeSpeech(Speech):
    """Voice notes say `heard`; free text means `intent`."""

    heard: str | None = None
    intent: Intent = Intent("unknown")

    @property
    def configured(self) -> bool:
        return True

    async def transcribe(self, audio: bytes, mime_type: str, lang: str) -> str | None:
        return self.heard

    async def understand(self, text: str, lang: str, now: datetime) -> Intent:
        return self.intent


@pytest.fixture(scope="session")
def settings() -> Settings:
    # Made-up WhatsApp credentials: tests never reach Meta, Twilio or Gemini.
    return Settings(
        db_schema=TEST_SCHEMA,
        demo_mode=True,
        public_base_url="https://bricks.test",
        meta_wa_token="test-token",
        meta_wa_phone_number_id="100200300",
        meta_app_secret="test-app-secret",
        meta_wa_verify_token="test-verify",
        twilio_account_sid="ACtest",
        twilio_auth_token="test-twilio-token",
        twilio_validate_signature=True,
        wa_scheduler=False,
        demo_fast_escalation=True,
        gemini_api_key=None,
    )


@pytest.fixture(scope="session")
async def seeded(settings: Settings) -> None:
    async with await AsyncConnection.connect(
        settings.database_url.get_secret_value(), row_factory=dict_row, prepare_threshold=None
    ) as conn:
        await conn.execute(
            sql.SQL("drop schema if exists {} cascade").format(sql.Identifier(TEST_SCHEMA))
        )
        await migrate(conn, TEST_SCHEMA)
        await seed(conn, settings, datetime.now(UTC), FakeStorage())  # type: ignore[arg-type]
        await conn.commit()


@dataclass
class Api:
    client: httpx.AsyncClient
    clock: Clock
    storage: FakeStorage
    settings: Settings
    outbox: Outbox
    speech: FakeSpeech
    app: FastAPI

    def token(self, name: str = "Test Member", sub: str | None = None) -> str:
        """A Supabase-style access token, signed with the project's legacy HS256 secret."""
        secret = self.settings.supabase_jwt_secret
        if not secret or not secret.get_secret_value():
            pytest.skip("SUPABASE_JWT_SECRET isn't set")
        now = int(time.time())
        return jwt.encode(
            {
                "sub": sub or f"00000000-0000-4000-8000-{secrets.token_hex(6)}",
                "aud": "authenticated",
                "iss": self.settings.supabase_issuer,
                "iat": now,
                "exp": now + 3600,
                "email": "member@example.com",
                "user_metadata": {"full_name": name},
            },
            secret.get_secret_value(),
            algorithm="HS256",
        )

    async def as_new_member(self, name: str = "Test Member") -> dict[str, str]:
        """Headers for a brand-new signed-in member (their account is made on first call)."""
        headers = {"Authorization": f"Bearer {self.token(name)}"}
        r = await self.client.get("/me", headers=headers)
        assert r.status_code == 200, r.text
        return headers


@pytest.fixture(scope="session")
async def api(settings: Settings, seeded: None) -> AsyncIterator[Api]:
    clock = Clock()
    app = create_app(settings, clock=clock)
    storage = FakeStorage()
    outbox = Outbox()
    async with app.router.lifespan_context(app):
        app.state.storage = storage
        app.state.wa.meta = FakeMeta(app.state.wa.meta, outbox)
        app.state.wa.twilio = FakeTwilio(app.state.wa.twilio, outbox)
        speech = FakeSpeech(settings, app.state.wa.meta.client)
        app.state.speech = speech
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test", timeout=60
        ) as client:
            yield Api(
                client=client,
                clock=clock,
                storage=storage,
                settings=settings,
                outbox=outbox,
                speech=speech,
                app=app,
            )
