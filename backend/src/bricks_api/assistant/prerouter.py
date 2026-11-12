"""Buddy's fast path: the everyday requests answered from keywords, without the model.

"What's on today?", "Remind me to take my medicine at 8", "Join the next walk", "Open my
reminders", "Start my walk": these are most of what members say, and they answer in a
fraction of a second this way. Anything else (or anything with a day, "the second one",
"how many", ...) goes to Gemini, which can follow it.

`route(..., sure_only=True)` is the fast path before the model: it only answers when the
keywords leave no doubt. `sure_only=False` is the fallback when the model is down or slow:
it answers whatever the keywords can, and opens the right screen for the rest.

Changes still ask first: a reminder or a join comes back as a confirm action, exactly as
the model's would.
"""

import json
import re
from datetime import datetime
from functools import cache
from pathlib import Path
from typing import Any

from ..calls.intents import (
    has,
    keywords,
    match_intent,
    parse_reminder,
    reminder_date,
    say_time,
)
from ..deps import Ctx
from ..routers.events import list_events
from ..routers.thrive import today
from ..schemas import EventSummary, Language
from ..timeutil import local, parse_iso
from .contract import (
    FinishWalkAction,
    NavigateAction,
    StartWalkAction,
    TurnIn,
    TurnOut,
    UiAction,
)
from .distress import normalise

SCREENS_FILE = Path(__file__).with_name("screens.json")
REPLIES_FILE = Path(__file__).with_name("replies.json")

# A join with nothing else in it ("join the next walk", "can I go lah"): safe to pick
# the next event and ask. "Join the tai chi class" has other words, so the model picks.
_JOIN_FILLER = frozenset(
    [
        "i",
        "want",
        "to",
        "the",
        "next",
        "walk",
        "one",
        "a",
        "please",
        "me",
        "can",
        "lah",
        "leh",
        "it",
        "this",
        "that",
        "event",
        "activity",
        "go",
        "yes",
        "ok",
        "okay",
        "also",
    ]
)


@cache
def _screens() -> dict[str, Any]:
    return json.loads(SCREENS_FILE.read_text(encoding="utf-8"))  # type: ignore[no-any-return]


@cache
def _replies() -> dict[str, Any]:
    return json.loads(REPLIES_FILE.read_text(encoding="utf-8"))  # type: ignore[no-any-return]


def _say(key: str, lang: Language, **fill: str) -> str:
    return str(_replies()["say"][key][lang]).format(**fill)


def screen_named(said: str, lang: Language) -> str | None:
    """The screen they named, if any (most specific first)."""
    text = normalise(said)
    for screen, words in _screens()["screens"][lang]:
        if has(text, tuple(normalise(w) for w in words)):
            return str(screen)
    return None


def _words(lang: Language, key: str) -> tuple[str, ...]:
    return tuple(normalise(w) for w in _screens()[key][lang])


def is_specific(said: str, lang: Language) -> bool:
    """A day, an ordinal, a question word: more than the keywords can follow."""
    return has(normalise(said), _words(lang, "specific"))


def _only_a_day(said: str, lang: Language) -> bool:
    """Specific only because of "tomorrow" (the reminder parser understands that one)."""
    text = normalise(said)
    for word in _screens()["tomorrow"][lang]:
        text = text.replace(normalise(word), " ")
    return not is_specific(text, lang)


def _plain_join(said: str, lang: Language) -> bool:
    if lang != "en":
        return False
    text = normalise(said)
    for phrase in sorted(keywords("en")["join"], key=len, reverse=True):
        text = text.replace(phrase, " ")
    return all(w in _JOIN_FILLER for w in re.findall(r"[a-z']+", text))


def _when(start: datetime, now: datetime, lang: Language) -> str:
    s, n = local(start), local(now)
    days = (s.date() - n.date()).days
    clock = say_time(s.hour, s.minute) if lang == "en" else f"{s.hour:02d}:{s.minute:02d}"
    day = _replies()["day"]
    if days == 0:
        return f"{day['today'][lang]} {clock}"
    if days == 1:
        return f"{day['tomorrow'][lang]} {clock}"
    return f"{s.day}/{s.month} {clock}"


def _clock(hhmm: str, lang: Language) -> str:
    hour, minute = (int(x) for x in hhmm.split(":"))
    return say_time(hour, minute) if lang == "en" else hhmm


