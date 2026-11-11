"""Voice iteration 0.2: Buddy's contracts (tools, distress list, prompt, turn shape).

Pure tests, no database. T1-T3 are the iteration's test cases. The live Gemini check
at the end only runs with RUN_GEMINI_LIVE=1 and GEMINI_API_KEY set.
"""

import os
import re
from datetime import UTC, datetime
from typing import Any

import pytest
from pydantic import TypeAdapter, ValidationError

from bricks_api.assistant.contract import TurnIn, TurnOut, UiAction
from bricks_api.assistant.distress import is_distress, match_distress, phrases
from bricks_api.assistant.prompt import render_system_prompt
from bricks_api.assistant.tools import all_tools, gemini_tool, is_mutating, tools_for

# ---------------------------------------------------------------- T1: tools


def test_t1_every_tool_is_a_valid_gemini_function_declaration() -> None:
    tools = all_tools()
    assert len(tools) >= 20
    for channel in ("app", "whatsapp", "call"):
        declared = gemini_tool(channel).function_declarations or []
        assert declared, channel
        for decl in declared:
            assert decl.name and decl.description


def _check_schema(name: str, schema: dict[str, Any]) -> None:
    assert schema.get("type") == "object", name
    props: dict[str, Any] = schema.get("properties", {})
    for req in schema.get("required", []):
        assert req in props, f"{name}: required '{req}' is not a property"
    for prop, spec in props.items():
        assert spec.get("type") in {"string", "boolean", "integer", "number"}, (name, prop)
        if "enum" in spec:
            assert spec["enum"] and len(set(spec["enum"])) == len(spec["enum"]), (name, prop)
        if "pattern" in spec:
            re.compile(spec["pattern"])


def test_t1_parameters_are_simple_well_formed_json_schema() -> None:
    for tool in all_tools().values():
        _check_schema(tool.name, tool.parameters)


def test_changes_need_a_yes_and_safety_never_waits() -> None:
    mutating = {t.name for t in all_tools().values() if t.mutating}
    assert mutating == {
        "join_event",
        "cancel_event",
        "set_reminder",
        "delete_reminder",
        "create_event",
        "offer_skill",
    }
    # The check-in answer is its own confirmation; SOS is immediate.
    assert not is_mutating("check_in")
    assert not is_mutating("trigger_sos")
    assert not is_mutating("no_such_tool")


def test_calls_and_whatsapp_get_no_screen_tools() -> None:
    screen_only = {
        "navigate",
        "read_screen",
        "fill_field",
        "start_walk",
        "finish_walk",
        "start_warmup",
    }
    for channel in ("call", "whatsapp"):
        names = {t.name for t in tools_for(channel)}
        assert not names & screen_only, channel
        assert {"trigger_sos", "get_today", "join_event", "set_reminder"} <= names
    app = {t.name for t in tools_for("app")}
    assert screen_only <= app


def test_sos_is_on_every_channel_and_opens_the_sos_screen() -> None:
    sos = all_tools()["trigger_sos"]
    assert set(sos.channels) == {"app", "whatsapp", "call"}
    assert sos.ui_action == "open_sos"


def test_camera_warm_ups_only_on_android() -> None:
    assert "start_warmup" in {t.name for t in tools_for("app", "android")}
    assert "start_warmup" not in {t.name for t in tools_for("app", "ios")}


def test_p1_tools_can_be_left_out() -> None:
    names = {t.name for t in tools_for("app", include_p1=False)}
    assert "create_event" not in names and "join_event" in names


def test_screen_tools_name_an_app_action() -> None:
    allowed = {
        "confirm",
        "navigate",
        "highlight",
        "fill",
        "start_walk",
        "finish_walk",
        "start_warmup",
        "open_sos",
        "choices",
    }
    for tool in all_tools().values():
        if tool.ui_action is not None:
            assert tool.ui_action in allowed
            assert tool.channels == ["app"] or tool.name == "trigger_sos", tool.name


# ---------------------------------------------------------------- T2 / T3: distress

