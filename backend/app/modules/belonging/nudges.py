"""The countdown nudge: three days and one day before a day the circle keeps, tell its members it is coming and invite a blessing.
One nudge per person per kept day (the dedupe key holds it to one), sent through the outbox, which keeps it out of quiet hours and
only ever reaches the person on the channel they chose. It never nags: it says the day is near and asks, nothing more."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from ...core.db import engine
from ..channels import outbox

UTC = timezone.utc
COUNTDOWN = (3, 1)  # three days before, and the day before


def run_once(now: datetime | None = None) -> int:
    """Look at the days coming up in the next three days and nudge the members of the circles keeping them. Returns how many went out."""
    now = now or datetime.now(UTC)
    today = now.date()
    with engine().connect() as conn:
        rows = conn.execute(
            text("select d.id, d.name, d.starts_on, c.id as community_id, c.name as community_name "
                 "from circle_days d join communities c on c.id = d.community_id "
                 "where c.status = 'active' and d.starts_on between :a and :b"),
            {"a": today, "b": today + timedelta(days=max(COUNTDOWN))}).all()
    sent = 0
    for r in rows:
        to_go = (r.starts_on - today).days
        if to_go not in COUNTDOWN:
            continue
        with engine().connect() as conn:
            members = [str(x.user_id) for x in conn.execute(
                text("select user_id from memberships where community_id = :c and status = 'active'"), {"c": r.community_id})]
        when = "is tomorrow" if to_go == 1 else f"is in {to_go} days"
        body = f"{r.name} {when}. {r.community_name} is keeping it. Would you like to send a blessing? Just say “send a blessing for {r.name}”."
        for uid in members:
            out = outbox.send(uid, body, kind="day_nudge", dedupe_key=f"day:{r.id}:{uid}", now=now)
            sent += 1 if out["status"] not in ("duplicate", "empty") else 0
    return sent
