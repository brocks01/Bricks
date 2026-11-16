"""Scheduled calls from the calendar: any item in the person's calendar can be a call from Interchange that does what THEY asked ("teach me ten English words and quiz me",
"help me prepare for college", "ask me how my knee is"). The skills below create, list and cancel those items, so it works from a chat or a phone call as well as from the app.
The calling itself is the calendar's reminder loop (calendar/calls.py): consent, allowed hours, two tries, quiet hours always win."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from ..calendar import calls as cal_calls
from ..calendar import service as cal
from .registry import B, S, SkillError, _tz, pick, skill

UTC = timezone.utc
REPEATS = ("none", "daily", "weekdays", "weekly")


def _consented(conn, me: str) -> bool:
    return conn.execute(text("select 1 from call_consents where person_id = :u and revoked_at is null"), {"u": me}).first() is not None


@skill("allow_reminder_calls", "Allow calls from Interchange",
       "Record that the person agrees Interchange may phone them (for reminders and their scheduled sessions), between 08:00 and 20:00 unless they say other hours. It is the person's own yes: ask them first, "
       "and call it with confirmed true only after they say yes. Uses the number they gave, or the number they phone or message from.",
       {"phone": S("Their phone number in international form, only if they gave one"), "from_hour": S("Earliest hour to call, HH:MM (optional)"),
        "to_hour": S("Latest hour to call, HH:MM (optional)"), "confirmed": B("true only after the person said yes")}, risk="confirm")
def allow_reminder_calls(conn, me, args):
    phone = args.get("phone")
    if not phone:
        phone = conn.execute(text("select external_id from channel_links where user_id = :u and channel in ('phone', 'whatsapp', 'sms') order by (channel = 'phone') desc limit 1"), {"u": me}).scalar()
    if not phone:
        raise SkillError("phone_needed", "Which number should I call you on?")
    lang = conn.execute(text("select comm_language from users where id = :u"), {"u": me}).scalar()
    r = cal_calls.put_consent(conn, me, {"phone": phone, "language": lang if lang in cal_calls.BRIEFS else "en",
                                         "window_from": args.get("from_hour") or "08:00", "window_to": args.get("to_hour") or "20:00"})
    return {"calls_allowed": True, "between": f"{r['window_from']} and {r['window_to']}"}


@skill("stop_calls", "Stop calling me", "The person says stop calling them: switch off every call from Interchange at once. Do it straight away, no questions.")
def stop_calls(conn, me, args):
    cal_calls.revoke_consent(conn, me, None)
    return {"calls_stopped": True, "note": "They can say 'allow calls' any time to start again."}


@skill("schedule_call", "Schedule a call from Interchange",
       "Set up a call from Interchange at a time, once or repeating (daily, weekdays, weekly), in which Interchange does what the person asked: teach them something, quiz them, help them prepare for something, "
       "check on them. Needs their consent to calls first (allow_reminder_calls). Put their request in 'instruction' in their own words.",
       {"title": S("A short name, for example 'English practice'"),
        "instruction": S("What Interchange should do on the call, in the person's words, for example 'teach me ten English words and quiz me'"),
        "time": S("Local time HH:MM, 24 hour, for example 18:30"), "repeat": S("none, daily, weekdays or weekly", enum=list(REPEATS)),
        "date": S("First date YYYY-MM-DD (optional; default the next time that hour comes)"), "until": S("Last date YYYY-MM-DD (optional)")},
       ["title", "instruction", "time"])
def schedule_call(conn, me, args):
    if not _consented(conn, me):
        raise SkillError("needs_consent", "They have not agreed to calls yet. Ask if they want Interchange to phone them; if yes, call allow_reminder_calls.")
    try:
        hh, mm = (int(x) for x in str(args["time"]).strip().split(":")[:2])
        assert 0 <= hh < 24 and 0 <= mm < 60
    except (ValueError, AssertionError):
        raise SkillError("bad_time", "What time? For example 6:30 in the evening.") from None
    repeat = args.get("repeat") or "none"
    if repeat not in REPEATS:
        raise SkillError("bad_repeat", "Once, daily, on weekdays or weekly?")
    off = _tz(conn, me)
    local_now = datetime.now(UTC) + timedelta(minutes=off)
    if args.get("date"):
        try:
            day = datetime.fromisoformat(str(args["date"])).date()
        except ValueError:
            raise SkillError("bad_date", "Which date?") from None
    else:
        day = local_now.date() if (hh, mm) > (local_now.hour, local_now.minute) else (local_now + timedelta(days=1)).date()
    sign = "+" if off >= 0 else "-"
    starts = f"{day.isoformat()}T{hh:02d}:{mm:02d}:00{sign}{abs(off) // 60:02d}:{abs(off) % 60:02d}"
    same = [r for r in _mine(conn, me) if r.local_time.strftime("%H:%M") == f"{hh:02d}:{mm:02d}" and r.repeat == repeat]
    if same:  # the person (or the agent) asked twice: one call, not two
        return {"already_scheduled": same[0].title, "at": f"{hh:02d}:{mm:02d}", "repeat": repeat, "note": "A call at that time already exists; tell the person it is set."}
    made = cal.create_item(conn, me, kind="call", title=str(args["title"])[:120], starts_at=starts, repeat=repeat, channel="call",
                           agent_brief=str(args["instruction"]), until_date=args.get("until"), notify_family=False)
    return {"scheduled": args["title"], "first_call": f"{day.strftime('%a %d %b')} at {hh:02d}:{mm:02d}", "repeat": repeat, "id": made["id"]}


def _mine(conn, me: str) -> list:
    return conn.execute(text("select id, title, local_time, repeat, agent_brief from calendar_items where person_id = :u and status = 'active' and channel in ('call', 'both') "
                             "and agent_brief is not null order by local_time"), {"u": me}).all()


@skill("my_scheduled_calls", "My scheduled calls", "List the calls from Interchange the person has scheduled (what, when, how often).", risk="read")
def my_scheduled_calls(conn, me, args):
    return {"calls": [{"title": r.title, "at": r.local_time.strftime("%H:%M"), "repeat": r.repeat, "what": r.agent_brief} for r in _mine(conn, me)], "calls_allowed": _consented(conn, me)}


@skill("cancel_scheduled_call", "Cancel a scheduled call", "Cancel one of the person's scheduled calls from Interchange, by its name in words.", {"title": S("The scheduled call, in words")}, ["title"])
def cancel_scheduled_call(conn, me, args):
    r = pick(_mine(conn, me), args.get("title"), lambda x: x.title, "scheduled call")
    cal.cancel_item(conn, me, str(r.id))
    return {"cancelled": r.title}
