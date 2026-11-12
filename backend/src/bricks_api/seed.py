"""Demo data (docs/03 §9): the same world as the app's mocks (app/src/mocks).

Raj Kumar in Bishan is the demo member: 3 Circles, 8 events around Bishan /
Toa Payoh, a 5-day check-in streak, three weeks of walks (two group walks),
14 chess sessions he taught and the thank-yous for them, and Mdm Tan's kueh
class yesterday that he hasn't thanked her for yet. Times are relative to
"now", so "Tomorrow, 7 am" is true whenever it's seeded.

    uv run python -m bricks_api.seed           # migrate, then wipe and re-seed
"""

import asyncio
import math
import sys
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
from psycopg import AsyncConnection, sql
from psycopg.rows import dict_row

from .config import Settings, get_settings
from .db import Conn, check_schema, loop_factory, migrate
from .deps import JUDGE_COUNT, Ctx
from .routers.walks import save_walk
from .schemas import TrackPoint, WalkUpload
from .storage import Storage
from .timeutil import SGT, at_local, local_date

DEMO_USER = "u_raj"
RAJ_HOME = (1.3489, 103.8512)  # Block 123, Bishan Street 12
M_PER_DEG_LAT = 111_320
APP_AUDIO = Path(__file__).resolve().parents[3] / "app" / "assets" / "audio"


def _north_of(origin: tuple[float, float], metres: float) -> tuple[float, float]:
    return origin[0] + metres / M_PER_DEG_LAT, origin[1]


# id, name, phone, home
PEOPLE: list[tuple[str, str, str | None, tuple[float, float] | None]] = [
    ("u_raj", "Raj Kumar", "+6590000001", RAJ_HOME),
    ("u_tan", "Tan Mei Ling", "+6590000002", None),
    ("u_priya", "Priya Kumar", "+6590000003", None),
    # Neighbours in Raj's Safe Circle: the SOS screen shows how close they are.
    ("u_ahmad", "Ahmad Rahman", "+6590000004", _north_of(RAJ_HOME, 300)),
    ("u_lim", "Lim Ah Kow", "+6590000005", _north_of(RAJ_HOME, 650)),
    ("u_siti", "Siti Nurhaliza", None, None),
    ("u_ravi", "Ravi Shankar", None, None),
    ("u_david", "David Ong", None, None),
    ("u_fatimah", "Fatimah Ali", None, None),
    ("u_hock", "Goh Ah Hock", None, None),
    ("u_lakshmi", "Lakshmi Devi", None, None),
    ("u_chen", "Chen Wei", None, None),
    # More of the people Raj's chess sessions have helped.
    ("u_mei", "Wong Mei Fong", None, None),
    ("u_kumar", "Kumar Pillai", None, None),
    ("u_aisha", "Aisha Begum", None, None),
    ("u_tony", "Tony Teo", None, None),
    ("u_rosnah", "Rosnah Ismail", None, None),
    ("u_peter", "Peter Lee", None, None),
    ("u_meena", "Meena Raj", None, None),
    ("u_hassan", "Hassan Ali", None, None),
    ("u_jenny", "Jenny Koh", None, None),
    ("u_ganesh", "Ganesh Kumar", None, None),
    ("u_linda", "Linda Tay", None, None),
    ("u_osman", "Osman Said", None, None),
    # A fresh member for judges to try the app as: no plans, no Circles, no walks yet.
    ("u_judge", "Guest Judge", None, None),
    # Staff at the Active Ageing Centre (S11 admin): onboards members by QR.
    ("u_lee", "Lee Hui Min", "+6590000006", None),
]

# Who the stage demo can be signed in as (Settings → Demo; X-Demo-User header).
DEMO_ACCOUNTS: list[tuple[str, str, str]] = [
    ("u_raj", "Raj Kumar", "senior"),
    ("u_priya", "Priya Kumar", "family"),
    ("u_ahmad", "Ahmad Rahman", "helper"),
    ("u_lim", "Lim Ah Kow", "circle"),
    ("u_judge", "Guest Judge", "judge"),
    ("u_lee", "Lee Hui Min", "admin"),
]

