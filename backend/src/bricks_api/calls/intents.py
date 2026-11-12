"""What a caller wants, from what they said: keyword lists, yes/no, and reminder times.

The lists live in `calls/keywords/<lang>.json` (one per language, native phrasings and
Singlish). "help" always includes every distress phrase (`assistant/distress.json`), but
the call loop checks distress on its own before any of this.

Latin-script phrases match whole words ("can" never matches "candle"); Chinese and Tamil
phrases match anywhere in what was said, as speech-to-text doesn't put spaces there.
"""

import json
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from functools import cache
from pathlib import Path
from typing import Literal

from ..assistant.distress import normalise, phrases
from ..schemas import Language
from ..timeutil import local

KEYWORD_DIR = Path(__file__).resolve().parent / "keywords"
LANGS: tuple[Language, ...] = ("en", "ms", "zh", "ta")

Intent = Literal["today", "join", "remind", "walk_start", "walk_stop", "profile", "goodbye"]

# Checked in this order: "remind me today at 5" is a reminder, not "what's on today";
# a bare "no" at "Anything else?" ends the call.
FREE_INTENTS: tuple[Intent, ...] = (
    "remind",
    "join",
    "today",
    "walk_start",
    "walk_stop",
    "profile",
    "goodbye",
)

_LATIN = re.compile(r"^[a-z0-9 .'-]+$")


@cache
def keywords(lang: Language) -> dict[str, tuple[str, ...]]:
    data = json.loads((KEYWORD_DIR / f"{lang}.json").read_text(encoding="utf-8"))
    out = {k: tuple(normalise(p) for p in v) for k, v in data.items() if not k.startswith("_")}
    out["help"] = tuple(dict.fromkeys(out.get("help", ()) + phrases()[lang]))
    return out


def has(said: str, words: tuple[str, ...]) -> bool:
    for word in words:
        if _LATIN.match(word):
            if re.search(rf"(?<![a-z']){re.escape(word)}(?![a-z'])", said):
                return True
        elif word in said:
            return True
    return False


def match_intent(text: str, lang: Language) -> Intent | None:
    said = normalise(text)
    if not said:
        return None
    kw = keywords(lang)
    return next((i for i in FREE_INTENTS if has(said, kw[i])), None)


def yes_or_no(text: str, lang: Language) -> Literal["yes", "no"] | None:
    """ "No" wins when both appear: "没有" contains "有", "not right" contains "right"."""
    said = normalise(text)
    kw = keywords(lang)
    if has(said, kw["no"]):
        return "no"
    if has(said, kw["yes"]):
        return "yes"
    return None


# ---------- times ----------

_NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
    "satu": 1, "dua": 2, "tiga": 3, "empat": 4, "lima": 5, "enam": 6, "tujuh": 7,
    "lapan": 8, "sembilan": 9, "sepuluh": 10, "sebelas": 11, "dua belas": 12,
}  # fmt: skip
_ZH_DIGITS = {
    "一": 1,
    "二": 2,
    "两": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
}

_PM_WORDS = (
    "pm", "p.m.", "afternoon", "evening", "night", "tonight",
    "petang", "malam",
    "下午", "晚上", "傍晚", "中午",
    "மாலை", "இரவு", "மதியம்",
)  # fmt: skip
# "am" itself only counts right after the number: "I am" is not a time.
_AM_WORDS = ("morning", "pagi", "上午", "早上", "早晨", "காலை")


def _zh_numbers(text: str) -> str:
    """八点 → 8点, 十二点 → 12点, 三点半 → 3点30 (only before 点)."""

    def number(m: re.Match[str]) -> str:
        s = m.group(1)
        if s.startswith("十"):
            value = 10 + _ZH_DIGITS.get(s[1:], 0)
        elif "十" in s:
            tens, ones = s.split("十")
            value = _ZH_DIGITS[tens] * 10 + _ZH_DIGITS.get(ones, 0)
        else:
            value = _ZH_DIGITS[s]
        return f"{value}点"

    text = re.sub(r"([一二两三四五六七八九十]{1,3})点", number, text)
    return text.replace("点半", "点30")


def _words_to_digits(text: str) -> str:
    for word, value in sorted(_NUMBER_WORDS.items(), key=lambda kv: -len(kv[0])):
        text = re.sub(rf"(?<![a-z]){word}(?![a-z])", str(value), text)
    return text


_TIME = re.compile(
    r"(?:(?P<half>half past) )?"
    r"(?P<lead>at |jam |pukul |by )?"
    r"(?P<h>\d{1,2})(?:[:.](?P<m>\d{2}))?"
    r"\s*(?P<mark>a\.m\.|p\.m\.|am|pm|o'clock|oclock|点|மணி)?"
    r"(?:\s*(?P<m2>\d{2})分?)?"
)


