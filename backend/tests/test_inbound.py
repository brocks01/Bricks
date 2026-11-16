"""A person phones Wisdom: a linked number gets the agent (with their skills and memory), an unknown number hears one sentence and is hung up."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.channels import core
from app.modules.voice import store

client = TestClient(app)
EMAILS: list[str] = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


@pytest.fixture(autouse=True)
def mock_phone(monkeypatch):
    monkeypatch.setenv("VOICE_PROVIDER", "mock")
    monkeypatch.setenv("VOICE_PUBLIC_URL", "https://example.test")
    store._calls.clear()


def person() -> str:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    return client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()["user"]["id"]


def number() -> str:
    return "+6590" + str(uuid.uuid4().int % 10**6).zfill(6)


def ring(n):
    return client.post("/twilio/incoming", data={"From": n, "CallSid": "CA" + uuid.uuid4().hex[:10]})


def test_an_unknown_number_hears_one_sentence_and_no_call_starts_when_sign_up_is_closed(monkeypatch):
    monkeypatch.setenv("WISDOM_OPEN_SIGNUP", "false")
    r = ring(number())
    assert r.status_code == 200 and "do not know this number" in r.text and "<Hangup/>" in r.text and "<Stream" not in r.text
    assert store.active_count() == 0


def test_a_linked_number_gets_the_agent_with_their_account_skills_and_memory():
    uid, n = person(), number()
    assert core.link_phone(uid, n)
    core.handle("telegram", "chat-" + uuid.uuid4().hex[:6], "hi")  # unrelated chat: must not leak in
    from app.modules.channels import memory
    memory.remember(uid, "telegram", "person", "my knee hurts when it rains")
    r = ring(n)
    assert "<Stream" in r.text and "callId" in r.text
    rec = next(iter(store._calls.values()))
    assert rec["user_id"] == uid and rec["direction"] == "inbound" and "my_day" in rec["tools"] and "tell_family" in rec["tools"]
    assert "knee hurts" in rec["brief"] and "calling YOU" in rec["brief"]


def test_a_second_caller_while_one_is_talking_is_asked_to_wait():
    a, b = person(), person()
    na, nb = number(), number()
    core.link_phone(a, na)
    core.link_phone(b, nb)
    assert "<Stream" in ring(na).text
    assert "helping someone else" in ring(nb).text


def test_linking_through_whatsapp_also_lets_that_number_phone_in():
    uid = person()
    code = core.new_link_code(uid, "whatsapp")["code"]
    n = number()
    assert "Connected" in core.handle("whatsapp", n, code)[0]
    assert core.who("phone", n) == uid
    assert core.link_phone(uid, "12345") is False  # not an international number


def test_a_bad_signature_is_refused_with_a_real_provider(monkeypatch):
    monkeypatch.setenv("VOICE_PROVIDER", "twilio")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "x")
    assert client.post("/twilio/incoming", data={"From": number()}, headers={"x-twilio-signature": "nope"}).status_code == 403
