"""The second half of the Wisdom seed, all Singapore: festivals and the days circles keep, notifications, calendars (medicine, polyclinic, tai chi, kopi), what members have
contributed, exercise history, who is away and the blessings they send, wellbeing check-ins, the daily check-in, families and thank-yous. It hangs off the people and circles
seed_wisdom.py already made (people @seed.wisdom.test), so removing those (seed-wisdom --reset) removes this too, except the festivals: --reset here removes those.

  python backend/run.py seed-wisdom-more            # one transaction, all or nothing
  python backend/run.py seed-wisdom-more --reset    # removes the festivals this script added

Festival dates are Singapore's, from the Ministry of Manpower's public holiday lists for 2026 and 2027 (Chinese New Year 6-8 Feb 2027, Hari Raya Puasa 10 Mar, Good Friday
26 Mar, Hari Raya Haji 17 May, Vesak 20 May, National Day 9 Aug, Deepavali 28 Oct 2027, Christmas 25 Dec 2026). Moon-dependent days that are not public holidays
(Pongal, Thaipusam, Dragon Boat, Mid-Autumn on 15 Sep 2027) are close estimates."""
import json
import random
import sys
from datetime import date, datetime, time, timedelta, timezone

from psycopg2.extras import execute_values
from sqlalchemy import text

from .core.db import engine

DOMAIN = "seed.wisdom.test"
rng = random.Random(2027)
NOW = datetime.now(timezone.utc)
TODAY = date.today()

# name, tradition (what it is, in a line), start, end
FESTIVALS = [
    ("Christmas Day", "A public holiday. Carols, church services and a family meal, from Orchard Road's lights to the heartland churches.", date(2026, 12, 25), date(2026, 12, 25)),
    ("New Year's Day", "The first day of 2027, a public holiday: a slow morning, kopi with neighbours and wishes for the year.", date(2027, 1, 1), date(2027, 1, 1)),
    ("Pongal", "The Tamil harvest thanksgiving: rice cooked until it overflows, with sugarcane and kolam at the door. Date is close.", date(2027, 1, 14), date(2027, 1, 15)),
    ("Thaipusam", "A Tamil Hindu festival of devotion, with the procession from Sri Srinivasa Perumal Temple to Chettiar Temple. Date is close.", date(2027, 1, 22), date(2027, 1, 22)),
    ("Chinese New Year reunion dinner", "The eve of the new year: the whole family at one table, yu sheng tossed high for luck.", date(2027, 2, 5), date(2027, 2, 5)),
    ("Chinese New Year", "A public holiday from 6 to 8 February 2027: visiting relatives, mandarin oranges, ang pow and pineapple tarts.", date(2027, 2, 6), date(2027, 2, 8)),
    ("Hari Raya Puasa", "A public holiday marking the end of Ramadan: open houses, ketupat, rendang, kuih and new baju kurung.", date(2027, 3, 10), date(2027, 3, 10)),
    ("Good Friday", "A public holiday: church services and quiet reflection for Singapore's Christian community.", date(2027, 3, 26), date(2027, 3, 26)),
    ("Hari Raya Haji", "A public holiday of sacrifice and sharing: prayers at the mosque, and meat shared with neighbours.", date(2027, 5, 17), date(2027, 5, 17)),
    ("Vesak Day", "A public holiday: Buddhist temples fill with offerings, chanting and the release of caged birds and fish.", date(2027, 5, 20), date(2027, 5, 20)),
    ("Dragon Boat Festival", "Zongzi dumplings, and dragon boat races at the reservoir. Date is close.", date(2027, 6, 9), date(2027, 6, 9)),
    ("National Day", "A public holiday on 9 August: the parade, neighbourhood celebrations and the national songs everyone knows.", date(2027, 8, 9), date(2027, 8, 9)),
    ("Mid-Autumn Festival", "Mooncakes, lanterns and a slow evening walk with the grandchildren, in estates and Chinatown.", date(2027, 9, 15), date(2027, 9, 15)),
    ("Deepavali", "A public holiday on 28 October 2027: oil lamps at every door, sweets and new clothes, and the lights of Little India.", date(2027, 10, 28), date(2027, 10, 28)),
]
# which circles keep which festivals (circle name -> festival names)
KEEPS = {
    "Chinese New Year Reunion": ["Chinese New Year reunion dinner", "Chinese New Year"],
    "Mid-Autumn Lantern Walk": ["Mid-Autumn Festival"],
    "Deepavali Kakis": ["Deepavali", "Pongal"],
    "Hari Raya Open House": ["Hari Raya Puasa", "Hari Raya Haji"],
    "Tamil Heritage Kakis": ["Pongal", "Thaipusam", "Deepavali"],
    "Hokkien Kopi Corner": ["Chinese New Year"],
    "Teochew Opera and Tea": ["Chinese New Year", "Mid-Autumn Festival"],
    "Peranakan Table": ["Chinese New Year"],
    "Malay Kampung Spirit": ["Hari Raya Puasa", "National Day"],
    "Eurasian Heritage Circle": ["Christmas Day"],
}
POLYCLINICS = {"Toa Payoh": "Toa Payoh Polyclinic", "Bedok": "Bedok Polyclinic", "Ang Mo Kio": "Ang Mo Kio Polyclinic", "Tampines": "Tampines Polyclinic", "Jurong West": "Jurong Polyclinic",
               "Woodlands": "Woodlands Polyclinic", "Yishun": "Yishun Polyclinic", "Clementi": "Clementi Polyclinic", "Hougang": "Hougang Polyclinic", "Punggol": "Punggol Polyclinic",
               "Sengkang": "Sengkang Polyclinic", "Bukit Batok": "Bukit Batok Polyclinic", "Queenstown": "Queenstown Polyclinic", "Geylang": "Geylang Polyclinic", "Bishan": "Ang Mo Kio Polyclinic"}
