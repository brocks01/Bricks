"""Reminder-call tests, against the real local database. The owner's rule stands here too: tests never
place a REAL call. The ticking loop is held still (REMINDER_LOOP=off, set at import for the whole run)
and every test drives run_once() by hand, one tick at a time, with the dialling seam replaced by a
recorder that dials nobody."""
import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.calendar import calls

os.environ["REMINDER_LOOP"] = "off"  # the whole test run: no background ticks, no dials

client = TestClient(app)
EMAILS: list[str] = []


def fresh_email() -> str:
    e = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(e)
    return e


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        uids: list[str] = []
        for e in EMAILS:
            uids.extend(str(r[0]) for r in conn.execute(text("select id from users where email = :e"), {"e": e}))
        for uid in uids:
            conn.execute(text("delete from call_attempts where person_id = :u"), {"u": uid})
            conn.execute(text("delete from call_consents where person_id = :u"), {"u": uid})
            conn.execute(text("delete from calendar_marks where item_id in (select id from calendar_items where person_id = :u)"), {"u": uid})
            conn.execute(text("delete from calendar_items where person_id = :u"), {"u": uid})
            conn.execute(text("delete from permission_events where actor_user_id = :u or user_id = :u or helper_id = :u"), {"u": uid})
            conn.execute(text("delete from delegations where user_id = :u or helper_id = :u"), {"u": uid})
            conn.execute(text("delete from claim_invites where user_id = :u or created_by = :u"), {"u": uid})
            conn.execute(text("delete from families where created_by = :u"), {"u": uid})
            conn.execute(text("delete from users where set_up_by = :u"), {"u": uid})
            conn.execute(text("delete from users where id = :u"), {"u": uid})


def sign_in(email: str) -> dict:
    sent = client.post("/v1/auth/request-code", json={"email": email}).json()
    assert sent["sent"] and len(sent["dev_code"]) == 6
    r = client.post("/v1/auth/verify-code", json={"email": email, "code": sent["dev_code"]})
    assert r.status_code == 200, r.text
    return r.json()


def auth(session: dict) -> dict:
    return {"Authorization": f"Bearer {session['access_token']}"}


def ago_iso(minutes: int, tz_min: int = 330) -> str:
    """An aware ISO moment `minutes` ago, in a fixed +05:30 offset like the phone would send."""
    t = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    return t.astimezone(timezone(timedelta(minutes=tz_min))).isoformat()


def due_item(s: dict, title="Morning tablet", minutes_ago=2, channel="call", **over) -> dict:
    """A medicine that was due a couple of minutes ago, so the very next tick sees it."""
    body = {"kind": "medicine", "title": title, "starts_at": ago_iso(minutes_ago), "repeat": "none", "channel": channel}
    body.update(over)
    r = client.post("/v1/calendar/items", json=body, headers=auth(s))
    assert r.status_code == 200, r.text
    return r.json()


def local_time_of(minutes_ago: int, tz_min: int = 330):
    """The wall-clock time (HH:MM) of `minutes_ago` in the fixed offset, so consent windows can be built around it."""
    t = datetime.now(timezone.utc) - timedelta(minutes=minutes_ago) + timedelta(minutes=tz_min)
    return t.strftime("%H:%M")


def consent(s: dict, phone="+919876543210", **kw) -> dict:
    body = {"phone": phone, **kw}
    r = client.put("/v1/calendar/consent", json=body, headers=auth(s))
    assert r.status_code == 200, r.text
    return r.json()


def consent_around(s: dict, minutes_ago=2, **kw) -> dict:
    """A consent whose allowed hours safely contain the occurrence (no time-of-day fragility)."""
    at = datetime.strptime(local_time_of(minutes_ago), "%H:%M")
    frm = (at - timedelta(hours=2)).strftime("%H:%M")
    to = (at + timedelta(hours=2)).strftime("%H:%M")
    return consent(s, window_from=frm, window_to=to, **kw)


def consent_excluding(s: dict, minutes_ago=2, **kw) -> dict:
    """A consent whose allowed hours deliberately EXCLUDE the occurrence, whatever time of day it is."""
    at = datetime.strptime(local_time_of(minutes_ago), "%H:%M")
    if at.hour >= 21:  # late at night: end the window before the occurrence
        frm = (at - timedelta(hours=3)).strftime("%H:%M")
        to = (at - timedelta(hours=2)).strftime("%H:%M")
    else:  # otherwise: start the window just after the occurrence
        frm = (at + timedelta(minutes=1)).strftime("%H:%M")
        to = "23:59"
    return consent(s, window_from=frm, window_to=to, **kw)


