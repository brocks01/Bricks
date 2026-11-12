"""The call loop's live sentences (they carry names, times and places).

English only in voice 1.3; Malay, Chinese and Tamil come with 2.2, alongside the call
prompt files. Fixed sentences live in `calls/prompts/` instead. Same rules: at most two
short sentences, no symbols or short forms, "9 9 5" digit by digit.
"""

from datetime import datetime

from ..timeutil import local
from .intents import Repeat, say_time

EN = {
    "event_to_join": "Coming up: {title} at {place}, {when}. Want to join? Say yes, or press 1.",
    "event_mine": "Your next plan is {title} at {place}, {when}.",
    "nothing_planned": "There's nothing planned for today.",
    "next_reminder": "Your next reminder is at {time}: {text}.",
    "joined": "Done! You're going to {title}. I'll remind you before it starts.",
    "nothing_to_join": "There's no walk to join right now.",
    "remind_confirm": "{when}: {text}. Is that right? Say yes, or press 1.",
    "remind_ask_time": "What time should I remind you? For example, 8 in the morning.",
    "remind_ask_what": "What should I remind you about, and at what time?",
    "remind_done": "Done. You'll see it in your reminders in the app too.",
    "cancelled": "Okay, I won't do that.",
    "in_app": "You can do that in the Bricks app.",
    "sos_told": "I've told your Safe Circle. Stay where you are if you can.",
    "goodbye_plain": "Goodbye, and take care!",
    "english_only": "For now I can talk in English only.",
    "say_yes": "Say yes, or press 1.",
    "done": "Done.",
}


def when_spoken(start: datetime, now: datetime) -> str:
    """ "today at 6 pm", "tomorrow at 8 am", "on Saturday at 10 am"."""
    s, n = local(start), local(now)
    days = (s.date() - n.date()).days
    at = say_time(s.hour, s.minute)
    if days == 0:
        return f"today at {at}"
    if days == 1:
        return f"tomorrow at {at}"
    if days < 7:
        return f"on {s.strftime('%A')} at {at}"
    return f"on {s.day} {s.strftime('%B')} at {at}"


def reminder_when(repeat: Repeat, hour: int, minute: int, day: str) -> str:
    """ "Every day at 8 am", "Weekdays at 8 am", "Today at 8 am", "Tomorrow at 8 am"."""
    at = say_time(hour, minute)
    if repeat == "daily":
        return f"Every day at {at}"
    if repeat == "weekdays":
        return f"Weekdays at {at}"
    return f"{day.capitalize()} at {at}"


def as_heard(text: str) -> str:
    """Their words, said back to them: "Take my medicine" → "take your medicine"."""
    swapped = " ".join(
        {"my": "your", "me": "you", "i": "you", "myself": "yourself"}.get(w.lower(), w)
        for w in text.split()
    )
    return swapped[:1].lower() + swapped[1:]
