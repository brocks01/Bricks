"""The loneliness check: three short questions (UCLA 3-item scale) asked at the start and again at 3 and 6 months, so Interchange can show whether people feel more connected.
Each answer is 1 (hardly ever), 2 (some of the time) or 3 (often); the total is 3 to 9, higher is lonelier. Never shown to anyone but the person; centres and the pilot see only counts and averages of groups of five or more."""
import json

from sqlalchemy import Connection, text

KEYS = ("lack_companionship", "feel_left_out", "feel_isolated")
POINTS = {"hardly_ever": 1, "some_of_the_time": 2, "often": 3}
AFTER_DAYS = {"3m": 90, "6m": 180}


def due(conn: Connection, me: str) -> str | None:
    """Which check is next: baseline, then 3m (90 days after the baseline), then 6m (180 days)."""
    rows = {r.kind: r.age for r in conn.execute(text("select kind, extract(day from now() - taken_at) as age from wellbeing_checks where user_id = :u"), {"u": me})}
    if "baseline" not in rows:
        return "baseline"
    for kind in ("3m", "6m"):
        if kind not in rows and rows["baseline"] >= AFTER_DAYS[kind]:
            return kind
    return None


def score(answers: dict) -> int | None:
    try:
        return sum(POINTS[answers[k]] for k in KEYS)
    except KeyError:
        return None


def record_due(conn: Connection, me: str, answers: dict) -> dict | None:
    """Save the three answers as the check that is due now. Returns None if all three are not there yet, or no check is due."""
    s = score(answers)
    kind = due(conn, me)
    if s is None or kind is None:
        return None
    conn.execute(text("insert into wellbeing_checks (user_id, kind, score, answers) values (:u, :k, :s, cast(:a as jsonb))"), {"u": me, "k": kind, "s": s, "a": json.dumps({k: answers[k] for k in KEYS})})
    return {"kind": kind, "score": s}
