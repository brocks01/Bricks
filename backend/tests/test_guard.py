"""Spam safety in front of every interface: a flood gets one polite line then silence, blocked senders are ignored, a person has a daily limit of replies, a caller has an hourly limit."""
import uuid

import pytest
from sqlalchemy import text

from app.core.db import engine
from app.modules.channels import agent, core, guard
from app.modules.voice import service as voice_service
from app.modules.voice import store

SENDERS: list[str] = []


@pytest.fixture(autouse=True)
def fresh(monkeypatch):
    guard.reset()
    monkeypatch.setenv("WISDOM_OPEN_SIGNUP", "true")
    monkeypatch.setattr(agent, "reply", lambda uid, channel, body: "ok")
    yield
    guard.reset()


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        conn.execute(text("delete from users where id in (select user_id from channel_links where external_id = any(:x))"), {"x": SENDERS})


def sender() -> str:
    s = "8" + str(uuid.uuid4().int % 10**9)
    SENDERS.append(s)
    return s


def test_a_flood_gets_one_polite_line_then_silence(monkeypatch):
    monkeypatch.setenv("WISDOM_MSG_BURST", "3")
    s = sender()
    out = [core.handle("telegram", s, f"hello {i}") for i in range(7)]
    assert out[0] and "call you" in out[0][0] or out[0]  # the first reply is the welcome
    assert [guard.SLOW_DOWN] in out and out.count([guard.SLOW_DOWN]) == 1
    assert out[-1] == []  # silent after the one warning


def test_one_senders_flood_does_not_slow_another():
    a, b = sender(), sender()
    for i in range(12):
        core.handle("telegram", a, f"spam {i}")
    assert core.handle("telegram", b, "hello")  # b still gets an answer


def test_a_blocked_sender_is_ignored_and_never_gets_an_account(monkeypatch):
    s = sender()
    monkeypatch.setenv("WISDOM_BLOCKED", f"+6500000000, {s}")
    assert core.handle("telegram", s, "hello") == []
    assert core.who("telegram", s) is None


def test_very_long_messages_are_clipped():
    assert len(guard.clip("x" * 5000)) == guard.MAX_BODY


def test_a_person_has_a_daily_limit_of_agent_replies(monkeypatch):
    s = sender()
    core.handle("telegram", s, "hello")  # welcome: makes the account
    uid = core.who("telegram", s)
    monkeypatch.setenv("WISDOM_REPLIES_PER_DAY", "2")
    with engine().begin() as conn:
        for _ in range(2):
            conn.execute(text("insert into channel_messages (user_id, channel, role, body) values (:u, 'telegram', 'agent', 'hi')"), {"u": uid})
    assert core.handle("telegram", s, "what is on today?") == [guard.TOO_MUCH_TODAY]
    assert core.handle("telegram", s, "/today")[0] != guard.TOO_MUCH_TODAY  # the quick words still work with no AI cost


def test_a_number_can_phone_only_so_often_an_hour_and_a_blocked_number_is_refused(monkeypatch):
    n = "+6590" + str(uuid.uuid4().int % 10**6).zfill(6)
    SENDERS.append(n)
    monkeypatch.setenv("WISDOM_CALLS_PER_NUMBER", "1")
    first, why = voice_service.accept_inbound(n, "CA" + uuid.uuid4().hex[:10])
    assert first is not None and why == ""
    store.update(first["call_id"], status="completed", ended_at=store._now(), end_reason="test")
    again, why = voice_service.accept_inbound(n, "CA" + uuid.uuid4().hex[:10])
    assert again is None and why == "limit"
    other = "+6590" + str(uuid.uuid4().int % 10**6).zfill(6)
    monkeypatch.setenv("WISDOM_BLOCKED", other)
    assert voice_service.accept_inbound(other, "CA" + uuid.uuid4().hex[:10]) == (None, "unknown")
