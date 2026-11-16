"""Any calendar item can be a call from Wisdom that does what the person asked: made by a skill, run by the reminder loop with the full companion."""
import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.calendar import calls
from app.modules.skills import registry
from app.modules.voice import service as voice_service

client = TestClient(app)
EMAILS: list[str] = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person() -> str:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    return client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()["user"]["id"]


def sk(uid, name, **a):
    return registry.run_for_user(uid, name, a)


def test_scheduling_needs_consent_first_and_consent_needs_a_yes_and_a_number():
    uid = person()
    assert sk(uid, "schedule_call", title="English", instruction="teach me ten words", time="18:30")["error"] == "needs_consent"
    assert sk(uid, "allow_reminder_calls", phone="+6591230001")["error"] == "needs_confirmation"
    assert sk(uid, "allow_reminder_calls", confirmed=True)["error"] == "phone_needed"
    assert sk(uid, "allow_reminder_calls", phone="+6591230001", confirmed=True)["calls_allowed"] is True


def test_schedule_list_and_cancel_by_words():
    uid = person()
    sk(uid, "allow_reminder_calls", phone="+6591230002", confirmed=True)
    made = sk(uid, "schedule_call", title="English practice", instruction="Teach me ten English words and quiz me", time="18:30", repeat="daily")
    assert made["scheduled"] == "English practice" and made["repeat"] == "daily" and "18:30" in made["first_call"]
    assert sk(uid, "schedule_call", title="x", instruction="y", time="25:99")["error"] == "bad_time"
    listed = sk(uid, "my_scheduled_calls")
    assert listed["calls"] == [{"title": "English practice", "at": "18:30", "repeat": "daily", "what": "Teach me ten English words and quiz me"}] and listed["calls_allowed"] is True
    assert sk(uid, "cancel_scheduled_call", title="english")["cancelled"] == "English practice"
    assert sk(uid, "my_scheduled_calls")["calls"] == []


def test_stop_calls_switches_everything_off():
    uid = person()
    sk(uid, "allow_reminder_calls", phone="+6591230003", confirmed=True)
    assert sk(uid, "stop_calls")["calls_stopped"] is True
    assert sk(uid, "schedule_call", title="a", instruction="b", time="09:00")["error"] == "needs_consent"


def test_the_loop_places_the_call_with_the_persons_instruction_skills_and_memory(monkeypatch):
    uid = person()
    sk(uid, "allow_reminder_calls", phone="+6591230004", confirmed=True)
    with engine().begin() as conn:
        conn.execute(text("update call_consents set window_from = '00:00', window_to = '23:59' where person_id = :u"), {"u": uid})
        off = conn.execute(text("select coalesce(tz_offset_min, 480) from users where id = :u"), {"u": uid}).scalar()
    now = datetime.now(timezone.utc)
    local = now + timedelta(minutes=off)
    sk(uid, "schedule_call", title="College prep", instruction="Help me prepare for my college interview", time=local.strftime("%H:%M"), repeat="daily", date=local.date().isoformat())
    started = []

    async def fake_start(data, admin_id="admin"):
        started.append(data)
        return {"call_id": "c1"}

    monkeypatch.setattr(voice_service, "start_call", fake_start)
    asyncio.run(calls.run_once(now + timedelta(minutes=1)))
    mine = [d for d in started if d.get("user_id") == uid]
    assert len(mine) == 1
    d = mine[0]
    assert "Help me prepare for my college interview" in d["brief"] and "my_day" in d["tools"] and "calendar_outcome" in d["tools"] and "web_search" in d["tools"]


def test_asking_twice_makes_one_call_not_two():
    uid = person()
    sk(uid, "allow_reminder_calls", phone="+6591230005", confirmed=True)
    first = sk(uid, "schedule_call", title="English", instruction="teach me ten words", time="18:30", repeat="daily")
    again = sk(uid, "schedule_call", title="Teach ten English words", instruction="teach me ten English words", time="18:30", repeat="daily")
    assert first["scheduled"] == "English" and again["already_scheduled"] == "English"
    assert len(sk(uid, "my_scheduled_calls")["calls"]) == 1
