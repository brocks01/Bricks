"""Voice 2.1: one Buddy turn end to end, with Gemini replaced by a script.

Real Postgres (test schema), real tools; the model's answers are scripted so each test
knows exactly which tool it asked for. Each test is a brand-new member.

The everyday requests never reach the model (the pre-router): those tests use `Never()`,
which fails if the model is asked anything.
"""

import secrets
from collections.abc import AsyncIterator, Callable
from datetime import UTC, datetime
from typing import Any

import pytest
from google.genai import types

from bricks_api.assistant import orchestrator
from bricks_api.assistant.contract import ConfirmAnswer, TurnIn, TurnOut
from bricks_api.config import Settings
from bricks_api.deps import Ctx
from bricks_api.main import create_app

from .conftest import TEST_SCHEMA

pytestmark = pytest.mark.asyncio(loop_scope="session")


def call(name: str, **args: Any) -> types.GenerateContentResponse:
    part = types.Part(function_call=types.FunctionCall(name=name, args=args))
    return types.GenerateContentResponse(
        candidates=[types.Candidate(content=types.Content(role="model", parts=[part]))]
    )


def say(text: str) -> types.GenerateContentResponse:
    return types.GenerateContentResponse(
        candidates=[
            types.Candidate(content=types.Content(role="model", parts=[types.Part(text=text)]))
        ]
    )


class FakeGemini:
    """Plays back scripted answers and records what it was sent."""

    def __init__(self, *answers: types.GenerateContentResponse | Exception) -> None:
        self.answers = list(answers)
        self.sent: list[list[types.Content]] = []
        self.aio = self
        self.models = self

    async def generate_content(self, *, model: str, contents: Any, config: Any = None) -> Any:
        self.sent.append(list(contents))
        if not self.answers:
            raise AssertionError("the model was asked more often than scripted")
        answer = self.answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer


class Never(FakeGemini):
    async def generate_content(self, **_: Any) -> Any:
        raise AssertionError("the model must not be asked")


def down() -> FakeGemini:
    """The model and its fallback model both fail."""
    return FakeGemini(RuntimeError("down"), RuntimeError("still down"))


@pytest.fixture(scope="session")
async def app(seeded: None) -> AsyncIterator[Any]:
    application = create_app(Settings(db_schema=TEST_SCHEMA, demo_mode=True))
    async with application.router.lifespan_context(application):
        yield application


Run = Callable[..., Any]


@pytest.fixture
def buddy(app: Any, monkeypatch: pytest.MonkeyPatch) -> Run:
    """turn(text, fake=..., **TurnIn fields) as a new member; returns TurnOut."""
    user_id = f"u_bud_{secrets.token_hex(4)}"
    created = False

    async def run(text: str = "", fake: FakeGemini | None = None, **fields: Any) -> TurnOut:
        nonlocal created
        monkeypatch.setattr(orchestrator, "_client", lambda ctx: fake)
        async with app.state.pool.connection() as conn:
            if not created:
                await conn.execute(
                    "insert into users (id, name, home_lat, home_lng) values (%s, 'Mary Tan',"
                    " 1.35, 103.85)",
                    (user_id,),
                )
                created = True
            ctx = Ctx(
                conn=conn, user_id=user_id, now=datetime.now(UTC), settings=app.state.settings
            )
            body = TurnIn(language=fields.pop("language", "en"), text=text or None, **fields)
            return await orchestrator.turn(ctx, body)

    async def db(query: str) -> list[dict[str, Any]]:
        async with app.state.pool.connection() as conn:
            return await (await conn.execute(query, (user_id,))).fetchall()  # type: ignore[no-any-return]

    run.db = db  # type: ignore[attr-defined]
    return run


async def event_titles(app: Any) -> list[str]:
    async with app.state.pool.connection() as conn:
        rows = await (await conn.execute("select title from events")).fetchall()
    return [r["title"] for r in rows]


def kinds(out: TurnOut) -> list[str]:
    return [a.type for a in out.ui_actions]


# ---------- help first ----------


@pytest.mark.parametrize("words", ["I fell", "tolong", "救命", "உதவி"])
async def test_t4_help_opens_sos_without_asking_the_model(buddy: Run, words: str) -> None:
    out = await buddy(words, Never())
    assert out.done and kinds(out) == ["open_sos"]
    assert await buddy.db("select 1 from sos_events where user_id = %s")  # type: ignore[attr-defined]


# ---------- the everyday requests: instant, no model (10 per intent) ----------

TODAY = [
    "What's on today?",
    "whats on today",
    "What do I have today?",
    "Anything today?",
    "Got what today ah?",
    "what's happening today",
    "Tell me my plan",
    "Any activity today?",
    "Anything on today?",
    "what is on today",
]


@pytest.mark.parametrize("words", TODAY)
async def test_t1_today_answers_from_real_data_without_the_model(
    buddy: Run, app: Any, words: str
) -> None:
    out = await buddy(words, Never())
    assert out.done and kinds(out) == ["navigate"]
    titles = await event_titles(app)
    assert any(t in out.reply_text for t in titles) or out.reply_text.startswith("Nothing")


