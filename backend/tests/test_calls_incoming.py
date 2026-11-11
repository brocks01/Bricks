"""Voice 0.1: an inbound call is greeted in four languages; unsigned webhooks get 403.

No database: the app's startup (which opens the pool) isn't run by ASGITransport.
"""

import httpx
import pytest
from pydantic import SecretStr
from twilio.request_validator import RequestValidator

from bricks_api.config import Settings
from bricks_api.main import create_app

TOKEN = "test-auth-token"
BASE = "https://example.ngrok-free.app"
FORM = {"CallSid": "CA123", "From": "+6590000000", "To": "+15550000000"}


def make_client(**overrides: object) -> httpx.AsyncClient:
    settings = Settings(
        _env_file=None,
        supabase_url="https://example.supabase.co",
        supabase_secret_key=SecretStr("x"),
        database_url=SecretStr("postgresql://unused"),
        public_base_url=BASE,
        twilio_auth_token=SecretStr(TOKEN),
        **overrides,  # type: ignore[arg-type]
    )
    transport = httpx.ASGITransport(app=create_app(settings))
    return httpx.AsyncClient(transport=transport, base_url="http://testserver")


def signed(path: str, form: dict[str, str]) -> dict[str, str]:
    return {"X-Twilio-Signature": RequestValidator(TOKEN).compute_signature(BASE + path, form)}


@pytest.mark.asyncio
async def test_t1_a_signed_call_is_greeted_in_four_languages() -> None:
    async with make_client() as client:
        r = await client.post("/voice/incoming", data=FORM, headers=signed("/voice/incoming", FORM))
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/xml")
    for lang in ("en-IN", "ms-MY", "cmn-CN", "ta-IN"):
        assert lang in r.text
    assert "Bricks" in r.text
    assert r.text.count("<Pause") == 4 and "<Hangup" in r.text


@pytest.mark.asyncio
async def test_t2_an_unsigned_call_is_refused() -> None:
    async with make_client() as client:
        r = await client.post("/voice/incoming", data=FORM)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_a_tampered_call_is_refused() -> None:
    headers = signed("/voice/incoming", FORM)
    async with make_client() as client:
        tampered = {**FORM, "From": "+6599999999"}
        r = await client.post("/voice/incoming", data=tampered, headers=headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_signature_check_can_be_switched_off_for_local_curl() -> None:
    async with make_client(twilio_validate_signature=False) as client:
        r = await client.post("/voice/incoming", data=FORM)
    assert r.status_code == 200
