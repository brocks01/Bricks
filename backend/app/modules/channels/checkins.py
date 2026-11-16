"""The daily check-in: the "noticed" rule. Once a day, at the hour the person chose in their own time,
Wisdom speaks first with ONE short, warm question that remembers what they said lately. Never a lecture,
never a form, never at night (the outbox's quiet hours hold it for the morning), never twice a day.

A reply on any channel resets the count of silent days. Each day with no reply adds one. After three
silent days, and only if the person agreed, their family hears one gentle heads-up - not an alarm;
the point is a call from a loved one, not a report. The tick runs from the outbox loop."""
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import text

from ...core.db import engine
from . import memory, outbox

UTC = timezone.utc
QUIET_START, QUIET_END = time(21, 0), time(8, 0)  # a chosen hour inside these is held by the outbox until the morning
SILENT_LIMIT = 3
FIXED_QUESTIONS = [
    "What are you looking forward to today, even a small thing?",
    "How is your body feeling this morning - anything I should remember for you?",
    "Did anyone call by or ring you yesterday?",
    "What is one thing you would like to get done today?",
    "How did you sleep? Shall I remember the answer for next time?",
]

# What the model is asked for, in one breath: ONE question, plain words, no pity, no advice.
SYSTEM = ("You are Wisdom, a warm companion for older people. You are starting their day with a check-in. "
          "Ask exactly ONE short, warm, plain question about their day or how they are, using what you know about them "
          "(their name, what they said lately). One question mark in the whole message. "
          "Never pity, never mention loneliness, no medical, legal or money advice. In their own language if you know it.")
INSTRUCTION = "It is a new day. From what you know below, ask your one question for today. Nothing else - only the question."


def reply_seen(user_id: str) -> None:
    """Any word from the person on any channel: they are not silent today."""
    with engine().begin() as conn:
        conn.execute(text("update daily_checkins set silent_days = 0, last_reply = now(), family_told_on = null, updated_at = now() where user_id = :u and enabled"), {"u": user_id})


def _question(user_id: str, ctx: str, day_seed: int) -> str:
    """One question, composed from their memory when the listener is switched on; a kind fixed one when it is not."""
    from . import agent

    if not agent._key():
        return FIXED_QUESTIONS[day_seed % len(FIXED_QUESTIONS)]
    try:
        r = agent._call([{"role": "user", "parts": [{"text": INSTRUCTION + "\n\n" + ctx}]}], SYSTEM)
        parts = ((r.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
        out = "".join(p.get("text", "") for p in parts).strip()
        if out and "?" in out:
            return out[:500]
    except Exception:  # noqa: BLE001 - a missing question must never stop the day
        pass
    return FIXED_QUESTIONS[day_seed % len(FIXED_QUESTIONS)]


def _family_members(conn, user_id: str) -> list[str]:
    rows = conn.execute(text(
        "select distinct m.user_id from family_members m "
        "where m.family_id in (select family_id from family_members where user_id = :u and status = 'active') "
        "and m.status = 'active' and m.user_id is distinct from :u"), {"u": user_id}).all()
    return [str(r.user_id) for r in rows]


def run_once(now: datetime | None = None) -> int:
    """Check every enabled person: is their hour passed today and has nothing gone out yet? Then speak. Returns how many check-ins went out."""
    now = now or datetime.now(UTC)
    sent = 0
    with engine().connect() as conn:
        rows = conn.execute(text(
            "select c.user_id, c.local_time, c.last_sent, c.last_reply, c.silent_days, c.family_notify, c.family_told_on, "
            "coalesce(u.tz_offset_min, 480) as off, coalesce(nullif(split_part(u.display_name, ' ', 1), ''), 'friend') as name "
            "from daily_checkins c join users u on u.id = c.user_id where c.enabled")).all()
    for r in rows:
        off = timedelta(minutes=r.off)
        local_now = now + off
        today = local_now.date()
        due_utc = datetime.combine(today, r.local_time) - off  # their chosen local hour, as a plain UTC instant
        if now.replace(tzinfo=None) < due_utc or (r.last_sent is not None and r.last_sent >= today):
            continue
        # How silent has it been? Counted from the calendar, so a missed tick never loses a day.
        replied = r.last_reply is not None and r.last_sent is not None and (r.last_reply + off).date() >= r.last_sent
        silent = 0 if (replied or r.last_sent is None) else min(SILENT_LIMIT, (today - r.last_sent).days)
        with engine().begin() as conn:
            conn.execute(text("update daily_checkins set silent_days = :s, family_told_on = case when :s = 0 then null else family_told_on end, updated_at = now() where user_id = :u"),
                         {"s": silent, "u": r.user_id})
            told = r.family_told_on
            if silent >= SILENT_LIMIT and r.family_notify and told is None:
                conn.execute(text("update daily_checkins set family_told_on = :d where user_id = :u"), {"d": today, "u": r.user_id})
        if silent >= SILENT_LIMIT and r.family_notify and told is None:
            _tell_family(r.user_id, r.name, silent, now)
        body = _question(str(r.user_id), memory.context(str(r.user_id)), today.toordinal() + today.day)
        out = outbox.send(str(r.user_id), body, kind="checkin", dedupe_key=f"checkin:{r.user_id}:{today.isoformat()}", now=now)
        if out["status"] not in ("duplicate", "empty"):
            sent += 1
        with engine().begin() as conn:
            conn.execute(text("update daily_checkins set last_sent = :d where user_id = :u"), {"d": today, "u": r.user_id})
    return sent


def _tell_family(user_id: str, name: str, silent_days: int, now: datetime) -> None:
    """One gentle line to each active family member, only because the person agreed. A call from them is the point."""
    body = (f"{name} has not answered the daily check-in for {silent_days} days. This is only a heads-up, not an emergency - "
            f"they may simply be busy or resting. A short call or message from you today would be a lovely reason for them to reply.")
    with engine().connect() as conn:
        family = _family_members(conn, user_id)
    for uid in family:
        outbox.send(uid, body, kind="family", dedupe_key=f"checkin-family:{user_id}:{now.date().isoformat()}", now=now)