REMINDERS = [
    ("Remind me to take my medicine at 8 every morning", "08:00", "daily", "medicine"),
    ("remind me take medicine 8 o'clock every day", "08:00", "daily", "medicine"),
    ("Can remind me to call Ravi at 6 pm", "18:00", "once", "other"),
    ("Set a reminder for my doctor appointment at 10 am tomorrow", "10:00", "once", "doctor"),
    ("remind me to drink water at 3 in the afternoon", "15:00", "once", "other"),
    ("Don't let me forget my pills at 9 pm every night", "21:00", "daily", "medicine"),
    ("remind me to take my tablets at half past 7 every day", "07:30", "daily", "medicine"),
    ("please remind me to water the plants at 5 pm", "17:00", "once", "other"),
    ("remind me at 8 am on weekdays to take medicine", "08:00", "weekdays", "medicine"),
    ("Can you remind me to call my daughter at 7:15 tonight", "19:15", "once", "other"),
]


@pytest.mark.parametrize(("words", "time", "repeat", "kind"), REMINDERS)
async def test_t3_reminders_with_a_time_ask_first_without_the_model(
    buddy: Run, words: str, time: str, repeat: str, kind: str
) -> None:
    out = await buddy(words, Never())
    assert not out.done
    confirm = out.ui_actions[-1]
    assert confirm.type == "confirm" and confirm.tool == "set_reminder"
    assert (confirm.args["time"], confirm.args["repeat"], confirm.args["kind"]) == (
        time,
        repeat,
        kind,
    )
    assert ("date" in confirm.args) == (repeat == "once")
    assert out.reply_text.endswith("Is that right?")
    assert not await buddy.db("select 1 from reminders where user_id = %s")  # type: ignore[attr-defined]


async def test_a_daily_reminder_is_said_back_as_every_day(buddy: Run) -> None:
    out = await buddy("remind me to take medicine at 8 every morning", Never())
    assert out.reply_text == "Every day at 8 am: Take medicine. Is that right?"


async def test_t3_yes_saves_the_reminder(buddy: Run) -> None:
    out = await buddy("remind me to take medicine at 8 every morning", Never())
    args = out.ui_actions[-1].args
    out = await buddy(
        confirm=ConfirmAnswer(tool="set_reminder", args=args, answer="yes"), fake=Never()
    )
    assert out.done and out.reply_text == "Done."
    rows = await buddy.db("select text, time, repeat from reminders where user_id = %s")  # type: ignore[attr-defined]
    assert rows == [{"text": "Take medicine", "time": "08:00", "repeat": "daily"}]


JOINS = [
    "join",
    "I want to join",
    "Join the next walk",
    "sign me up",
    "count me in",
    "I want to go",
    "can join",
    "I'll go",
    "I will go",
    "join lah",
]


@pytest.mark.parametrize("words", JOINS)
async def test_t2_a_plain_join_asks_about_the_next_event_without_the_model(
    buddy: Run, app: Any, words: str
) -> None:
    out = await buddy(words, Never())
    assert not out.done and kinds(out) == ["confirm"]
    assert out.ui_actions[0].tool == "join_event"
    assert any(f"for {t}." in out.reply_text for t in await event_titles(app))


SCREENS = [
    ("Open my reminders", "reminders"),
    ("go to settings", "settings"),
    ("show me the community", "kampung"),
    ("take me home", "home"),
    ("open my health", "thrive"),
    ("Open safe circle", "safe_circle"),
    ("show my circles", "circles"),
    ("go to my activity", "pass_it_on"),
    ("open language", "language"),
    ("show my family", "family"),
]


@pytest.mark.parametrize(("words", "screen"), SCREENS)
async def test_t6_open_a_screen_without_the_model(buddy: Run, words: str, screen: str) -> None:
    out = await buddy(words, Never())
    assert out.done and kinds(out) == ["navigate"]
    assert out.ui_actions[0].screen == screen


WALK_START = [
    "start walk",
    "start a walk",
    "start my walk",
    "let's walk",
    "lets walk",
    "go walking",
    "start walk now",
    "I want to start my walk",
    "ok start a walk",
    "let's walk lah",
]
WALK_STOP = [
    "stop walk",
    "finish walk",
    "end walk",
    "I'm done walking",
    "im done walking",
    "stop walking",
    "please stop walk",
    "finish walk now",
    "ok end walk",
    "stop walking already",
]


@pytest.mark.parametrize("words", WALK_START)
async def test_starting_a_walk_without_the_model(buddy: Run, words: str) -> None:
    out = await buddy(words, Never())
    assert kinds(out) == ["start_walk"]


@pytest.mark.parametrize("words", WALK_STOP)
async def test_finishing_a_walk_without_the_model(buddy: Run, words: str) -> None:
    out = await buddy(words, Never())
    assert kinds(out) == ["finish_walk"]


@pytest.mark.parametrize(
    ("words", "language", "screen"),
    [
        ("buka tetapan", "ms", "settings"),
        ("打开我的提醒", "zh", "reminders"),
        ("அமைப்புகளைத் திற", "ta", "settings"),
    ],
)
async def test_screens_open_in_every_language(
    buddy: Run, words: str, language: str, screen: str
) -> None:
    out = await buddy(words, Never(), language=language)
    assert out.ui_actions[0].screen == screen