def attempts(person_id: str) -> list:
    with engine().begin() as conn:
        return conn.execute(
            text("select * from call_attempts where person_id = cast(:p as uuid) order by attempt_no"),
            {"p": person_id},
        ).all()


def marks(person_id: str) -> list:
    with engine().begin() as conn:
        return conn.execute(text("""
            select m.* from calendar_marks m join calendar_items i on i.id = m.item_id
            where i.person_id = cast(:p as uuid)
        """), {"p": person_id}).all()


def set_attempt(person_id: str, attempt_no: int, status: str, minutes_old: int = 0):
    with engine().begin() as conn:
        conn.execute(text("update call_attempts set status = :s, created_at = :c where person_id = cast(:p as uuid) and attempt_no = :n"),
                     {"s": status, "c": datetime.now(timezone.utc) - timedelta(minutes=minutes_old),
                      "p": person_id, "n": attempt_no})


class Recorder:
    """Stands in for the dialling seam: remembers every call it was asked to place, dials nobody."""

    def __init__(self):
        self.placed: list[dict] = []

    async def __call__(self, work: dict, now: datetime):
        self.placed.append({"item_id": work["item_id"], "occurs_at": work["occurs_at"], "phone": work["phone"],
                            "title": work["title"], "language": work["language"], "first_name": work["first_name"]})
        with engine().begin() as conn:
            conn.execute(text("update call_attempts set status = 'dialing', voice_call_id = :v where id = cast(:a as uuid)"),
                         {"a": work["attempt_id"], "v": f"fake-call-{work['attempt_no']}"})


def tick(recorder: Recorder | None = None) -> dict:
    real = calls._place
    if recorder is not None:
        calls._place = recorder
    try:
        return asyncio.run(calls.run_once())
    finally:
        calls._place = real


# ---------------------------------------------------------------- consent


def test_consent_is_the_persons_own_word():
    s = sign_in(fresh_email())
    mine = consent(s)
    assert mine["agreed"] is True and mine["phone_masked"].endswith("210") and mine["language"] == "en"
    with engine().begin() as conn:
        row = conn.execute(text("select * from call_consents where person_id = cast(:p as uuid)"), {"p": s["user"]["id"]}).first()
    assert str(row.agreed_by) == s["user"]["id"] and row.revoked_at is None

    # a helper may record it only with the person present, and it is remembered who agreed
    family = client.post("/v1/families", json={"name": "The Dutta household"}, headers=auth(s)).json()
    r = client.post(f"/v1/families/{family['id']}/assisted", json={"display_name": "Bimal Dutta"}, headers=auth(s))
    assert r.status_code == 200, r.text
    profile = next(m["user_id"] for m in r.json()["members"] if m["login_kind"] == "assisted")

    helper = sign_in(fresh_email())
    assert client.put("/v1/calendar/consent", json={"person_id": profile, "phone": "+919812345678", "person_present": True},
                      headers=auth(helper)).status_code == 403  # a stranger with no access, tick or no tick
    assert client.put("/v1/calendar/consent", json={"person_id": profile, "phone": "+919812345678"},
                      headers=auth(s)).status_code == 422  # has access, but no tick: the person is not there
    r = client.put("/v1/calendar/consent", json={"person_id": profile, "phone": "+919812345678", "person_present": True},
                   headers=auth(s))
    assert r.status_code == 200 and r.json()["agreed"] is True
    with engine().begin() as conn:
        row = conn.execute(text("select agreed_by from call_consents where person_id = cast(:p as uuid)"), {"p": profile}).first()
    assert str(row.agreed_by) == s["user"]["id"]  # the helper who heard the yes

    # a nonsense phone or window is refused
    assert client.put("/v1/calendar/consent", json={"phone": "98765"}, headers=auth(s)).status_code == 422
    assert client.put("/v1/calendar/consent", json={"phone": "+919876543210", "window_from": "20:00", "window_to": "08:00"},
                      headers=auth(s)).status_code == 422

    # only the person themselves stops the calls
    assert client.delete("/v1/calendar/consent", params={"person_id": profile}, headers=auth(s)).status_code == 403
    assert client.delete("/v1/calendar/consent", headers=auth(s)).status_code == 200
    got = client.get("/v1/calendar/consent", headers=auth(s)).json()
    assert got["agreed"] is False and got["revoked"] is True
    # agreeing again opens the door again
    assert consent(s)["agreed"] is True


# ---------------------------------------------------------------- the tick


