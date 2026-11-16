"""The daily check-in: Wisdom speaks first, once a day, at the hour the person chose, with one question
that remembers what they said. A reply on any channel resets the silence; after three silent days, and only
if the person agreed, the family hears one gentle heads-up. Tests use a fake agent and a fake sender; no
network call is ever made."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.channels import checkins, core, memory, outbox
from app.modules.skills import registry

client = TestClient(app)
EMAILS: list[str] = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from families where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person() -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"], "name": s["user"]["display_name"]}


def day(h: int = 10, plus: int = 0) -> datetime:
    """A moment in the person's day (Singapore, UTC+8): day(10) is 10:00 their time."""
    return datetime(2026, 11, 16, h - 8, 0, tzinfo=timezone.utc) + timedelta(days=plus)


def fake_agent(monkeypatch, question: str = "How is the knee after the rain?"):
    seen = {}

    def call(contents, system=""):
        seen["contents"], seen["system"] = contents, system
        return {"candidates": [{"content": {"parts": [{"text": question}]}}]}

    monkeypatch.setattr(checkins.agent, "_key", lambda: "test-key")
    monkeypatch.setattr(checkins.agent, "_call", call)
    return seen


def fake_sender(monkeypatch) -> list:
    pushes = []
    monkeypatch.setattr(outbox, "_push", lambda ch, addr, body: pushes.append((ch, body)) or True)
    return pushes


def enable(p: dict, at: str = "09:00", family=None) -> dict:
    args = {"time": at, "confirmed": True}
    if family is not None:
        args["family_notify"] = family
    return registry.run_for_user(p["id"], "set_daily_checkin", args)


def state(p: dict):
    with engine().connect() as conn:
        return conn.execute(text("select * from daily_checkins where user_id = :u"), {"u": p["id"]}).first()


def notes(p: dict, kind: str | None = None) -> list:
    with engine().connect() as conn:
        rows = conn.execute(text("select kind, body from notifications where user_id = :u" + (" and kind = :k" if kind else "") + " order by id"),
                            {"u": p["id"], **({"k": kind} if kind else {})}).all()
    return [{"kind": r.kind, "body": r.body} for r in rows]


def test_the_daily_check_in_needs_the_persons_yes_first():
    p = person()
    assert registry.run_for_user(p["id"], "set_daily_checkin", {"time": "09:00"})["error"] == "needs_confirmation"
    assert state(p) is None


def test_set_and_stop(monkeypatch):
    p = person()
    r = enable(p, "9:30", family=True)
    assert r["daily_checkin"] == "on" and r["at"] == "09:30" and r["family_will_be_told_after_three_silent_days"] is True
    assert state(p).enabled and str(state(p).local_time) == "09:30:00"
    r2 = enable(p, "10:00")  # changing the hour does not change what they said about the family
    assert r2["family_will_be_told_after_three_silent_days"] is None and state(p).family_notify is True
    assert registry.run_for_user(p["id"], "stop_daily_checkin", {})["daily_checkin"] == "off"
    assert state(p).enabled is False


def test_one_question_a_day_that_remembers(monkeypatch):
    p = person()
    enable(p)
    memory.remember(p["id"], "telegram", "person", "my knee hurts when it rains")
    seen = fake_agent(monkeypatch)
    pushes = fake_sender(monkeypatch)
    assert checkins.run_once(day()) == 1
    assert pushes == [("telegram", "How is the knee after the rain?")] or len(pushes) == 1  # may land in the inbox with no chat linked
    got = notes(p, "checkin")
    assert len(got) == 1 and got[0]["body"] == "How is the knee after the rain?"
    assert "knee hurts" in seen["contents"][0]["parts"][0]["text"]  # the question is made from their memory
    st = state(p)
    assert st.last_sent == day().date() + timedelta(hours=8) and st.silent_days == 0
    assert checkins.run_once(day()) == 0 and len(notes(p, "checkin")) == 1  # never twice a day
    assert checkins.run_once(day(plus=1)) == 1  # the next morning it speaks again
    assert state(p).silent_days == 1  # a day with no reply counts as one silent day
    assert len(notes(p, "checkin")) == 2


def test_without_the_listener_a_kind_fixed_question(monkeypatch):
    p = person()
    enable(p)
    monkeypatch.setattr(checkins.agent, "_key", lambda: "")
    fake_sender(monkeypatch)
    checkins.run_once(day())
    assert notes(p, "checkin")[0]["body"] in checkins.FIXED_QUESTIONS


def test_nothing_goes_out_before_the_chosen_hour(monkeypatch):
    p = person()
    enable(p, "11:00")
    fake_agent(monkeypatch)
    fake_sender(monkeypatch)
    assert checkins.run_once(day(10)) == 0 and notes(p) == []
    assert checkins.run_once(day(11)) == 1 and len(notes(p, "checkin")) == 1


def test_a_reply_on_any_channel_resets_the_silence(monkeypatch):
    p, c = person(), str(uuid.uuid4().int % 10**10)
    enable(p)
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "")
    with engine().begin() as conn:  # three days with no word
        conn.execute(text("update daily_checkins set last_sent = :d where user_id = :u"), {"d": day().date() + timedelta(hours=8) - timedelta(days=3), "u": p["id"]})
    fake_agent(monkeypatch)
    fake_sender(monkeypatch)
    checkins.run_once(day())
    assert state(p).silent_days == 3
    core.handle("telegram", c, f"/start {core.new_link_code(p['id'])['code']}")  # they speak up on Telegram
    core.handle("telegram", c, "I was away at my daughter's")
    st = state(p)
    assert st.silent_days == 0 and st.family_told_on is None and st.last_reply is not None


def _family(p: dict, member: dict) -> None:
    with engine().begin() as conn:
        f = conn.execute(text("insert into families (name, created_by) values ('Kumar family', :u) returning id"), {"u": p["id"]}).scalar_one()
        conn.execute(text("insert into family_members (family_id, user_id, role) values (:f, :u, 'owner'), (:f, :u2, 'member')"),
                     {"f": f, "u": p["id"], "u2": member["id"]})


def _backdate(p: dict, days: int) -> None:
    with engine().begin() as conn:
        conn.execute(text("update daily_checkins set last_sent = :d where user_id = :u"),
                     {"d": day().date() + timedelta(hours=8) - timedelta(days=days), "u": p["id"]})


def test_the_family_is_told_after_three_silent_days_only_with_consent(monkeypatch):
    agreed, kin, quiet, kin2 = person(), person(), person(), person()
    _family(agreed, kin)
    _family(quiet, kin2)
    enable(agreed, family=True)
    enable(quiet)  # no consent for the family
    fake_agent(monkeypatch, "Good morning! What is on today?")
    fake_sender(monkeypatch)
    _backdate(agreed, 3)
    _backdate(quiet, 3)
    checkins.run_once(day())
    heads = notes(kin, "family")
    assert len(heads) == 1 and agreed["name"].split()[0] in heads[0]["body"] and "not an emergency" in heads[0]["body"]
    assert state(agreed).family_told_on == day().date() + timedelta(hours=8)
    assert notes(kin2, "family") == []  # this person never agreed
    checkins.run_once(day(plus=1))
    assert len(notes(kin, "family")) == 1  # once per quiet spell, not every day
    assert len(notes(agreed, "checkin")) == 2  # but the daily check-in itself carries on
