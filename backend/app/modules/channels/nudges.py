"""The gentle nudge: shortly before a gathering in a group the person belongs to, tell them who is going and invite them. It never forces and never nags:
one nudge per gathering, at most two a day per person, never in quiet hours, and only to members who have not already answered."""
from datetime import datetime, timezone

from sqlalchemy import text

from ...core.db import engine
from . import outbox

UTC = timezone.utc
MAX_PER_DAY = 2


def run_once(now: datetime | None = None) -> int:
    """Look at gatherings starting in 20 to 90 minutes and nudge the members who have not said yes or no. Returns how many nudges were sent."""
    now = now or datetime.now(UTC)
    sent = 0
    with engine().connect() as conn:
        acts = conn.execute(text(
            "select x.id, x.title, x.starts_at, x.location, x.community_id, x.organiser_id from activities x where x.status = 'scheduled' "
            "and x.starts_at between :a and :b order by x.starts_at"), {"a": now + _m(20), "b": now + _m(90)}).all()
    for a in acts:
        with engine().connect() as conn:
            going = conn.execute(text("select coalesce(nullif(split_part(u.display_name, ' ', 1), ''), 'Someone') as n from activity_participants p join users u on u.id = p.user_id "
                                      "where p.activity_id = :a and p.status in ('going', 'attended') order by p.created_at limit 3"), {"a": a.id}).all()
            total = conn.execute(text("select count(*) from activity_participants where activity_id = :a and status in ('going', 'attended')"), {"a": a.id}).scalar_one()
            members = [str(r.user_id) for r in conn.execute(text(
                "select m.user_id from memberships m where m.community_id = :c and m.status = 'active' and m.user_id is distinct from :o "
                "and not exists (select 1 from activity_participants p where p.activity_id = :a and p.user_id = m.user_id)"), {"c": a.community_id, "o": a.organiser_id, "a": a.id})]
        mins = max(1, int((a.starts_at - now).total_seconds() // 60))
        names = [g.n for g in going]
        who = (f"{total} going, including {' and '.join(names[:2])}" if names else "no one has said yes yet, so you could be the first") if total else "no one has said yes yet, so you could be the first"
        body = f"{a.title} starts in {mins} minutes{' at ' + a.location if a.location else ''}: {who}. Would you like to join? Just say “I'm going to {a.title}”."
        for uid in members:
            with engine().connect() as conn:
                recent = conn.execute(text("select count(*) from notifications where user_id = :u and kind = 'nudge' and created_at > now() - interval '1 day'"), {"u": uid}).scalar_one()
                polite = outbox.next_ok_time(conn, uid, now) <= now
            if recent >= MAX_PER_DAY or not polite:
                continue
            r = outbox.send(uid, body, kind="nudge", dedupe_key=f"nudge:{a.id}", now=now)
            sent += 1 if r["status"] not in ("duplicate", "empty") else 0
    return sent


def _m(minutes: int):
    from datetime import timedelta

    return timedelta(minutes=minutes)
