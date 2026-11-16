"""Chat channels: linking a Telegram chat to a person, quick commands with no AI, the text agent running skills, and group chats being ignored."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.channels import agent, core, telegram

client = TestClient(app)
EMAILS: list[str] = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person() -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"]}


def chat() -> str:
    return str(uuid.uuid4().int % 10**10)


def test_a_stranger_is_asked_to_connect_and_a_wrong_code_does_not_link(monkeypatch):
    monkeypatch.setenv("WISDOM_OPEN_SIGNUP", "false")
    c = chat()
    assert "Connect Telegram" in core.handle("telegram", c, "what's on today?")[0]
    assert "did not work" in core.handle("telegram", c, "/start ABCD2345")[0]
    assert core.who("telegram", c) is None


def test_the_code_links_once_then_commands_work_without_any_ai(monkeypatch):
    p, c = person(), chat()
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "")  # no server token: the code is made directly, as the endpoint would
    code = core.new_link_code(p["id"])["code"]
    assert "Connected" in core.handle("telegram", c, f"/start {code}")[0]
    assert core.who("telegram", c) == p["id"]
    assert "did not work" in core.handle("telegram", chat(), f"/start {code}")[0]  # spent: it cannot be used again
    day = core.handle("telegram", c, "/today")[0]
    assert "Did you move today" in day
    assert "Level" in core.handle("telegram", c, "My tree")[0]  # the keyboard button words work as commands
    assert "Disconnected" in core.handle("telegram", c, "/unlink")[0]
    assert core.who("telegram", c) is None


def test_pasting_the_bare_code_also_links():
    p, c = person(), chat()
    code = core.new_link_code(p["id"])["code"]
    assert "Connected" in core.handle("telegram", c, code.lower())[0]


def test_the_agent_runs_a_skill_and_remembers_the_chat(monkeypatch):
    p, c = person(), chat()
    core.handle("telegram", c, f"/start {core.new_link_code(p['id'])['code']}")
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    steps = iter([
        {"candidates": [{"content": {"parts": [{"functionCall": {"name": "checkin_today", "args": {"moved": True}}}]}}]},
        {"candidates": [{"content": {"parts": [{"text": "Lovely, I noted your walk."}]}}]},
    ])
    seen = []
    monkeypatch.setattr(agent, "_call", lambda contents, system="": (seen.append(contents), next(steps))[1])
    assert core.handle("telegram", c, "I walked this morning") == ["Lovely, I noted your walk."]
    with engine().connect() as conn:
        assert conn.execute(text("select moved from health_checkins where user_id = :u"), {"u": p["id"]}).scalar() is True  # the skill really changed the data
        assert conn.execute(text("select count(*) from channel_messages where user_id = :u"), {"u": p["id"]}).scalar() == 2
    # the tool result went back to the model
    assert seen[1][-1]["parts"][0]["functionResponse"]["name"] == "checkin_today"


def test_without_an_ai_key_free_text_gets_a_calm_line(monkeypatch):
    p, c = person(), chat()
    core.handle("telegram", c, f"/start {core.new_link_code(p['id'])['code']}")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setattr("app.modules.channels.agent._key", lambda: "")
    assert "/today" in core.handle("telegram", c, "hello")[0]


def test_group_chats_are_ignored(monkeypatch):
    sent = []
    monkeypatch.setattr(telegram, "send", lambda chat_id, body: sent.append(body) or True)
    telegram.handle_update({"message": {"chat": {"id": 1, "type": "group"}, "text": "/today"}})
    telegram.handle_update({"message": {"chat": {"id": 2, "type": "private"}, "text": "/help"}})
    assert len(sent) == 1


def test_the_endpoints_report_setup_and_the_webhook_is_off_without_a_secret(monkeypatch):
    p = person()
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "")
    assert client.get("/v1/channels", headers=p["h"]).json()["telegram"] == {"available": False, "connected": False, "bot": None}
    assert client.post("/v1/channels/telegram/link-code", headers=p["h"]).status_code == 503
    monkeypatch.delenv("TELEGRAM_WEBHOOK_SECRET", raising=False)
    assert client.post("/v1/channels/telegram/webhook/anything", json={}).status_code == 404


def test_whatsapp_and_sms_come_in_through_twilio_and_use_the_same_brain(monkeypatch):
    monkeypatch.setenv("VOICE_PROVIDER", "mock")  # no real signature in a test
    p = person()
    code = core.new_link_code(p["id"], "whatsapp")["code"]
    r = client.post("/v1/channels/twilio/whatsapp", data={"From": "whatsapp:+6590001234", "Body": code})
    assert r.status_code == 200 and "Connected" in r.text and core.who("whatsapp", "+6590001234") == p["id"]
    day = client.post("/v1/channels/twilio/whatsapp", data={"From": "whatsapp:+6590001234", "Body": "today"})
    assert "Did you move today" in day.text
    monkeypatch.setenv("WISDOM_OPEN_SIGNUP", "false")
    stranger = client.post("/v1/channels/twilio/sms", data={"From": "+6590009999", "Body": "hello"})
    assert "Connect Sms" in stranger.text
    assert client.post("/v1/channels/twilio/wechat", data={"From": "x"}).status_code == 404
    with engine().begin() as conn:
        conn.execute(text("delete from channel_links where external_id in ('+6590001234')"))


def test_one_memory_across_channels_and_calls(monkeypatch):
    from app.modules.channels import memory

    p = person()
    from app.modules.skills import registry

    assert registry.run_for_user(p["id"], "remember_about_me", {"note": "daughter Priya lives in Perth"})["remembered"].startswith("daughter")
    memory.remember(p["id"], "call", "person", "my knee hurts when it rains")
    memory.remember(p["id"], "telegram", "agent", "Sorry to hear that. Shall I note it?")
    ctx = memory.context(p["id"])
    assert "daughter Priya" in ctx and "knee hurts" in ctx and "(call)" in ctx and "(telegram)" in ctx
    c = chat()
    core.handle("telegram", c, f"/start {core.new_link_code(p['id'])['code']}")
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    seen = []
    monkeypatch.setattr(agent, "_call", lambda contents, system="": (seen.append((contents, system)), {"candidates": [{"content": {"parts": [{"text": "ok"}]}}]})[1])
    core.handle("telegram", c, "hello again")
    contents, system = seen[0]
    assert "daughter Priya" in system and any("knee hurts" in x["parts"][0]["text"] for x in contents)  # the chat starts where the call left off