async def test_today_in_tamil_answers_in_tamil(buddy: Run) -> None:
    out = await buddy("இன்று என்ன இருக்கிறது", Never(), language="ta")
    assert kinds(out) == ["navigate"]
    assert out.reply_text.startswith(("அடுத்து", "இன்று", "அடுத்த"))


# ---------- the model takes the rest ----------


@pytest.mark.parametrize(
    "words",
    [
        "What's on tomorrow?",
        "Any walks on Saturday?",
        "Join the second one",
        "How many steps did I walk this week?",
        "join the tai chi class",
        "set a medicine reminder",
        "hello",
    ],
)
async def test_anything_more_specific_goes_to_the_model(buddy: Run, words: str) -> None:
    out = await buddy(words, FakeGemini(say("From the model.")))
    assert out.reply_text == "From the model."


async def test_t1_the_model_reads_real_data_for_tomorrow(buddy: Run) -> None:
    fake = FakeGemini(call("find_events", when="tomorrow"), say("Tomorrow there's a walk."))
    out = await buddy("What's on tomorrow?", fake)
    assert out.reply_text == "Tomorrow there's a walk." and out.done
    response = fake.sent[1][-1].parts[0].function_response  # type: ignore[index]
    assert response is not None and response.name == "find_events"
    assert "events" in (response.response or {})


async def test_a_model_reminder_asks_first(buddy: Run) -> None:
    args = {"kind": "medicine", "text": "Take medicine", "time": "08:00", "repeat": "daily"}
    out = await buddy("set a medicine reminder", FakeGemini(call("set_reminder", **args)))
    assert not out.done and out.ui_actions[-1].type == "confirm"
    assert out.reply_text == "Every day at 8 am: Take medicine. Is that right?"
    assert not await buddy.db("select 1 from reminders where user_id = %s")  # type: ignore[attr-defined]


async def test_no_changes_nothing(buddy: Run) -> None:
    args = {"kind": "other", "text": "Call Ravi", "time": "18:00"}
    out = await buddy(
        confirm=ConfirmAnswer(tool="set_reminder", args=args, answer="no"), fake=Never()
    )
    assert out.reply_text == "Okay, I didn't change anything."
    assert not await buddy.db("select 1 from reminders where user_id = %s")  # type: ignore[attr-defined]


async def test_t2_the_model_join_asks_with_the_events_name(buddy: Run, app: Any) -> None:
    async with app.state.pool.connection() as conn:
        row = await (
            await conn.execute("select id, title from events where start_at > now() limit 1")
        ).fetchone()
    assert row
    out = await buddy("join the first one", FakeGemini(call("join_event", event_id=row["id"])))
    assert out.reply_text == f"I'll put you down for {row['title']}. Is that right?"
    await buddy(
        confirm=ConfirmAnswer(tool="join_event", args={"event_id": row["id"]}, answer="yes")
    )
    assert await buddy.db("select 1 from rsvps where user_id = %s and status = 'going'")  # type: ignore[attr-defined]


async def test_show_dont_tell_screen_actions_play_in_order(buddy: Run) -> None:
    fake = FakeGemini(
        call("navigate", screen="new_reminder"),
        call("fill_field", field="text", value="Take medicine"),
        say("I've opened a new reminder for you."),
    )
    out = await buddy("set a medicine reminder", fake, screen="home")
    assert [(a.type, getattr(a, "target", getattr(a, "screen", None))) for a in out.ui_actions] == [
        ("navigate", "new_reminder"),
        ("fill", "text"),
    ]


async def test_replies_are_at_most_two_sentences(buddy: Run) -> None:
    out = await buddy("hello", FakeGemini(say("One. Two. Three. Four.")))
    assert out.reply_text == "One. Two."


# ---------- model down: the keywords do what they can ----------


@pytest.mark.parametrize(
    ("words", "screen"),
    [
        ("join the tai chi class", "kampung"),
        ("What's on Saturday?", "kampung"),
        ("remind me to call Ravi", "new_reminder"),
        ("settings", "settings"),
    ],
)
async def test_t7_model_down_opens_the_right_screen(buddy: Run, words: str, screen: str) -> None:
    out = await buddy(words, down())
    assert out.ui_actions[0].screen == screen


async def test_a_turn_in_tamil_answers_in_tamil_when_nothing_matches(buddy: Run) -> None:
    out = await buddy("ஹலோ", down(), language="ta")
    assert out.reply_text.startswith("மன்னிக்கவும்")


async def test_the_endpoint_answers(app: Any, monkeypatch: pytest.MonkeyPatch) -> None:
    import httpx

    monkeypatch.setattr(orchestrator, "_client", lambda ctx: FakeGemini(say("Hello Raj!")))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post("/assistant/turn", json={"language": "en", "text": "hello"})
    assert r.status_code == 200, r.text
    assert r.json()["reply_text"] == "Hello Raj!"
