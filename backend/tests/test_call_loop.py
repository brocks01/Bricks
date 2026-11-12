"""Voice 1.3: the inbound call loop end to end (TwiML in, TwiML out, real Postgres).

Each test calls in as a brand-new member with their own phone number, so tests don't
depend on each other. Signature checks are off here (test_calls_incoming covers them).
"""

import secrets
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

import httpx
import pytest

from bricks_api.assistant import orchestrator
from bricks_api.calls import session
from bricks_api.config import Settings
from bricks_api.main import create_app

from .conftest import TEST_SCHEMA

pytestmark = pytest.mark.asyncio(loop_scope="session")

BASE = "https://calls.example"


@dataclass
class Phone:
    client: httpx.AsyncClient
    app: Any

    async def db(self, query: str, *args: object) -> list[dict[str, Any]]:
        async with self.app.state.pool.connection() as conn:
            return await (await conn.execute(query, args)).fetchall()  # type: ignore[no-any-return]

    async def new_member(self, name: str = "Mary Tan") -> tuple[str, str]:
        user_id, number = f"u_call_{secrets.token_hex(4)}", f"+6591{secrets.randbelow(10**6):06d}"
        async with self.app.state.pool.connection() as conn:
            await conn.execute(
                "insert into users (id, name, phone) values (%s, %s, %s)", (user_id, name, number)
            )
        return user_id, number


@dataclass
class Call:
    phone: Phone
    number: str
    sid: str

    async def start(self) -> str:
        r = await self.phone.client.post(
            "/voice/incoming", data={"CallSid": self.sid, "From": self.number}
        )
        assert r.status_code == 200, r.text
        return r.text

    async def say(self, words: str = "", digits: str = "", step: str | None = None) -> str:
        data = {"CallSid": self.sid, "From": self.number}
        if words:
            data["SpeechResult"] = words
        if digits:
            data["Digits"] = digits
        url = "/voice/turn" + (f"?step={step}" if step else "")
        r = await self.phone.client.post(url, data=data)
        assert r.status_code == 200, r.text
        return r.text


@pytest.fixture(scope="session")
async def phone(seeded: None) -> AsyncIterator[Phone]:
    settings = Settings(
        db_schema=TEST_SCHEMA,
        demo_mode=True,
        twilio_validate_signature=False,
        public_base_url=BASE,
    )
    app = create_app(settings)
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield Phone(client=client, app=app)


@pytest.fixture(autouse=True)
def no_model(monkeypatch: pytest.MonkeyPatch) -> None:
    """No real Gemini on calls in tests (a test that wants one scripts it)."""
    monkeypatch.setattr(orchestrator, "_client", lambda ctx: None)


async def call_in(phone: Phone, name: str = "Mary Tan") -> tuple[Call, str]:
    user_id, number = await phone.new_member(name)
    return Call(phone, number, f"CA{secrets.token_hex(8)}"), user_id


async def test_a_known_caller_is_greeted_by_name_and_asked_what_they_want(phone: Phone) -> None:
    call, _ = await call_in(phone)
    twiml = await call.start()
    assert "Hi Mary, it's Buddy from Bricks." in twiml
    assert "What would you like to do?" in twiml
    assert "press 1 for today" in twiml
    assert 'input="speech dtmf"' in twiml and f'action="{BASE}/voice/turn"' in twiml
    # Silence goes back to us, so we can ask again.
    assert f"{BASE}/voice/turn?step=silence" in twiml


async def test_t1_whats_on_today_offers_a_walk_and_yes_joins_it(phone: Phone) -> None:
    call, user_id = await call_in(phone)
    await call.start()
    twiml = await call.say("What's on today?")
    assert "Want to join? Say yes, or press 1." in twiml
    twiml = await call.say("yes")
    assert "Done! You're going to" in twiml
    assert "Anything else?" in twiml
    going = await phone.db("select 1 from rsvps where user_id = %s and status = 'going'", user_id)
    assert len(going) == 1


