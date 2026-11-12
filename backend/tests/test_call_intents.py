"""Voice 1.3: keyword lists in four languages, yes / no, and reminder times (T6, T7)."""

from datetime import UTC, datetime

import pytest

from bricks_api.calls.intents import (
    keywords,
    match_intent,
    parse_reminder,
    parse_time,
    reminder_date,
    say_time,
    yes_or_no,
)
from bricks_api.schemas import Language

LANGS: tuple[Language, ...] = ("en", "ms", "zh", "ta")
INTENTS = ("today", "join", "remind", "walk_start", "walk_stop", "profile", "help", "yes", "no")


@pytest.mark.parametrize("lang", LANGS)
def test_every_language_has_every_list(lang: Language) -> None:
    kw = keywords(lang)
    for intent in (*INTENTS, "checkin_yes", "checkin_no", "goodbye"):
        assert kw[intent], f"{lang}.{intent}"
    # "help" always includes the distress list.
    assert len(kw["help"]) >= 10


@pytest.mark.parametrize(
    ("said", "lang", "intent"),
    [
        ("What's on today?", "en", "today"),
        ("got walk today or not?", "en", "today"),
        ("can remind me take medicine 8 o'clock", "en", "remind"),
        ("I want to join", "en", "join"),
        ("bye bye", "en", "goodbye"),
        ("hari ini ada apa?", "ms", "today"),
        ("ingatkan saya makan ubat jam 8", "ms", "remind"),
        ("saya nak ikut", "ms", "join"),
        ("今天有什么活动", "zh", "today"),
        ("提醒我八点吃药", "zh", "remind"),
        ("我要参加", "zh", "join"),
        ("இன்று என்ன இருக்கு?", "ta", "today"),
        ("8 மணிக்கு மருந்து நினைவூட்டு", "ta", "remind"),
        ("நான் வருகிறேன்", "ta", "join"),
    ],
)
def test_t7_intents_in_every_language(said: str, lang: Language, intent: str) -> None:
    assert match_intent(said, lang) == intent


@pytest.mark.parametrize(
    ("said", "lang", "answer"),
    [
        ("yes", "en", "yes"),
        ("can", "en", "yes"),
        ("not right", "en", "no"),
        ("boleh", "ms", "yes"),
        ("tak nak", "ms", "no"),
        ("有", "zh", "yes"),
        ("没有", "zh", "no"),  # contains 有: "no" must win
        ("சரி", "ta", "yes"),
        ("வேண்டாம்", "ta", "no"),
    ],
)
def test_yes_and_no(said: str, lang: Language, answer: str) -> None:
    assert yes_or_no(said, lang) == answer


@pytest.mark.parametrize(
    ("said", "time"),
    [
        ("8", (8, 0)),
        ("8 am", (8, 0)),
        ("8 o'clock", (8, 0)),
        ("at 6:30 pm", (18, 30)),
        ("half past seven", (7, 30)),
        ("eight in the morning", (8, 0)),
        ("9 at night", (21, 0)),
        ("3", (15, 0)),  # 1 to 6 alone means the afternoon
        ("take 2 pills at 8", (8, 0)),
        ("I am going at 3", (15, 0)),  # "I am" is not "a.m."
        ("jam 8 pagi", (8, 0)),
        ("pukul 8.30 malam", (20, 30)),
        ("晚上八点半", (20, 30)),
        ("下午三点", (15, 0)),
        ("காலை 8 மணி", (8, 0)),
    ],
)
def test_times_people_say(said: str, time: tuple[int, int]) -> None:
    assert parse_time(said) == time


def test_t6_singlish_reminder() -> None:
    ask = parse_reminder("can remind me take medicine 8 o'clock")
    assert (ask.text, ask.kind, ask.time) == ("Take medicine", "medicine", (8, 0))
    assert ask.repeat == "once"


@pytest.mark.parametrize(
    ("said", "text", "repeat", "day"),
    [
        ("Remind me to take my medicine at 8", "Take my medicine", "once", None),
        ("remind me every day at 9 pm to call my son", "Call my son", "daily", None),
        (
            "remind me tomorrow at 10 am doctor appointment",
            "Doctor appointment",
            "once",
            "tomorrow",
        ),
        ("set a reminder for 7 on weekdays", "Reminder", "weekdays", None),
    ],
)
def test_reminders(said: str, text: str, repeat: str, day: str | None) -> None:
    ask = parse_reminder(said)
    assert (ask.text, ask.repeat, ask.day) == (text, repeat, day)


def test_a_one_off_reminder_goes_to_the_next_time_that_comes_round() -> None:
    morning = datetime(2026, 11, 12, 1, 0, tzinfo=UTC)  # 9 am in Singapore
    assert reminder_date(parse_reminder("remind me at 8"), morning).day == 13  # 8 am has gone
    assert reminder_date(parse_reminder("remind me at 6 pm"), morning).day == 12


def test_times_are_said_the_way_people_say_them() -> None:
    assert [say_time(8, 0), say_time(18, 30), say_time(12, 0)] == ["8 am", "6:30 pm", "12 noon"]