DISTRESS_SENTENCES = {
    "en": [
        "Help!",
        "please help me",
        "I fell in the bathroom",
        # Curly apostrophes, as speech-to-text and phones often send them.
        "I{q}ve fallen and I can{q}t get up".format(q="\N{RIGHT SINGLE QUOTATION MARK}"),
        "my chest pain is bad",
        "I can't breathe properly",
        "call an ambulance",
        "this is an emergency",
        "I think it's a heart attack",
        "save me please",
    ],
    "ms": [
        "tolong!",
        "tolong saya cepat",
        "saya jatuh di dapur",
        "nenek terjatuh",
        "dada saya sakit",
        "sesak nafas",
        "saya tak boleh bernafas",
        "ini kecemasan",
        "panggil ambulans",
        "rasa macam serangan jantung",
    ],
    "zh": [
        "救命啊",
        "帮帮我",
        "救救我吧",
        "我摔倒了起不来",
        "我在浴室跌倒",
        "胸口痛得厉害",
        "我喘不过气",
        "呼吸困难",
        "快叫救护车",
        "紧急情况",
    ],
    "ta": [
        "உதவி!",
        "எனக்கு உதவுங்கள்",
        "என்னைக் காப்பாற்று",
        "நான் விழுந்துவிட்டேன்",
        "குளியலறையில் விழுந்துவிட்டேன்",
        "நெஞ்சு வலிக்கிறது",
        "மூச்சு விட முடியவில்லை",
        "மூச்சுத் திணறல் உள்ளது",
        "இது அவசரம்",
        "ஆம்புலன்ஸ் அழைக்கவும்",
    ],
}


@pytest.mark.parametrize(
    "sentence",
    [s for sentences in DISTRESS_SENTENCES.values() for s in sentences],
)
def test_t2_every_distress_sentence_matches(sentence: str) -> None:
    assert is_distress(sentence), sentence


def test_t2_ten_sentences_in_each_language() -> None:
    assert set(DISTRESS_SENTENCES) == set(phrases()) == {"en", "ms", "zh", "ta"}
    assert all(len(s) == 10 for s in DISTRESS_SENTENCES.values())


def test_t3_help_me_find_a_walk_matches_on_purpose() -> None:
    # Team decision (iteration 0.2 T3): err on the safe side. The SOS screen's
    # 5-second countdown lets them cancel a false alarm; a missed one can't be undone.
    assert match_distress("help me find a walk") in {"help", "help me"}


@pytest.mark.parametrize(
    "sentence",
    [
        "I'd like to join the painting class",
        "my helpful neighbour",
        "what's on today",
        "remind me to take medicine at 8",
        "apa ada hari ini",
        "明天有什么活动",
        "இன்று என்ன இருக்கிறது",
        "",
        "   ",
    ],
)
def test_everyday_sentences_do_not_raise_an_alarm(sentence: str) -> None:
    assert not is_distress(sentence)


def test_any_language_is_caught_whatever_the_members_language() -> None:
    # The matcher has no language argument on purpose.
    assert is_distress("tolong") and is_distress("救命") and is_distress("HELP")


# ---------------------------------------------------------------- the prompt

NOW = datetime(2026, 11, 11, 1, 30, tzinfo=UTC)  # 9:30 am in Singapore


@pytest.mark.parametrize("channel", ["app", "whatsapp", "call"])
@pytest.mark.parametrize("language", ["en", "ms", "zh", "ta"])
def test_prompt_renders_for_every_channel_and_language(channel: str, language: str) -> None:
    text = render_system_prompt(
        language=language,  # type: ignore[arg-type]
        member_name="Raj",
        channel=channel,  # type: ignore[arg-type]
        now=NOW,
        screen_name="Home",
        screen_script="Good morning, Raj.",
    )
    assert "{" not in text and "}" not in text
    assert "Raj" in text and "trigger_sos" in text and "995" in text
    assert "Wednesday 11 November 2026, 09:30" in text
    if channel == "app":
        assert "Good morning, Raj." in text
    else:
        # No screen on calls and WhatsApp, whatever the caller sends.
        assert "Good morning, Raj." not in text and "no screen" in text


# ---------------------------------------------------------------- the turn contract


def test_a_turn_carries_exactly_one_of_audio_or_text() -> None:
    TurnIn(language="en", text="what's on today")
    TurnIn(language="ta", channel="call", audio="UklGRg==", audio_mime="audio/wav")
    with pytest.raises(ValidationError):
        TurnIn(language="en")
    with pytest.raises(ValidationError):
        TurnIn(language="en", text="hi", audio="UklGRg==")
    # A Yes / No tap needs nothing else.
    TurnIn(
        language="en",
        confirm={
            "tool": "set_reminder",
            "args": {"kind": "medicine", "text": "Take medicine", "time": "08:00"},
            "answer": "yes",
        },
    )