def test_the_loop_places_one_call_and_the_answer_marks_it_done():
    s = sign_in(fresh_email())
    consent_around(s)
    rec = Recorder()
    made = due_item(s)
    assert tick(rec) == {"placed": 1, "blocked": 0}
    rows = attempts(s["user"]["id"])
    assert len(rows) == 1 and rows[0].status == "dialing" and rows[0].voice_call_id == "fake-call-1"
    assert rec.placed[0]["phone"] == "+919876543210" and rec.placed[0]["title"] == "Morning tablet"
    assert rec.placed[0]["occurs_at"].isoformat()  # the exact occurrence the call is about

    # the loop ticks again while the call is dialing: no second attempt, no second call
    assert tick(rec) == {"placed": 0, "blocked": 0} and len(rec.placed) == 1

    # the person answers: the call's tool records what they said and marks the plan done
    reminder = {"item_id": made["id"], "occurs_at": rec.placed[0]["occurs_at"].isoformat(),
                "attempt_no": 1, "person_id": s["user"]["id"]}
    note = asyncio.run(calls.call_outcome({"reminder": reminder}, "took_it"))
    assert note["ok"] is True
    rows = attempts(s["user"]["id"])
    assert rows[0].status == "acknowledged" and rows[0].outcome == "took_it"
    assert len(marks(s["user"]["id"])) == 1  # the plan shows as done in the app

    # a marked plan is never called about again
    assert tick(rec) == {"placed": 0, "blocked": 0} and len(rec.placed) == 1


def test_no_answer_tries_once_more_ten_minutes_later_then_stops():
    s = sign_in(fresh_email())
    consent_around(s)
    rec = Recorder()
    due_item(s)
    assert tick(rec) == {"placed": 1, "blocked": 0}
    set_attempt(s["user"]["id"], 1, "no_answer", minutes_old=11)  # nobody picked up, ten minutes ago
    assert tick(rec) == {"placed": 1, "blocked": 0}  # exactly one retry
    assert [r.attempt_no for r in attempts(s["user"]["id"])] == [1, 2] and len(rec.placed) == 2
    set_attempt(s["user"]["id"], 2, "no_answer", minutes_old=11)
    assert tick(rec) == {"placed": 0, "blocked": 0} and len(rec.placed) == 2  # never a third call
    # a retry may not come EARLY: the ten minutes are honest
    s2 = sign_in(fresh_email())
    consent_around(s2)
    rec2 = Recorder()
    due_item(s2)
    assert tick(rec2) == {"placed": 1, "blocked": 0}
    set_attempt(s2["user"]["id"], 1, "no_answer", minutes_old=3)  # only three minutes: too soon
    assert tick(rec2) == {"placed": 0, "blocked": 0} and len(rec2.placed) == 1


def test_missing_or_revoked_consent_is_blocked_never_a_call():
    s = sign_in(fresh_email())
    rec = Recorder()
    due_item(s)
    # no consent at all: recorded once as blocked, and nothing dialled, ever
    assert tick(rec) == {"placed": 0, "blocked": 1}
    assert attempts(s["user"]["id"])[0].status == "blocked" and rec.placed == []
    assert tick(rec) == {"placed": 0, "blocked": 0} and len(attempts(s["user"]["id"])) == 1  # the row is reused, not duplicated
    # a revoked consent behaves the same way
    consent_around(s)
    client.delete("/v1/calendar/consent", headers=auth(s))
    due_item(s, title="Evening walk")
    assert tick(rec) == {"placed": 0, "blocked": 1} and rec.placed == []
    # quiet hours win: with a consent, but the occurrence outside the agreed hours, nothing at all happens
    consent_excluding(s)
    due_item(s, title="Late thing")
    assert tick(rec) == {"placed": 0, "blocked": 0} and rec.placed == []
    assert [r.status for r in attempts(s["user"]["id"])].count("dialing") == 0


def test_the_brief_speaks_the_persons_language_and_never_advises():
    en = calls.brief_for("en", "Anita", "blood pressure tablet")
    assert "Anita" in en and "blood pressure tablet" in en and "never give medical advice" in en
    hi = calls.brief_for("hi", "Anita", "blood pressure tablet")
    assert "Bricks" in hi and "डॉक्टर" in hi
    for code in ("bn", "ta", "zh", "ms"):
        assert calls.brief_for(code, "Anita", "tablet")
    assert calls.VOICE_LANGUAGES["zh"] == "zh-CN" and calls.VOICE_LANGUAGES["ms"] == "ms-MY"


def test_a_bad_answer_or_missing_context_is_never_recorded():
    bad = asyncio.run(calls.call_outcome({"reminder": None}, "took_it"))
    assert bad["ok"] is False
    bad2 = asyncio.run(calls.call_outcome({"reminder": {"item_id": str(uuid.uuid4())}}, "maybe"))
    assert bad2["ok"] is False  # only the three honest answers exist
