"""The daily check-in skills: the person chooses the hour Interchange speaks first each day, and whether the
family may be told after three days of silence (their own yes, never assumed), and can stop it at any word.
Starting the check-in tells the person things day after day, so it needs the person's yes first (risk confirm)."""
from datetime import time

from sqlalchemy import Connection, text

from .registry import B, S, SkillError, skill


def _hour(raw) -> time:
    try:
        t = time.fromisoformat(str(raw or "").strip())
        return t.replace(second=0, microsecond=0)
    except ValueError:
        raise SkillError("time_needed", "What time of day should I check in, for example 9:30?") from None


@skill("set_daily_checkin", "Daily check-in on", "Interchange speaks first every day at the hour given (in the person's own time, for example 9:30), with one short warm question. "
       "It starts reaching out day after day, so FIRST ask the person to confirm, then call it with confirmed true. "
       "family_notify true means that after three days with no reply, the family may be told gently (only if the person says yes to that too).",
       {"time": S("The hour of day in the person's own time, for example 9:30"), "family_notify": B("true if the family may be told after three days of silence (optional)")},
       ["time"], risk="confirm")
def set_daily_checkin(conn: Connection, me: str, args: dict):
    t = _hour(args.get("time"))
    f = args.get("family_notify")
    conn.execute(text(
        "insert into daily_checkins (user_id, enabled, local_time, family_notify) values (:u, true, :t, :f) "
        "on conflict (user_id) do update set enabled = true, local_time = excluded.local_time, "
        "family_notify = coalesce(excluded.family_notify, daily_checkins.family_notify), updated_at = now()"),
        {"u": me, "t": t.isoformat(), "f": None if f is None else bool(f)})
    return {"daily_checkin": "on", "at": t.strftime("%H:%M"), "family_will_be_told_after_three_silent_days": bool(f) if f is not None else None}


@skill("stop_daily_checkin", "Daily check-in off", "Stop the daily check-in. Interchange will not speak first any more until they ask for it again.")
def stop_daily_checkin(conn: Connection, me: str, args: dict):
    n = conn.execute(text("update daily_checkins set enabled = false, updated_at = now() where user_id = :u"), {"u": me}).rowcount
    if not n:
        return {"daily_checkin": "off", "note": "It was not on."}
    return {"daily_checkin": "off"}