AWAY = ["Visiting family in Johor Bahru", "Holiday in Penang", "Staying with my daughter in Perth", "Short trip to Malacca", "In hospital at SGH, back soon", "Visiting my grandchildren in London", "On a cruise from Marina Bay"]
BLESSINGS = ["Happy {fest} from far away! Save me a seat at the table.", "Thinking of everyone this {fest}. Eat well and laugh loudly.", "Wishing the whole circle good health this {fest}. See you soon.",
             "{fest} blessings from me. I will bring something home for all of you."]
CONTRIB = [
    ("time", "Led the Thursday kopi and storytelling morning at the centre", 3.0), ("time", "Welcomed newcomers and showed them around the void deck", 2.0),
    ("skill", "Taught eight neighbours to make kueh lapis", 4.0), ("skill", "Helped residents set up WhatsApp and PayNow on their phones", 3.0),
    ("skill", "Gave a talk on staying safe from phone scams", 2.0), ("time", "Walked a neighbour to her polyclinic appointment every month", 1.5),
    ("goods", "Donated children's storybooks to the centre's library corner", None), ("goods", "Brought home-cooked rice dumplings for the Dragon Boat gathering", None),
    ("time", "Ran the registration table at the Silver Market day", 4.0), ("skill", "Repaired six rice cookers and fans for neighbours, for free", 5.0),
    ("time", "Delivered meals to homebound seniors on Wednesday mornings", 3.0), ("skill", "Coached the Saturday line-dance group", 2.0),
]
NOTE = ["Very patient, and explained everything slowly.", "Taught me things no book could.", "I felt listened to. Thank you.", "Clear, kind and practical.", "Worth every minute."]


def ins(cur, table, cols, rows, tmpl=None):
    if rows:
        execute_values(cur, f"insert into {table} ({','.join(cols)}) values %s", rows, template=tmpl, page_size=500)


def main(argv: list[str]) -> None:
    if "--reset" in argv:
        with engine().begin() as conn:
            n = conn.execute(text("delete from festivals where created_by is null and name = any(:n)"), {"n": [f[0] for f in FESTIVALS]}).rowcount
        print(f"removed {n} festivals (circle days that used them go with them)")
        return
    seed()