async def test_t2_a_reminder_is_confirmed_then_saved_for_the_app(phone: Phone) -> None:
    call, user_id = await call_in(phone)
    await call.start()
    twiml = await call.say("Remind me to take my medicine at 8")
    assert "at 8 am: take your medicine. Is that right? Say yes, or press 1." in twiml
    assert not await phone.db("select 1 from reminders where user_id = %s", user_id)
    twiml = await call.say("yes")
    assert "You'll see it in your reminders in the app too." in twiml
    rows = await phone.db("select * from reminders where user_id = %s", user_id)
    assert len(rows) == 1
    r = rows[0]
    assert (r["text"], r["time"], r["kind"], r["created_by"]) == (
        "Take my medicine",
        "08:00",
        "medicine",
        "call",
    )


async def test_t3_pressing_1_is_the_same_as_yes(phone: Phone) -> None:
    call, user_id = await call_in(phone)
    await call.start()
    await call.say("can remind me take medicine 8 o'clock every day")  # T6, Singlish
    twiml = await call.say(digits="1")
    assert "You'll see it in your reminders" in twiml
    rows = await phone.db("select repeat from reminders where user_id = %s", user_id)
    assert [r["repeat"] for r in rows] == ["daily"]


async def test_no_cancels_and_nothing_is_saved(phone: Phone) -> None:
    call, user_id = await call_in(phone)
    await call.start()
    await call.say("remind me at 6 pm to call my son")
    twiml = await call.say("no")
    assert "Okay, I won't do that." in twiml
    assert not await phone.db("select 1 from reminders where user_id = %s", user_id)


async def test_a_reminder_without_a_time_asks_for_one(phone: Phone) -> None:
    call, user_id = await call_in(phone)
    await call.start()
    twiml = await call.say("set a reminder to water the plants")
    assert "What time should I remind you?" in twiml
    twiml = await call.say("half past seven in the evening")
    assert "at 7:30 pm: water the plants. Is that right?" in twiml
    await call.say(digits="1")
    rows = await phone.db("select time from reminders where user_id = %s", user_id)
    assert [r["time"] for r in rows] == ["19:30"]


@pytest.mark.parametrize("words", ["Help!", "I fell", "tolong", "救命", "உதவி"])
async def test_t4_help_raises_an_sos_before_anything_else(phone: Phone, words: str) -> None:
    call, user_id = await call_in(phone)
    await call.start()
    await call.say("remind me at 8 to take medicine")  # even in the middle of a question
    twiml = await call.say(words)
    assert "Help is on the way. If you can, hang up and call 9 9 5." in twiml
    assert "<Hangup" in twiml
    rows = await phone.db("select trigger from sos_events where user_id = %s", user_id)
    assert [r["trigger"] for r in rows] == ["voice"]


async def test_pressing_9_is_help(phone: Phone) -> None:
    call, user_id = await call_in(phone)
    await call.start()
    await call.say(digits="9")
    assert await phone.db("select 1 from sos_events where user_id = %s", user_id)


async def test_t5_silence_twice_says_goodbye_and_hangs_up(phone: Phone) -> None:
    call, _ = await call_in(phone)
    await call.start()
    first = await call.say(step="silence")
    assert "Are you still there?" in first and "<Hangup" not in first
    second = await call.say(step="silence")
    assert "I'll call back later. Take care!" in second and "<Hangup" in second


async def test_something_we_dont_understand_asks_again(phone: Phone) -> None:
    call, _ = await call_in(phone)
    await call.start()
    twiml = await call.say("purple elephants")
    assert "Sorry, I didn't catch that." in twiml
    assert "What would you like to do?" in twiml


async def test_bye_ends_the_call(phone: Phone) -> None:
    call, _ = await call_in(phone)
    await call.start()
    twiml = await call.say("no thanks, bye")
    assert "<Hangup" in twiml