WA = "https://chat.whatsapp.com/"


def judge_account(n: int) -> tuple[str, str]:
    """Judge n's id and name (n from 1 to JUDGE_COUNT)."""
    return f"u_judge{n}", f"Judge {n}"


async def seed_judge(conn: Conn, n: int, now: datetime) -> None:
    """Judge n, set up and ready but with nothing done yet: Home shows today's check-in
    and tomorrow's walk to join ("No → join walk"). Running it again resets only them."""
    uid, name = judge_account(n)
    # Anything they made goes too (events they hosted aren't removed with the member).
    await conn.execute("delete from events where host_id = %s", (uid,))
    await conn.execute("delete from users where id = %s", (uid,))
    home = _north_of(RAJ_HOME, 150)
    await conn.execute(
        "insert into users (id, name, preferred_name, home_lat, home_lng, area_name,"
        " singpass_verified, created_at) values (%s, %s, %s, %s, %s, 'Bishan', true, %s)",
        (uid, name, name, home[0], home[1], now - timedelta(days=1)),
    )


def _at(now: datetime, days: int, hour: int, minute: int = 0) -> datetime:
    """`days` from today at hh:mm (SGT), a day later if that's already passed today."""
    d = at_local(local_date(now) + timedelta(days=days), hour, minute)
    if days == 0 and d <= now:
        d += timedelta(days=1)
    return d


def _next_weekday(now: datetime, weekday: int, hour: int, minute: int = 0) -> datetime:
    """The coming `weekday` (Monday=0), at least one day away."""
    ahead = (weekday - local_date(now).weekday()) % 7 or 7
    return _at(now, ahead, hour, minute)


def _bishan_loop(start: datetime, fraction: float) -> list[TrackPoint]:
    """The app's demo loop (simulatedTrack.ts): ~2.4 km oval, a point every 5 s."""
    start_lat, start_lng = 1.3626, 103.8466
    total_s = 2400 / 1.25
    count = round(total_s / 5)
    b, a = 290.0, 1.6 * 290.0
    m_per_deg_lng = M_PER_DEG_LAT * math.cos(math.radians(start_lat))
    centre_lat = start_lat - b / M_PER_DEG_LAT
    points = []
    for i in range(count + 1):
        angle = i / count * 2 * math.pi + math.pi / 2
        wobble = 1 + 0.03 * math.sin(angle * 3)
        points.append(
            TrackPoint(
                lat=centre_lat + b * wobble * math.sin(angle) / M_PER_DEG_LAT,
                lng=start_lng + a * wobble * math.cos(angle) / m_per_deg_lng,
                t=start.timestamp() * 1000 + i * 5000,
                accuracy=5,
            )
        )
    keep = max(2, round(len(points) * fraction))
    return points[:keep]


async def _wipe(conn: Conn) -> None:
    tables = await (
        await conn.execute(
            "select tablename from pg_tables where schemaname = current_schema()"
            " and tablename <> 'schema_migrations'"
        )
    ).fetchall()
    if tables:
        await conn.execute(
            sql.SQL("truncate {} cascade").format(
                sql.SQL(", ").join(sql.Identifier(t["tablename"]) for t in tables)
            )
        )


async def _audio(storage: Storage | None) -> dict[str, str | None]:
    """The sample voice clips, uploaded once to Storage."""
    names = {"intro": "intro-raj.wav", "david": "thanks-david.wav", "siti": "thanks-siti.wav"}
    urls: dict[str, str | None] = dict.fromkeys(names)
    if storage is None:
        return urls
    for key, file in names.items():
        path = APP_AUDIO / file
        if path.exists():
            urls[key] = await storage.put_fixed(f"seed/{file}", path.read_bytes(), "audio/wav")
    return urls