def seed() -> None:
    with engine().begin() as conn:
        if conn.execute(text("select 1 from festivals where created_by is null and name = 'Chinese New Year' and starts_on = '2027-02-06' limit 1")).first():
            print("already seeded; run with --reset to remove the festivals first")
            return
        cur = conn.connection.cursor()

        # people, circles, memberships, what already exists
        people = conn.execute(text("select u.id, u.display_name, u.age_band, u.area_name, u.created_at, p.roles from users u join profiles p on p.user_id = u.id where u.email like :d"), {"d": f"%@{DOMAIN}"}).all()
        if not people:
            print("no seeded people: run seed-wisdom first")
            return
        by_id = {str(p.id): p for p in people}
        circles = conn.execute(text("select id, name, circle, host_id, external_ref, created_by from communities where external_ref like 'seed:%'")).all()
        circle_by_name = {c.name: c for c in circles}
        members = conn.execute(text("select m.community_id, m.user_id from memberships m join users u on u.id = m.user_id where u.email like :d and m.status = 'active'"), {"d": f"%@{DOMAIN}"}).all()
        home: dict = {}
        for m in members:
            c = next((c for c in circles if c.id == m.community_id), None)
            if c and c.external_ref.startswith("seed:aac:"):
                home.setdefault(str(m.user_id), c)

        # ---------- festivals and the days circles keep ----------
        fest_ids = {}
        rows = []
        for name, trad, a, b in FESTIVALS:
            from uuid import uuid4
            fid = str(uuid4())
            fest_ids[name] = (fid, trad, a, b)
            rows.append((fid, name, trad, ["SG"], a, b))
        ins(cur, "festivals", ["id", "name", "tradition", "regions", "starts_on", "ends_on"], rows)
        day_rows, day_ids = [], {}
        from uuid import uuid4
        for cname, fests in KEEPS.items():
            c = circle_by_name.get(cname)
            if not c:
                continue
            for fname in fests:
                fid, trad, a, b = fest_ids[fname]
                did = str(uuid4())
                day_ids.setdefault(c.id, []).append((did, fname))
                day_rows.append((did, c.id, fid, fname, trad[:290], a, b, c.created_by))
        ins(cur, "circle_days", ["id", "community_id", "festival_id", "name", "tradition", "starts_on", "ends_on", "created_by"], day_rows)

        # ---------- away, and the blessings they send ----------
        away_rows, bless_rows = [], []
        circles_with_days = [c for c in circles if c.id in day_ids]
        for pid, c in rng.sample(list(home.items()), min(45, len(home))):
            away_rows.append((c.id, pid, "away", rng.choice(AWAY), True, TODAY - timedelta(days=rng.randint(1, 20))))
        ins(cur, "circle_presence", ["community_id", "user_id", "status", "place", "share", "since"], away_rows)
        member_by_circle: dict = {}
        for m in members:
            member_by_circle.setdefault(m.community_id, []).append(str(m.user_id))
        for c in circles_with_days:
            for did, fname in day_ids[c.id][:2]:
                for uid_ in rng.sample(member_by_circle.get(c.id, []), min(3, len(member_by_circle.get(c.id, [])))):
                    bless_rows.append((c.id, did, uid_, "blessing", rng.choice(BLESSINGS).format(fest=fname), NOW - timedelta(days=rng.randint(0, 6))))
        ins(cur, "circle_contributions", ["community_id", "day_id", "user_id", "kind", "body", "created_at"], bless_rows)

        # ---------- contributions (what members have given) ----------
        contrib = []
        pool = [m for m in members if str(m.user_id) in by_id and by_id[str(m.user_id)].age_band in ("60plus", "40to59")]
        for m in rng.sample(pool, min(520, len(pool))):
            c = next(c for c in circles if c.id == m.community_id)
            kind, desc, hrs = rng.choice(CONTRIB)
            contrib.append((m.community_id, m.user_id, kind, desc, hrs, c.created_by, NOW - timedelta(days=rng.randint(2, 200))))
        ins(cur, "contributions", ["community_id", "user_id", "kind", "description", "hours", "verified_by", "created_at"], contrib)

        # ---------- exercise history (the last eight weeks) ----------
        logs = []
        movers = [p for p in people if p.age_band in ("60plus", "40to59")]
        for p in rng.sample(movers, min(260, len(movers))):
            kind = rng.choice(["walk", "walk", "exercise", "yoga"])
            for week in range(8):
                for _ in range(rng.randint(1, 4)):
                    logs.append((p.id, kind, rng.choice([20, 30, 40, 45, 60]), TODAY - timedelta(days=week * 7 + rng.randint(0, 6))))
        ins(cur, "activity_logs", ["user_id", "kind", "minutes", "logged_on"], logs)

        # ---------- calendars: medicine, the polyclinic, tai chi, kopi, a weekly call ----------
        cal = []
        elders = [p for p in people if p.age_band == "60plus"]
        for p in rng.sample(elders, min(300, len(elders))):
            town = (p.area_name or "").replace(", Singapore", "").split(" ", 2)[-1] if p.area_name else ""
            clinic = next((v for k, v in POLYCLINICS.items() if k in (p.area_name or "")), "the polyclinic")
            first = TODAY + timedelta(days=rng.randint(3, 50))
            cal.append((p.id, p.id, "appointment", f"Check-up at {clinic}", "Bring your CHAS card and the blue medicine book.", first, time(rng.choice([9, 10, 11]), rng.choice([0, 30])), "none", "app"))
            if rng.random() < 0.55:
                cal.append((p.id, p.id, "medicine", "Morning tablet", "With breakfast, after the kopi.", TODAY, time(8, 0), "daily", "app"))
            if rng.random() < 0.5:
                cal.append((p.id, p.id, "exercise", "Tai chi at the void deck", "Wear comfortable shoes.", TODAY + timedelta(days=rng.randint(0, 6)), time(7, 30), "weekly", "app"))
            h = home.get(str(p.id))
            if h and rng.random() < 0.45:
                cal.append((p.id, p.id, "event", f"Kopi and stories at {h.name[:60]}", None, TODAY + timedelta(days=rng.randint(0, 6)), time(15, 0), "weekly", "app"))
        ins(cur, "calendar_items", ["person_id", "created_by", "kind", "title", "note", "first_date", "local_time", "repeat", "channel"], cal)

        # ---------- wellbeing check-ins, and the daily check-in ----------
        POINTS = ["hardly_ever", "some_of_the_time", "often"]
        wb = []
        for p in rng.sample(people, min(420, len(people))):
            lonely = p.age_band == "60plus" and "share" not in (p.roles or [])
            w = [0.3, 0.45, 0.25] if lonely else [0.6, 0.3, 0.1]
            ans = {k: rng.choices(POINTS, w)[0] for k in ("lack_companionship", "feel_left_out", "feel_isolated")}
            score = sum(POINTS.index(v) + 1 for v in ans.values())
            wb.append((p.id, "baseline", score, json.dumps(ans), p.created_at + timedelta(minutes=12)))
            if rng.random() < 0.35 and (NOW - p.created_at).days > 100:  # three months on, a little less lonely
                ans2 = {k: POINTS[max(0, POINTS.index(v) - rng.choice([0, 1]))] for k, v in ans.items()}
                wb.append((p.id, "3m", sum(POINTS.index(v) + 1 for v in ans2.values()), json.dumps(ans2), p.created_at + timedelta(days=92)))
        ins(cur, "wellbeing_checks", ["user_id", "kind", "score", "answers", "taken_at"], wb, "(%s,%s,%s,%s::jsonb,%s)")
        dc = []
        for p in rng.sample(elders, min(170, len(elders))):
            quiet = rng.random() < 0.15
            dc.append((p.id, True, time(8, 30), TODAY - timedelta(days=rng.randint(0, 1)), NOW - timedelta(hours=rng.randint(2, 30 if not quiet else 100)), rng.choice([2, 3]) if quiet else 0, False))
        ins(cur, "daily_checkins", ["user_id", "enabled", "local_time", "last_sent", "last_reply", "silent_days", "family_notify"], dc)

        # ---------- families: a daughter and a parent, in the same estate ----------
        carers = [p for p in people if "care" in (p.roles or [])]
        parents = [p for p in elders if "share" not in (p.roles or [])]
        rng.shuffle(parents)
        fam_rows, fm_rows = [], []
        for carer, parent in zip(carers[:40], parents[:40]):
            fid = str(uuid4())
            surname = (parent.display_name or "").split()[0]
            fam_rows.append((fid, f"The {surname} family", carer.id))
            fm_rows.append((fid, carer.id, "owner", "active"))
            fm_rows.append((fid, parent.id, "member", "active"))
        ins(cur, "families", ["id", "name", "created_by"], fam_rows)
        ins(cur, "family_members", ["family_id", "user_id", "role", "status"], fm_rows)

        # ---------- thank-yous after a logged session, and notifications from what is really there ----------
        conns = conn.execute(text("select k.id, k.mentor_id, k.learner_id, k.offer_id, k.status, k.created_at, o.title, (select count(*) from wisdom_sessions s where s.connection_id = k.id) as sessions "
                                  "from wisdom_connections k join users u on u.id = k.mentor_id left join wisdom_offers o on o.id = k.offer_id where u.email like :d"), {"d": f"%@{DOMAIN}"}).all()
        endorse, notes = [], []
        n = 0

        def note(uid_, kind, body, hours_ago, read=False):
            nonlocal n
            n += 1
            at = NOW - timedelta(hours=hours_ago)
            notes.append((uid_, kind, body[:990], False, "read" if read else "inbox", f"seed-more:{n}", at, at if read else None))

        for k in conns:
            mentor, learner = by_id.get(str(k.mentor_id)), by_id.get(str(k.learner_id))
            if not mentor or not learner:
                continue
            if k.status == "pending":
                note(k.mentor_id, "introduction", f"{learner.display_name} would like to learn from you: {k.title}. Open the Wisdom tab to say yes or no.", rng.randint(2, 40))
            elif k.status == "accepted":
                note(k.learner_id, "introduction", f"{mentor.display_name} said yes. Say hello and fix a time.", rng.randint(6, 90), rng.random() < 0.5)
                if k.sessions and k.offer_id:
                    endorse.append((k.offer_id, k.learner_id, rng.choice(NOTE)))
                    note(k.mentor_id, "thanks", f"{learner.display_name} thanked you for the session on {k.title}.", rng.randint(4, 70))
        endorse = list({(o, l): (o, l, t) for o, l, t in endorse}.values())  # one thank-you per learner per offer
        ins(cur, "wisdom_endorsements", ["offer_id", "learner_id", "note"], endorse)
        soon = conn.execute(text("select a.id, a.title, a.location, a.starts_at, a.community_id from activities a join communities c on c.id = a.community_id where c.external_ref like 'seed:%' and a.status = 'scheduled' and a.starts_at between now() and now() + interval '3 days'")).all()
        for a in soon:
            for uid_ in rng.sample(member_by_circle.get(a.community_id, []), min(6, len(member_by_circle.get(a.community_id, [])))):
                when = "Tomorrow" if a.starts_at.date() > TODAY else "Today"
                clock = a.starts_at.strftime("%I:%M %p").lstrip("0")
                note(uid_, "gathering", f"{when} at {clock}: {a.title}, {a.location or 'your centre'}.", rng.randint(1, 30))
        for p in rng.sample(people, min(220, len(people))):
            note(p.id, "welcome", "Welcome to Interchange. Your circles are saying hello: look in Communities, or tell Wisdom a story.", rng.randint(24, 160), True)
        ins(cur, "notifications", ["user_id", "kind", "body", "urgent", "status", "dedupe_key", "created_at", "read_at"], notes)

        print(f"seeded: {len(FESTIVALS)} festivals, {len(day_rows)} circle days, {len(away_rows)} away, {len(bless_rows)} blessings, {len(contrib)} contributions, {len(logs)} exercise logs, "
              f"{len(cal)} calendar items, {len(wb)} wellbeing checks, {len(dc)} daily check-ins, {len(fam_rows)} families, {len(endorse)} thank-yous, {len(notes)} notifications")


if __name__ == "__main__":
    main(sys.argv[1:])