async def test_when_we_call_a_member_they_are_greeted_by_name(phone: Phone) -> None:
    _, number = await phone.new_member("Ahmad Rahman")
    r = await phone.client.post(
        "/voice/incoming",
        data={
            "CallSid": f"CA{secrets.token_hex(8)}",
            "Direction": "outbound-api",
            "From": "+15550001111",  # our Twilio number
            "To": number,
        },
    )
    assert "Hi Ahmad, it's Buddy from Bricks." in r.text


async def test_an_unknown_number_hears_the_language_menu(phone: Phone) -> None:
    call = Call(phone, "+15550000099", f"CA{secrets.token_hex(8)}")
    twiml = await call.start()
    assert 'numDigits="1"' in twiml
    for option in ("For English, press 1.", "Untuk Bahasa Melayu, tekan 2.", "中文请按 3。"):
        assert option in twiml
    # Demo mode: they carry on as the sample member.
    r = await phone.client.post(
        "/voice/language", data={"CallSid": call.sid, "From": call.number, "Digits": "1"}
    )
    assert "Hi Raj, it's Buddy from Bricks." in r.text


async def test_every_turn_is_logged_without_what_was_said(phone: Phone) -> None:
    call, user_id = await call_in(phone)
    await call.start()
    await call.say("What's on today? My son is Ravi")
    rows = await phone.db("select * from messages_log where provider_id = %s order by at", call.sid)
    assert [r["kind"] for r in rows] == ["welcome", "today"]
    assert all(r["user_id"] == user_id and r["route"] == "call" for r in rows)
    # The shared log keeps no free text (same rule as WhatsApp).
    assert not any("Ravi" in str(v) for r in rows for v in r.values())


async def test_a_call_survives_a_server_restart(phone: Phone) -> None:
    call, _ = await call_in(phone)
    await call.start()
    session.end(call.sid)  # as if the process restarted
    twiml = await call.say("What's on today?")
    assert "Sorry" not in twiml


# ---------- voice 2.1: what the keywords don't catch goes to Buddy's brain ----------


async def test_t8_an_open_question_is_answered_by_the_orchestrator(
    phone: Phone, monkeypatch: pytest.MonkeyPatch
) -> None:
    from .test_assistant_turn import FakeGemini, call, say

    fake = FakeGemini(call("get_walk_stats"), say("You walked 3 times this week. Well done!"))
    monkeypatch.setattr(orchestrator, "_client", lambda ctx: fake)
    c, _ = await call_in(phone)
    await c.start()
    twiml = await c.say("How did my walking go this week?")
    assert "You walked 3 times this week. Well done!" in twiml
    assert "Anything else?" in twiml
    # The model got the member's real numbers.
    response = fake.sent[1][-1].parts[0].function_response  # type: ignore[index]
    assert response is not None and response.name == "get_walk_stats"


async def test_a_change_from_the_orchestrator_is_confirmed_on_the_call(
    phone: Phone, monkeypatch: pytest.MonkeyPatch
) -> None:
    from .test_assistant_turn import FakeGemini, call

    args = {"kind": "other", "text": "Call Ravi", "time": "18:00", "repeat": "daily"}
    monkeypatch.setattr(
        orchestrator, "_client", lambda ctx: FakeGemini(call("set_reminder", **args))
    )
    c, user_id = await call_in(phone)
    await c.start()
    twiml = await c.say("I need to ring Ravi every evening at six")
    assert "Every day at 6 pm: Call Ravi. Is that right? Say yes, or press 1." in twiml
    assert not await phone.db("select 1 from reminders where user_id = %s", user_id)
    twiml = await c.say(digits="1")
    assert "Done." in twiml
    rows = await phone.db("select text, created_by from reminders where user_id = %s", user_id)
    assert rows == [{"text": "Call Ravi", "created_by": "call"}]


async def test_a_slow_or_missing_model_falls_back_to_the_menu(phone: Phone) -> None:
    c, _ = await call_in(phone)
    await c.start()
    twiml = await c.say("How did my walking go this week?")
    assert "Sorry, I didn't catch that." in twiml