async def seed(conn: Conn, settings: Settings, now: datetime, storage: Storage | None) -> None:
    await _wipe(conn)
    audio = await _audio(storage)
    # One network round trip for many inserts (the database may be far away).
    async with conn.pipeline():
        await _seed(conn, settings, now, audio)


async def _seed(
    conn: Conn, settings: Settings, now: datetime, audio: dict[str, str | None]
) -> None:
    ex = conn.execute
    today = local_date(now)

    for uid, name, phone, home in PEOPLE:
        await ex(
            "insert into users (id, name, phone, home_lat, home_lng, area_name, created_at)"
            " values (%s, %s, %s, %s, %s, 'Bishan', %s)",
            (
                uid,
                name,
                phone,
                home[0] if home else None,
                home[1] if home else None,
                now - timedelta(days=200),
            ),
        )
    await ex(
        "update users set preferred_name = 'Raj', singpass_verified = true,"
        " languages = '{en,ta}', interests = '{chess,walking,teaching}',"
        " intro_audio_url = %s, intro_duration_s = 8, intro_transcript = %s where id = 'u_raj'",
        (
            audio["intro"],
            "Hello, I'm Raj. I was a maths teacher for thirty years. Ask me about chess!",
        ),
    )

    circles: list[tuple[str, str, str, str, str, list[str], int, str]] = [
        (
            "c_walkers",
            "Bishan Walkers",
            "interest",
            "We walk together around Bishan Park most mornings. Any pace is fine.",
            "u_lim",
            ["u_raj", "u_lim", "u_ahmad", "u_tan", "u_siti", "u_ravi"],
            42,
            "BishanWalkers",
        ),
        (
            "c_block123",
            "Block 123 Neighbours",
            "neighbourhood",
            "Neighbours from Block 123 and around. Kopi, walks and helping each other out.",
            "u_ahmad",
            ["u_raj", "u_ahmad", "u_tan", "u_fatimah"],
            21,
            "Block123Neighbours",
        ),
        (
            "c_gardeners",
            "Toa Payoh Gardeners",
            "interest",
            "Growing vegetables and herbs at the community garden. No experience needed.",
            "u_chen",
            ["u_chen", "u_ahmad", "u_lakshmi"],
            14,
            "ToaPayohGardeners",
        ),
    ]
    for cid, name, ctype, desc, captain, members, extra, wa in circles:
        await ex(
            "insert into circles (id, name, type, description, captain_id, whatsapp_link,"
            " area_name, extra_members) values (%s, %s, %s, %s, %s, %s, 'Bishan', %s)",
            (cid, name, ctype, desc, captain, WA + wa, extra),
        )
        for i, uid in enumerate(members):
            await ex(
                "insert into circle_members (circle_id, user_id, joined_at) values (%s, %s, %s)",
                (cid, uid, now - timedelta(days=90 - i)),
            )

    tomorrow7 = _at(now, 1, 7)
    events: list[dict[str, Any]] = [
        dict(
            id="e_walk_bishan",
            title="Morning walk",
            category="walk",
            start=tomorrow7,
            hours=1,
            place="Bishan Park, Gate 2",
            lat=1.3626,
            lng=103.8466,
            desc="An easy 3 km loop around the pond at a gentle pace. We stop for kopi at the"
            " end. Everyone is welcome.",
            host="u_lim",
            circle="c_walkers",
            wa="BishanWalkers",
            going=["u_lim", "u_ahmad"],
            extra=10,
        ),
        dict(
            id="e_walk_toapayoh",
            title="Evening walk",
            category="walk",
            start=_at(now, 0, 18),
            hours=1,
            place="Toa Payoh Town Park",
            lat=1.3336,
            lng=103.8476,
            desc="A slow walk round the lake while it cools down. About 45 minutes.",
            host="u_ahmad",
            circle="c_block123",
            wa="Block123Neighbours",
            going=["u_ahmad", "u_siti"],
            extra=2,
        ),
        dict(
            id="e_taichi",
            title="Tai chi in the park",
            category="exercise",
            start=_at(now, 2, 7, 30),
            hours=1,
            place="Bishan-Ang Mo Kio Park, Pond Garden",
            lat=1.3644,
            lng=103.8433,
            desc="Gentle tai chi for all levels. Wear comfortable shoes. Chairs available.",
            host="u_lim",
            circle="c_walkers",
            wa="BishanWalkers",
            going=["u_lim", "u_tan"],
            extra=7,
        ),
        dict(
            id="e_chess",
            title="Chess at the community club",
            category="games",
            start=_next_weekday(now, 5, 10),
            hours=2,
            place="Bishan Community Club, Room 2",
            lat=1.3505,
            lng=103.8486,
            desc="Learn or play chess with Raj. Boards provided. Beginners very welcome.",
            host="u_raj",
            circle=None,
            wa=None,
            going=["u_raj", "u_david"],
            extra=4,
        ),
        dict(
            id="e_storytime",
            title="Storytime with grandparents",
            category="kids",
            start=_next_weekday(now, 6, 10, 30),
            hours=1,
            place="Toa Payoh Public Library, Children’s Section",  # noqa: RUF001 (the app shows the curly apostrophe)
            lat=1.3326,
            lng=103.8486,
            desc="Stories in English, Mandarin, Malay and Tamil for children aged 4 to 8."
            " Parents stay with their children.",
            host="u_tan",
            circle=None,
            wa=None,
            going=["u_tan", "u_lakshmi"],
            extra=3,
        ),
        dict(
            id="e_kueh",
            title="Cooking together: ang ku kueh",
            category="cooking",
            start=_at(now, 3, 15),
            hours=2,
            place="Block 123 void deck, Bishan Street 12",
            lat=1.3489,
            lng=103.8512,
            desc="Mdm Tan shows how she makes ang ku kueh. Ingredients provided.",
            host="u_tan",
            circle="c_block123",
            wa="Block123Neighbours",
            going=["u_tan", "u_fatimah"],
            extra=5,
        ),
        dict(
            id="e_phone_class",
            title="Smartphone help: video calls",
            category="class",
            start=_at(now, 4, 14),
            hours=1.5,
            place="Toa Payoh West Community Club",
            lat=1.3346,
            lng=103.8443,
            desc="Bring your phone. We help you set up video calls with your family, step by step.",
            host="u_priya",
            circle=None,
            wa=None,
            going=["u_priya", "u_hock"],
            extra=8,
        ),
        dict(
            id="e_garden",
            title="Community garden morning",
            category="gardening",
            start=_at(now, 5, 8),
            hours=2,
            place="Bishan Community Garden, Street 22",
            lat=1.3571,
            lng=103.8473,
            desc="Water, weed and harvest together. Gloves provided.",
            host="u_ahmad",
            circle="c_gardeners",
            wa="ToaPayohGardeners",
            going=["u_ahmad", "u_chen"],
            extra=3,
        ),
        # Yesterday's class Raj went to and hasn't said thank you for yet.
        dict(
            id="e_past_kueh",
            title="Nyonya kueh class",
            category="cooking",
            start=at_local(today - timedelta(days=1), 15),
            hours=2,
            place="Block 123 void deck, Bishan Street 12",
            lat=1.3489,
            lng=103.8512,
            desc="Mdm Tan's nyonya kueh, step by step.",
            host="u_tan",
            circle="c_block123",
            wa=None,
            going=["u_tan", "u_raj", "u_fatimah"],
            extra=4,
        ),
    ]

    # 14 chess sessions Raj taught, every Saturday before this week's.
    last_saturday = today - timedelta(days=(today.weekday() - 5) % 7 or 7)
    # The guest judge starts fresh: never in the past sessions.
    others = [p[0] for p in PEOPLE if p[0] not in ("u_raj", "u_judge", "u_lee")]
    sessions: list[tuple[str, datetime]] = []
    for k in range(14):
        start = at_local(last_saturday - timedelta(weeks=k), 10)
        sid = f"e_chess_past_{k + 1}"
        sessions.append((sid, start))
        going = ["u_raj"] + [others[(k * 3 + j) % len(others)] for j in range(5)]
        events.append(
            dict(
                id=sid,
                title="Chess at the community club",
                category="games",
                start=start,
                hours=2,
                place="Bishan Community Club, Room 2",
                lat=1.3505,
                lng=103.8486,
                desc="Learn or play chess with Raj.",
                host="u_raj",
                circle=None,
                wa=None,
                going=going,
                extra=0,
            )
        )

    for e in events:
        await ex(
            "insert into events (id, circle_id, host_id, title, category, description, start_at,"
            " end_at, place_name, lat, lng, whatsapp_link, extra_going)"
            " values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                e["id"],
                e["circle"],
                e["host"],
                e["title"],
                e["category"],
                e["desc"],
                e["start"],
                e["start"] + timedelta(hours=e["hours"]),
                e["place"],
                e["lat"],
                e["lng"],
                WA + e["wa"] if e["wa"] else None,
                e["extra"],
            ),
        )
        for i, uid in enumerate(e["going"]):
            await ex(
                "insert into rsvps (event_id, user_id, created_at) values (%s, %s, %s)",
                (e["id"], uid, now - timedelta(days=30, minutes=-i)),
            )

    await ex(
        "insert into skill_offers (id, user_id, title, tags, start_at, place_name, event_id,"
        " created_at) values"
        " ('s_chess', 'u_raj', 'Chess for beginners', '{chess}', %s,"
        "  'Bishan Community Club, Room 2', 'e_chess', %s),"
        " ('s_maths', 'u_raj', 'Maths homework help', '{teaching}', null, null, null, %s),"
        " ('s_tan_kueh', 'u_tan', 'Nyonya kueh', '{cooking}', %s,"
        "  'Block 123 void deck, Bishan Street 12', 'e_past_kueh', %s)",
        (
            events[3]["start"],
            now - timedelta(days=120),
            now - timedelta(days=100),
            events[8]["start"],
            now - timedelta(days=30),
        ),
    )

    # Ten thank-yous for chess (two by voice), three for maths help.
    chess_thanks: list[tuple[str, int, str | None, str | None]] = [
        (
            "u_david",
            2,
            audio["david"],
            "Thank you, Raj. I finally won a game against my grandson. See you on Saturday!",
        ),
        (
            "u_siti",
            5,
            audio["siti"],
            "Raj, thank you for being so patient with me. Chess is so much fun now.",
        ),
    ] + [
        (uid, 7 + i * 3, None, None)
        for i, uid in enumerate(
            ["u_lim", "u_ahmad", "u_tan", "u_ravi", "u_fatimah", "u_hock", "u_lakshmi", "u_chen"]
        )
    ]
    for uid, days_ago, url, transcript in chess_thanks:
        at = at_local(today - timedelta(days=days_ago), 10)
        # The session they went to just before thanking (they're added if not already going).
        session = next(s for s in sessions if s[1] + timedelta(hours=2) <= at)
        await ex(
            "insert into rsvps (event_id, user_id) values (%s, %s) on conflict do nothing",
            (session[0], uid),
        )
        await ex(
            "insert into endorsements (id, from_user, to_user, event_id, skill_offer_id, kind,"
            " audio_url, duration_s, transcript, language, created_at)"
            " values (%s, %s, 'u_raj', %s, 's_chess', %s, %s, %s, %s, 'en', %s)",
            (
                f"t_chess_{uid[2:]}",
                uid,
                session[0],
                "voice" if url else "thumb",
                url,
                8 if url else None,
                transcript,
                at,
            ),
        )
    for i, uid in enumerate(["u_tan", "u_chen", "u_siti"]):
        await ex(
            "insert into endorsements (id, from_user, to_user, skill_offer_id, kind, language,"
            " created_at) values (%s, %s, 'u_raj', 's_maths', 'thumb', 'en', %s)",
            (f"t_maths_{uid[2:]}", uid, at_local(today - timedelta(days=9 + i * 4), 10)),
        )
    await ex(
        "insert into user_badges (user_id, key, earned_at) values"
        " ('u_raj', 'kind_neighbour', %s), ('u_raj', 'storyteller', %s)",
        (now - timedelta(days=20), now - timedelta(days=30)),
    )

    # A 5-day check-in streak up to yesterday; two daily reminders.
    for i in range(1, 6):
        await ex(
            "insert into checkins (user_id, date, answer, answered_at) values"
            " ('u_raj', %s, 'yes', %s)",
            (today - timedelta(days=i), at_local(today - timedelta(days=i), 8, 5)),
        )
    await ex(
        "insert into reminders (id, user_id, kind, text, time, repeat, created_by_user) values"
        " ('r_1', 'u_raj', 'medicine', 'Take medicine', '08:00', 'daily', 'u_raj'),"
        " ('r_2', 'u_raj', 'medicine', 'Blood pressure tablet', '20:00', 'daily', 'u_raj')"
    )

    await ex(
        "insert into safe_circle (id, user_id, helper_id, name, phone, is_family, order_no) values"
        " ('u_priya', 'u_raj', 'u_priya', 'Priya Kumar', '+6590000003', true, 0),"
        " ('u_ahmad', 'u_raj', 'u_ahmad', 'Ahmad Rahman', '+6590000004', false, 1),"
        " ('u_lim', 'u_raj', 'u_lim', 'Lim Ah Kow', '+6590000005', false, 2)"
    )
    await ex(
        "insert into family_links (senior_id, family_id, relation) values"
        " ('u_raj', 'u_priya', 'father')"
    )
    # S27: Raj's health card, kept up to date by Priya. S35: one life story, and a
    # question from Priya waiting for the next one.
    await ex(
        "insert into health_cards (user_id, blood_group, conditions, medicines, updated_by,"
        " updated_at) values ('u_raj', 'B+', 'High blood pressure', %s, 'u_priya', %s)",
        (
            "Amlodipine 5 mg, every morning\nBlood pressure tablet, every evening",
            now - timedelta(days=12),
        ),
    )
    if audio["intro"]:
        await ex(
            "insert into stories (id, user_id, title, audio_url, duration_s, transcript,"
            " language, prompt_text, created_at) values ('st_teacher', 'u_raj',"
            " 'Thirty years of teaching maths', %s, 8, %s, 'en', 'Your first job', %s)",
            (
                audio["intro"],
                "Hello, I'm Raj. I was a maths teacher for thirty years. Ask me about chess!",
                now - timedelta(days=25),
            ),
        )
    await ex(
        "insert into story_questions (id, senior_id, asked_by, text, created_at)"
        " values ('q_met_amma', 'u_raj', 'u_priya', 'How did you and Amma meet?', %s)",
        (now - timedelta(days=2),),
    )
    # Priya added her dad at the start, and he said yes: her Family view (S10).
    await ex(
        "insert into family_invites (id, family_id, senior_name, senior_phone, relation,"
        " language, interests, add_me_to_safe_circle, status, senior_id, created_at)"
        " values ('inv_priya_raj', 'u_priya', 'Raj Kumar', '+6590000001', 'father', 'en',"
        " '{chess,walking}', true, 'accepted', 'u_raj', %s)",
        (now - timedelta(days=60),),
    )

    # Three weeks of morning walks; two were group walks with Lim and Ahmad.
    ctx = Ctx(conn=conn, user_id=DEMO_USER, now=now, settings=settings)
    for days_ago, fraction, group in [
        (20, 0.6, False),
        (18, 0.75, False),
        (16, 0.7, True),
        (13, 0.8, False),
        (11, 0.65, False),
        (9, 0.85, True),
        (6, 0.7, False),
        (4, 0.9, False),
        (2, 0.75, False),
        (1, 1.0, False),
    ]:
        start = at_local(today - timedelta(days=days_ago), 7, 5)
        points = _bishan_loop(start, fraction)
        upload = WalkUpload(
            segments=[points],
            steps=round(2400 * fraction / 0.72),
            started_at=start.isoformat(),
            ended_at=datetime.fromtimestamp(points[-1].t / 1000, SGT).isoformat(),
            event_id=None,
        )
        await save_walk(ctx, upload, ["u_lim", "u_ahmad"] if group else [])

    # Shared with the Circle (S19 feed): Raj's last group walk, cheered by Ahmad, and
    # recent walks by Lim (with a group) and Ahmad for Raj to cheer. The rest stay private.
    await ex(
        "update walks set visibility = 'circle' where id = (select id from walks"
        " where user_id = 'u_raj' and cardinality(walked_with) > 0"
        " order by started_at desc limit 1)"
    )
    await ex(
        "insert into walk_cheers (id, walk_id, from_user, kind, created_at)"
        " select 'c_seed_ahmad', id, 'u_ahmad', 'thumb', started_at + interval '3 hours'"
        " from walks where user_id = 'u_raj' and visibility = 'circle'"
    )
    for uid, days_ago, fraction, with_ in [
        ("u_lim", 2, 1.0, ["u_tan", "u_siti", "u_ravi", "u_chen", "u_mei", "u_kumar", "u_aisha"]),
        ("u_ahmad", 3, 0.8, []),
    ]:
        start = at_local(today - timedelta(days=days_ago), 7, 30)
        points = _bishan_loop(start, fraction)
        upload = WalkUpload(
            segments=[points],
            steps=round(2400 * fraction / 0.72),
            started_at=start.isoformat(),
            ended_at=datetime.fromtimestamp(points[-1].t / 1000, SGT).isoformat(),
            event_id=None,
        )
        walk = await save_walk(
            Ctx(conn=conn, user_id=uid, now=now, settings=settings), upload, with_
        )
        await ex("update walks set visibility = 'circle' where id = %s", (walk["id"],))

    # S11: the Active Ageing Centre Lee runs. Raj and Lim joined by QR; Tan was
    # invited yesterday; Siti was invited last week and needs a call.
    await ex(
        "insert into orgs (id, name, verified, admin_id, join_code, created_at)"
        " values ('org_bishan_aac', 'Bishan Active Ageing Centre', true, 'u_lee', 'BISHAN', %s)",
        (now - timedelta(days=30),),
    )
    for mid, member_id, name, phone, status, invited_days, joined_days in [
        ("om_raj", "u_raj", "Raj Kumar", "+6590000001", "joined", 20, 19),
        ("om_lim", "u_lim", "Lim Ah Kow", "+6590000005", "joined", 20, 18),
        ("om_tan", None, "Tan Mei Ling", "+6590000002", "invited", 1, None),
        ("om_siti", None, "Siti Nurhaliza", "+6590000007", "invited", 6, None),
    ]:
        await ex(
            "insert into org_members (id, org_id, user_id, name, phone, status, invited_at,"
            " joined_at) values (%s, 'org_bishan_aac', %s, %s, %s, %s, %s, %s)",
            (
                mid,
                member_id,
                name,
                phone,
                status,
                now - timedelta(days=invited_days),
                now - timedelta(days=joined_days) if joined_days else None,
            ),
        )

    for n in range(1, JUDGE_COUNT + 1):
        await seed_judge(conn, n, now)


async def main() -> None:
    settings = get_settings()
    schema = check_schema(sys.argv[1] if len(sys.argv) > 1 else settings.db_schema)
    async with await AsyncConnection.connect(
        settings.database_url.get_secret_value(), row_factory=dict_row, prepare_threshold=None
    ) as conn:
        applied = await migrate(conn, schema)
        print(f"Migrations applied: {applied or 'none (up to date)'}")
        async with httpx.AsyncClient(timeout=30) as client:
            storage = Storage(settings, client)
            await storage.ensure_bucket()
            await seed(conn, settings, datetime.now(UTC), storage)
        await conn.commit()
    print(f"Seeded schema {schema!r} for {date.today()}.")


if __name__ == "__main__":
    asyncio.run(main(), loop_factory=loop_factory())
