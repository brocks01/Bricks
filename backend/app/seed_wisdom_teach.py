"""Wisdom, Teach and Learn (revamp v2, A2): what Uncle Tan sees under TEACH, and the elders a learner finds under LEARN.
Real accounts and real introductions, never words in the app. Safe to run again: every insert checks first, and it runs on every server start
and every Uncle Tan sign-in (from seed_uncle_tan.seed_uncle).

TEACH, for Uncle Tan:
- his teaching profile: Expertise "AI, OS, Business", Mon-Fri, 9 AM to 5 PM;
- a pending invitation from Sarath ("AI, OS") and one from the SMU Students group (31 learners, "Business");
- an active mentorship with Sarath ("AI & OS Mentoring"): a short chat about preparing the session, and one session coming up;
- four completed sessions, each with the learner's score and a short note: AI Mentoring, OS Project Review, Career Guidance, Business Strategy Workshop.
LEARN, for everyone: Michael S. (Interview Prep), Sarah L. (Excel and Python), Ken T. (Japanese), Maria P. (Gardening and Painting)."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import Connection, text

SG = ZoneInfo("Asia/Singapore")
DOMAIN = "demo.wisdom.test"

# The people of Uncle Tan's Teach side: email (local part), name, age band, area
SARATH = ("sarath.kumar", "Sarath Kumar", "under40", "Tampines")
SMU = ("weiling.ong.smu", "Wei Ling Ong", "under40", "Bras Basah")  # she asks for the SMU Students group

PROFILE = {"expertise": "AI, OS, Business", "days": "Mon-Fri", "start_time": "09:00", "end_time": "17:00",
           "bio": "Forty years in tech sales, from mainframes to cloud software. I like helping young people understand how the technology and the business fit together."}

CHAT = (  # Sarath and Uncle Tan, preparing their next session
    ("learner", "Hello Uncle Tan, thank you for saying yes! For our session, could we look at how an operating system schedules programs?"),
    ("mentor", "Of course, Sarath. Bring the questions from your course and we will go through them one by one."),
    ("learner", "Thank you. I will also bring my notes on AI models, if there is time."),
    ("mentor", "Good. Write down what confuses you most. We start there."),
)

# the four completed sessions: title, learner, days ago, score, note
DONE = (
    ("AI Mentoring", SARATH, 30, 5, "Uncle Tan explained machine learning with examples from real sales work. Very patient and easy to follow."),
    ("OS Project Review", SARATH, 16, 4, "Clear feedback on my scheduler project. I would like more time on memory management next time."),
    ("Career Guidance", SARATH, 23, 5, "Honest advice about where a computer science degree can take me. He shared what he wished he had known at my age."),
    ("Business Strategy Workshop", SARATH, 9, 4, "Practical frameworks with Singapore examples. A short handout afterwards would help."),
)

# LEARN: elders a learner can find. email, name, area, offer title, about, field, years, topics, languages, availability
ELDERS = (
    ("michael.seah", "Michael Seah", "Bishan", "Interview Prep",
     "I hired engineers and sales staff for 30 years. I help you prepare answers, practise a real interview and stay calm on the day.",
     "Hiring manager, electronics", 30, ["career", "interview", "first job"], ["English", "Mandarin"], "Weekday evenings"),
    ("sarah.lim", "Sarah Lim", "Toa Payoh", "Excel and Python for work",
     "A retired accountant who learned Python at 55. Spreadsheets, formulas and simple scripts that save hours, explained slowly.",
     "Accountant", 35, ["technology", "excel", "python", "computers"], ["English", "Malay"], "Saturday mornings"),
    ("ken.tanaka", "Ken Tanaka", "Clementi", "Japanese conversation",
     "Born in Osaka, in Singapore since 1985. Everyday Japanese for travel and work, with a little about the culture behind the words.",
     "Japanese teacher", 25, ["language", "japanese"], ["Japanese", "English"], "Tuesday and Thursday afternoons"),
    ("maria.pereira", "Maria Pereira", "Bukit Timah", "Gardening and painting",
     "Forty years of balcony gardens and watercolours. Herbs that grow well in HDB corridors, and painting what you grow.",
     "Art teacher", 40, ["hobbies", "gardening", "painting"], ["English"], "Weekend mornings"),
)


def _person(conn: Connection, local: str, name: str, band: str, area: str) -> str:
    email = f"{local}@{DOMAIN}"
    uid = conn.execute(text("select id from users where email = :e"), {"e": email}).scalar()
    if uid is None:
        uid = conn.execute(text("insert into users (email, display_name, age_band, area_name, language) values (:e, :n, :b, :a, 'en') returning id"),
                           {"e": email, "n": name, "b": band, "a": area}).scalar()
    return str(uid)


def _connection(conn: Connection, mentor: str, learner: str, status: str, topic: str, message: str | None = None, group: tuple[str, int] | None = None,
                ago_days: int = 3) -> str:
    """One introduction to the mentor, found by its topic (so running this again finds it instead of adding another)."""
    cid = conn.execute(text("select id from wisdom_connections where mentor_id = :m and learner_id = :l and topic = :t"), {"m": mentor, "l": learner, "t": topic}).scalar()
    if cid is None:
        cid = conn.execute(text(
            "insert into wisdom_connections (mentor_id, learner_id, initiated_by, message, status, topic, group_name, learner_count, created_at, decided_at) "
            "values (:m, :l, :l, :msg, :s, :t, :g, :n, now() - make_interval(days => :d), case when :s = 'accepted' then now() - make_interval(days => :d - 1) end) returning id"),
            {"m": mentor, "l": learner, "msg": message, "s": status, "t": topic, "g": group[0] if group else None, "n": group[1] if group else None, "d": ago_days}).scalar()
    return str(cid)


def _next_weekday_at(hour: int) -> datetime:
    d = date.today() + timedelta(days=2)
    while d.weekday() >= 5:  # Uncle Tan teaches Monday to Friday
        d += timedelta(days=1)
    return datetime.combine(d, time(hour, 0), SG).astimezone(timezone.utc)


def seed_teach(conn: Connection, tan: str) -> None:
    from .modules.nodes import feed
    from .modules.wisdom import teach

    if not conn.execute(text("select 1 from wisdom_teaching_profiles where user_id = :u"), {"u": tan}).first():
        teach.save_teaching_profile(conn, tan, PROFILE)
    # the earlier demo asked him through random seed people; the revamp shows exactly the invitations below
    from .seed_uncle_tan import ASKS
    conn.execute(text("delete from wisdom_connections where mentor_id = :u and message = any(:a)"), {"u": tan, "a": list(ASKS)})

    sarath, weiling = (_person(conn, *p) for p in (SARATH, SMU))
    _connection(conn, tan, sarath, "pending", "AI, OS", "Hello Uncle Tan, I am studying computer science. Could you help me with AI and operating systems?", ago_days=1)
    _connection(conn, tan, weiling, "pending", "Business", "Our SMU business club would love a talk on how strategy works in a real company.", ("SMU Students", 31), ago_days=2)
    active = _connection(conn, tan, sarath, "accepted", "AI & OS Mentoring", "Could you mentor me through my AI and OS modules this term?", ago_days=40)

    if not conn.execute(text("select 1 from wisdom_messages where connection_id = :c"), {"c": active}).first():
        start = datetime.now(timezone.utc) - timedelta(hours=26)
        for k, (who, body) in enumerate(CHAT):
            conn.execute(text("insert into wisdom_messages (connection_id, sender_id, body, created_at, read_at) values (:c, :s, :b, :at, :at)"),
                         {"c": active, "s": sarath if who == "learner" else tan, "b": body, "at": start + timedelta(minutes=17 * k)})

    # one session coming up with Sarath; one that has slipped into the past without happening is cancelled, and a new one is planned
    conn.execute(text("update wisdom_meetings set status = 'cancelled' where connection_id = :c and status = 'scheduled' and starts_at < now() - interval '12 hours'"), {"c": active})
    if not conn.execute(text("select 1 from wisdom_meetings where connection_id = :c and status = 'scheduled'"), {"c": active}).first():
        conn.execute(text("insert into wisdom_meetings (connection_id, title, starts_at, minutes, place, created_by) values (:c, 'AI & OS Mentoring', :s, 60, 'Tampines Hub, Level 2 study room', :u)"),
                     {"c": active, "s": _next_weekday_at(10), "u": tan})

    for title, _who, ago, score, note in DONE:
        cid, learner = active, sarath
        if conn.execute(text("select 1 from wisdom_meetings where connection_id = :c and title = :t"), {"c": cid, "t": title}).first():
            continue
        at = datetime.combine(date.today() - timedelta(days=ago), time(14, 0), SG).astimezone(timezone.utc)
        sid = conn.execute(text("insert into wisdom_sessions (connection_id, logged_by, minutes, occurred_at) values (:c, :u, 60, :at) returning id"), {"c": cid, "u": tan, "at": at}).scalar()
        mid = conn.execute(text("insert into wisdom_meetings (connection_id, title, starts_at, minutes, place, status, completed_at, session_id, created_by) "
                                "values (:c, :t, :at, 60, null, 'completed', :at + interval '1 hour', :s, :u) returning id"), {"c": cid, "t": title, "at": at, "s": sid, "u": tan}).scalar()
        conn.execute(text("insert into wisdom_reviews (meeting_id, learner_id, score, note, created_at) values (:m, :l, :sc, :n, :at + interval '2 hours')"),
                     {"m": mid, "l": learner, "sc": score, "n": note, "at": at})
        name = conn.execute(text("select split_part(display_name, ' ', 1) from users where id = :u"), {"u": learner}).scalar()
        feed.showed_up(conn, tan, "wisdom", str(mid), title, at, source_name=name)
        feed.showed_up(conn, learner, "wisdom", str(mid), title, at, source_name="Tan")


def seed_learn(conn: Connection) -> None:
    """The four elders under LEARN, each with one real offer (every chip finds at least one of them)."""
    from .modules.wisdom import service as wisdom

    for local, name, area, title, about, field, years, topics, languages, when in ELDERS:
        uid = _person(conn, local, name, "60plus", area)
        if conn.execute(text("select 1 from wisdom_offers where user_id = :u and title = :t"), {"u": uid, "t": title}).first():
            continue
        wisdom.create_offer(conn, uid, {"title": title, "about": about, "kind": "mentoring", "mode": "volunteer", "domain": "professional" if "career" in topics or "technology" in topics else "social",
                                        "availability": when, "proof_field": field, "proof_years": years, "topics": topics, "languages": languages})
        if not conn.execute(text("select 1 from wisdom_teaching_profiles where user_id = :u"), {"u": uid}).first():
            conn.execute(text("insert into wisdom_teaching_profiles (user_id, expertise, bio) values (:u, :e, :b)"), {"u": uid, "e": title, "b": about})


def seed(conn: Connection, tan: str) -> None:
    seed_learn(conn)
    seed_teach(conn, tan)