def test_the_documented_example_response_is_valid() -> None:
    # docs: iterations/voice-call-agent/0.2-contracts.md §2.3
    out = TurnOut.model_validate(
        {
            "transcript": "remind me to take medicine at 8 every morning",
            "reply_text": "Every day at 8 am: take medicine. Is that right?",
            "reply_audio_url": None,
            "ui_actions": [
                {
                    "type": "confirm",
                    "tool": "set_reminder",
                    "args": {"text": "Take medicine", "time": "08:00", "repeat": "daily"},
                    "summary": "Every day at 8 am: take medicine.",
                }
            ],
            "done": False,
        }
    )
    assert out.ui_actions[0].type == "confirm"


def test_every_ui_action_type_round_trips() -> None:
    adapter: TypeAdapter[UiAction] = TypeAdapter(UiAction)
    for action in [
        {"type": "navigate", "screen": "reminders"},
        {"type": "highlight", "target": "event:e_walk_bishan"},
        {"type": "fill", "target": "title", "value": "Morning walk"},
        {"type": "start_walk"},
        {"type": "finish_walk"},
        {"type": "start_warmup", "exercise": "sit_to_stand"},
        {"type": "open_sos", "reason": "I fell"},
        {
            "type": "choices",
            "options": [
                {"label": "What's on today", "say": "what's on today"},
                {"label": "Set a reminder", "say": "set a reminder"},
            ],
        },
    ]:
        assert adapter.dump_python(adapter.validate_python(action), exclude_none=True) == action
    with pytest.raises(ValidationError):
        adapter.validate_python({"type": "dance"})


# ---------------------------------------------------------------- show, don't tell


def test_filling_a_field_shows_on_screen_and_saves_nothing() -> None:
    fill = all_tools()["fill_field"]
    assert fill.ui_action == "fill" and not fill.mutating
    assert fill.channels == ["app"]
    assert set(fill.parameters["required"]) == {"field", "value"}


def test_a_turn_carries_the_form_on_screen() -> None:
    turn = TurnIn(
        language="en",
        text="call it Morning walk",
        screen="create_event",
        screen_fields=[
            {"id": "title", "label": "Name", "kind": "text", "value": None},
            {
                "id": "when",
                "label": "Which day",
                "kind": "choice",
                "value": "saturday",  # picked by hand
                "options": ["today", "tomorrow", "saturday", "other"],
            },
        ],
    )
    assert turn.screen_fields and turn.screen_fields[1].value == "saturday"
    with pytest.raises(ValidationError):
        TurnIn(
            language="en",
            text="hi",
            screen_fields=[{"id": "x", "label": "X", "kind": "colour"}],
        )


def test_steps_play_in_order() -> None:
    out = TurnOut.model_validate(
        {
            "transcript": "start a walk on saturday called morning walk",
            "reply_text": "Here it is: Morning walk on Saturday. Shall I post it?",
            "reply_audio_url": None,
            "ui_actions": [
                {"type": "navigate", "screen": "create_event"},
                {"type": "fill", "target": "what", "value": "walk"},
                {"type": "fill", "target": "when", "value": "saturday"},
                {"type": "fill", "target": "title", "value": "Morning walk"},
                {
                    "type": "confirm",
                    "tool": "create_event",
                    "args": {"title": "Morning walk", "category": "walk"},
                    "summary": "Post Morning walk on Saturday.",
                },
            ],
            "done": False,
        }
    )
    assert [a.type for a in out.ui_actions] == [
        "navigate",
        "fill",
        "fill",
        "fill",
        "confirm",
    ]


def test_the_app_prompt_says_show_dont_tell() -> None:
    app = render_system_prompt(language="en", member_name="Raj", channel="app", now=NOW)
    call = render_system_prompt(language="en", member_name="Raj", channel="call", now=NOW)
    assert "Show, don't tell" in app and "fill_field" in app
    assert "fill_field" not in call


# ---------------------------------------------------------------- live (opt-in)


@pytest.mark.skipif(
    os.getenv("RUN_GEMINI_LIVE") != "1" or not os.getenv("GEMINI_API_KEY"),
    reason="live Gemini check: set RUN_GEMINI_LIVE=1 and GEMINI_API_KEY",
)
def test_t1_live_gemini_accepts_the_tools_and_picks_one() -> None:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    response = client.models.generate_content(
        # 2.5 models aren't offered to new projects; 3.5 flash answers fast and reliably.
        model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
        contents="What's on for me today?",
        config=types.GenerateContentConfig(
            system_instruction=render_system_prompt(
                language="en", member_name="Raj", channel="app", now=NOW
            ),
            tools=[gemini_tool("app")],
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        ),
    )
    calls = response.function_calls or []
    assert calls and calls[0].name == "get_today"