def parse_time(text: str, now: datetime | None = None) -> tuple[int, int] | None:
    """The time in what was said, as (hour, minute) on a 24-hour clock, or None.

    "8" alone is read the way people mean it for reminders: 7 to 11 is morning, 1 to 6 is
    afternoon. The confirmation repeats it, so a wrong guess is caught.
    """
    said = _words_to_digits(_zh_numbers(normalise(text)))
    said = re.sub(r"half past (\d{1,2})", r"\1:30", said)
    best: re.Match[str] | None = None
    for m in _TIME.finditer(said):
        hour = int(m.group("h"))
        if hour > 23:
            continue
        # Prefer a number marked as a time ("8 am", "at 8", "8点") over a bare one
        # ("take 2 pills at 8" → 8).
        marked = bool(m.group("mark") or m.group("lead") or m.group("m"))
        if best is None or marked or not (best.group("mark") or best.group("lead")):
            best = m
            if marked:
                break
    if best is None:
        return None
    hour = int(best.group("h"))
    minute = int(best.group("m") or best.group("m2") or 0)
    if minute > 59:
        return None
    mark = best.group("mark") or ""
    context = said
    pm = mark in ("pm", "p.m.") or (not mark.startswith("a") and has(context, _PM_WORDS))
    am = mark in ("am", "a.m.") or has(context, _AM_WORDS)
    if hour <= 12:
        if pm and hour < 12:
            hour += 12
        elif am and hour == 12:
            hour = 0
        elif not pm and not am and 1 <= hour <= 6:
            hour += 12
    return hour, minute


def say_time(hour: int, minute: int) -> str:
    """For speech: "8 am", "6:30 pm", "12 noon"."""
    if hour == 12 and minute == 0:
        return "12 noon"
    suffix = "am" if hour < 12 else "pm"
    h = hour % 12 or 12
    return f"{h}:{minute:02d} {suffix}" if minute else f"{h} {suffix}"


# ---------- reminders (English) ----------

ReminderKind = Literal["medicine", "doctor", "event", "other"]
Repeat = Literal["once", "daily", "weekdays"]


@dataclass(frozen=True)
class ReminderAsk:
    text: str
    kind: ReminderKind
    time: tuple[int, int] | None
    repeat: Repeat
    day: Literal["today", "tomorrow"] | None


_MEDICINE = re.compile(r"medicine|medication|pill|tablet|ubat|药|மருந்து")
_DOCTOR = re.compile(r"doctor|clinic|appointment|polyclinic|klinik|医生|看病|மருத்துவ")
_DAILY = re.compile(
    r"every ?day|daily|each day|every morning|every night|every evening|setiap hari|每天|தினமும்"
)
_WEEKDAYS = re.compile(r"weekdays?|monday to friday|hari bekerja|工作日|வார நாட்கள்")
_FILLER = re.compile(
    r"\b(can you |could you |please |pls |can |also )*"
    r"(remind me( to)?|set (a |an )?reminder( to| for)?|reminder( to| for)?|"
    r"don'?t let me forget( to)?)\b"
)
_TIME_WORDS = re.compile(
    r"\b(at |by |around )?(half past )?\d{1,2}([:.]\d{2})?\s*(a\.m\.|p\.m\.|am|pm|o'?clock)?"
    r"( in the (morning|afternoon|evening|night))?\b"
)
_REPEAT_WORDS = re.compile(
    r"\b(every ?day|daily|each day|every (morning|night|evening)|on weekdays|weekdays?|"
    r"today|tomorrow|tonight|this (morning|afternoon|evening))\b"
)
_DEFAULT_TEXT: dict[ReminderKind, str] = {
    "medicine": "Take medicine",
    "doctor": "Doctor's appointment",
    "event": "Activity",
    "other": "Reminder",
}


def parse_reminder(text: str) -> ReminderAsk:
    """English (incl. Singlish): "can remind me take medicine 8 o'clock every day"."""
    said = normalise(text)
    kind: ReminderKind = (
        "medicine" if _MEDICINE.search(said) else "doctor" if _DOCTOR.search(said) else "other"
    )
    repeat: Repeat = (
        "daily" if _DAILY.search(said) else "weekdays" if _WEEKDAYS.search(said) else "once"
    )
    day: Literal["today", "tomorrow"] | None = (
        "tomorrow"
        if "tomorrow" in said
        else "today"
        if re.search(r"\b(today|tonight)\b", said)
        else None
    )
    what = _FILLER.sub(" ", _words_to_digits(said))
    what = _REPEAT_WORDS.sub(" ", _TIME_WORDS.sub(" ", what))
    what = re.sub(r"\b(to|for|at|on|the|my|a|lah|leh|hor|ah)\s*$", "", what.strip())
    what = re.sub(r"^\s*(to|for|that|me)\b", "", what).strip(" ,.")
    what = re.sub(r"\s+", " ", what)
    if not what:
        what = _DEFAULT_TEXT[kind]
    return ReminderAsk(
        text=what[:1].upper() + what[1:],
        kind=kind,
        time=parse_time(text),
        repeat=repeat,
        day=day,
    )


def reminder_date(ask: ReminderAsk, now: datetime) -> date:
    """A one-off reminder: the day they said, or the next time that clock time comes round."""
    today = local(now).date()
    if ask.day == "tomorrow":
        return today + timedelta(days=1)
    if ask.day == "today" or ask.time is None:
        return today
    hour, minute = ask.time
    current = local(now)
    return today if (hour, minute) > (current.hour, current.minute) else today + timedelta(days=1)