async def today_reply(ctx: Ctx, lang: Language) -> str:
    """'Your next reminder is at 8 am: take medicine. Next: Morning walk, today 7 am, ...'"""
    t = await today(ctx)
    timed: list[tuple[str, str]] = []  # (sort key, sentence), earliest first
    if t.next_reminder:
        r = t.next_reminder
        line = _say("next_reminder", lang, time=_clock(r.time, lang), text=r.text)
        timed.append((r.time, line))
    if t.next_event:
        e = t.next_event
        start = parse_iso(e.start_at)
        when = _when(start, ctx.now, lang)
        line = _say("next_event", lang, title=e.title, when=when, place=e.place_name)
        today_ = local(start).date() == local(ctx.now).date()
        timed.append((local(start).strftime("%H:%M") if today_ else "99", line))
    parts = [line for _, line in sorted(timed)]
    if not parts:
        return _say("nothing_today", lang)
    joiner = "" if lang == "zh" else " "
    return joiner.join(parts)


async def next_to_join(ctx: Ctx) -> EventSummary | None:
    """The next event they aren't going to yet: today's first, then this week's."""
    t = await today(ctx)
    if t.next_event and t.next_event.my_rsvp != "going":
        return t.next_event
    for event in await list_events(ctx, when="week", category=None):
        if event.my_rsvp != "going" and parse_iso(event.start_at) > ctx.now:
            return event
    return None


Confirm = tuple[str, dict[str, Any]]  # (tool, args) to ask about


async def route(ctx: Ctx, body: TurnIn, said: str, *, sure_only: bool) -> TurnOut | Confirm | None:
    """An answer, a change to ask about, or None (the model should take it)."""
    lang = body.language
    app = body.channel == "app"
    specific = is_specific(said, lang)
    text = normalise(said)
    screen = screen_named(said, lang)

    # "Open my reminders", "go to settings": a screen with an open word goes there.
    if app and screen and not specific and has(text, _words(lang, "verbs")):
        return _out(said, _say("opening", lang), [NavigateAction(screen=screen)])

    intent = match_intent(said, lang)
    if sure_only and specific and not (intent == "remind" and _only_a_day(said, lang)):
        return None
    if intent == "remind":
        ask = parse_reminder(said) if lang == "en" else None
        if ask and ask.time:
            hour, minute = ask.time
            args: dict[str, Any] = {
                "kind": ask.kind,
                "text": ask.text,
                "time": f"{hour:02d}:{minute:02d}",
                "repeat": ask.repeat,
            }
            if ask.repeat == "once":
                args["date"] = reminder_date(ask, ctx.now).isoformat()
            return ("set_reminder", args)
        if app and screen == "reminders" and parse_reminder(said).time is None:
            return _out(said, _say("opening", lang), [NavigateAction(screen="reminders")])
        if app and not sure_only:
            return _out(
                said, _say("open_reminder", lang), [NavigateAction(screen="new_reminder")], False
            )
        return None
    if intent == "join":
        if sure_only and not _plain_join(said, lang):
            return None
        if not _plain_join(said, lang) and app:
            # The model is down and they meant a particular one: show them the list.
            return _out(said, _say("open_community", lang), [NavigateAction(screen="kampung")])
        event = await next_to_join(ctx)
        if event is None:
            return _out(said, _say("nothing_to_join", lang), [])
        return ("join_event", {"event_id": event.id})
    if intent == "today" and specific:
        # "What's on Saturday?" with the model down: the list of what's coming.
        if app:
            return _out(said, _say("open_community", lang), [NavigateAction(screen="kampung")])
        return None
    if intent == "today":
        ui: list[UiAction] = [NavigateAction(screen="home")] if app else []
        return _out(said, await today_reply(ctx, lang), ui)
    if intent == "walk_start" and app:
        return _out(said, _say("walk_started", lang), [StartWalkAction()])
    if intent == "walk_stop" and app:
        return _out(said, _say("walk_finished", lang), [FinishWalkAction()])
    if intent == "profile" and app:
        return _out(said, _say("opening", lang), [NavigateAction(screen="profile")])
    # Just the name of a screen ("Settings"): only when the model can't do better.
    if app and screen and not sure_only:
        return _out(said, _say("opening", lang), [NavigateAction(screen=screen)])
    return None


def _out(said: str, reply: str, actions: list[UiAction], done: bool = True) -> TurnOut:
    return TurnOut(
        transcript=said, reply_text=reply, reply_audio_url=None, ui_actions=actions, done=done
    )
