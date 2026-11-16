"""A person who reaches Wisdom from a new number or chat gets an account through the one backend function, whatever the interface, and is onboarded by the agent."""
import uuid

import pytest
from sqlalchemy import text

from app.core.db import engine
from app.modules.channels import agent, core, memory
from app.modules.skills import registry
from app.modules.voice import service as voice_service

SENDERS: list[str] = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        conn.execute(text("delete from users where id in (select user_id from channel_links where external_id = any(:x))"), {"x": SENDERS})


@pytest.fixture(autouse=True)
def no_ai(monkeypatch):
    monkeypatch.setenv("WISDOM_OPEN_SIGNUP", "true")
    monkeypatch.setattr(agent, "reply", lambda uid, channel, body: "agent says hello")


def number() -> str:
    n = "+6590" + str(uuid.uuid4().int % 10**6).zfill(6)
    SENDERS.append(n)
    return n


def chat() -> str:
    c = "7" + str(uuid.uuid4().int % 10**9)
    SENDERS.append(c)
    return c


def row(uid):
    with engine().connect() as conn:
        return conn.execute(text("select email, phone, login_kind from users where id = :u"), {"u": uid}).one()


def test_a_new_whatsapp_number_gets_an_account_with_the_number_and_a_welcome():
    n = number()
    out = core.handle("whatsapp", n, "hello")
    assert "what should I call you" in out[0]
    uid = core.who("whatsapp", n)
    r = row(uid)
    assert r.email is None and r.phone == n and r.login_kind == "own"
    assert core.who("phone", n) == uid  # the number is theirs, so they can phone Wisdom from it too
    assert core.handle("whatsapp", n, "my name is Meena") == ["agent says hello"]  # the second message goes to the agent


def test_a_new_telegram_chat_gets_an_account_without_a_phone():
    c = chat()
    assert "I'm Ken" in core.handle("telegram", c, "/start")[0]
    uid = core.who("telegram", c)
    assert row(uid).phone is None and core.who("phone", c) is None


def test_the_same_sender_is_the_same_person_and_a_number_already_known_is_not_duplicated():
    n = number()
    first, new1 = core.resolve("phone", n)
    again, new2 = core.resolve("phone", n)
    assert new1 is True and new2 is False and first == again
    via_message, new3 = core.resolve("whatsapp", n)  # messaging from the number a call came from: the same person
    assert via_message == first and new3 is False


def test_an_unknown_caller_becomes_a_person_and_the_call_starts_with_a_welcome(monkeypatch):
    n = number()
    rec, why = voice_service.accept_inbound(n, "CA" + uuid.uuid4().hex[:10])
    try:
        assert rec is not None and why == "" and rec["user_id"] == core.who("phone", n)
        assert "only just arrived" in rec["brief"] and "onboarding_next" in rec["tools"]
    finally:
        from app.modules.voice import store

        if rec:
            store.update(rec["call_id"], status="completed", ended_at=store._now(), end_reason="test")


def test_the_new_person_is_onboarded_by_the_agents_skills_and_nothing_risky_works_yet():
    n = number()
    uid, _ = core.resolve("phone", n)
    assert "only just arrived" in memory.context(uid)
    assert registry.run_for_user(uid, "save_answer", {"section": "basics", "field": "display_name", "value": "Kavita Rao"})["saved"] == "display_name"
    assert "only just arrived" not in memory.context(uid)
    assert registry.run_for_user(uid, "tell_family", {})["error"] == "needs_confirmation"


def test_sign_up_can_be_closed_and_is_capped_per_hour(monkeypatch):
    monkeypatch.setenv("WISDOM_OPEN_SIGNUP", "false")
    assert core.resolve("whatsapp", number()) == (None, False)
    monkeypatch.setenv("WISDOM_OPEN_SIGNUP", "true")
    monkeypatch.setenv("WISDOM_SIGNUPS_PER_HOUR", "0")
    assert core.resolve("whatsapp", number()) == (None, False)
    assert "Connect Whatsapp" in core.handle("whatsapp", number(), "hi")[0]
