"""Seeds ONE full demo community so the whole Connect UI can be tried before real data exists.

  python backend/run.py seed-demo                      # create it (if it is not there)
  python backend/run.py seed-demo you@example.com ...  # also add these existing accounts as members (the first one becomes Secretary, who can manage)
  python backend/run.py seed-demo --reset              # delete the demo community and the demo people again

Everything here is marked `is_demo` (the community) or uses the address domain @demo.bricks.test (the people), so it can always be removed with
--reset. The demo people cannot sign in (their addresses do not exist). Join code of the demo community: LAKE-DEMO."""
import sys
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import text

from .core.db import engine

SLUG = "lakeview-residency-demo"
CODE = "LAKE-DEMO"
DOMAIN = "demo.bricks.test"
PEOPLE = [  # name, area
    ("Meera Nair", "Block A"), ("Arjun Rao", "Block B"), ("Fatima Sheikh", "Block A"), ("Daniel Tan", "Block C"), ("Priya Menon", "Block D"),
    ("Ravi Kulkarni", "Block B"), ("Aisha Khan", "Block C"), ("Chen Wei", "Block A"), ("Lakshmi Iyer", "Block D"), ("Tom Fernandes", "Block B"),
    ("Sunita Das", "Block C"), ("Omar Hassan", "Block A"),
]


def reset(conn) -> None:
    conn.execute(text("delete from communities where slug = :s"), {"s": SLUG})  # cascades to everything inside it
    conn.execute(text("delete from users where email like :d"), {"d": f"%@{DOMAIN}"})


def seed(extra_emails: list[str]) -> str:
    now = datetime.now(timezone.utc)
    with engine().begin() as conn:
        if conn.execute(text("select 1 from communities where slug = :s"), {"s": SLUG}).first():
            print("demo community already exists (use --reset to remove it first)")
        else:
            ids = []
            for name, area in PEOPLE:
                email = f"{name.split()[0].lower()}.{name.split()[1].lower()}@{DOMAIN}"
                ids.append(conn.execute(text("insert into users (email, display_name, area_name, age_band) values (:e, :n, :a, '40to59') returning id"),
                                        {"e": email, "n": name, "a": area}).one().id)
            cid = conn.execute(
                text("insert into communities (name, slug, kind, description, area_name, privacy, invite_code, is_demo, created_by) values "
                     "('Lakeview Residency', :s, 'apartment', 'A friendly apartment community: walks, yoga, health camps and neighbours helping neighbours.', "
                     "'Lakeview Road', 'invite', :c, true, :u) returning id"), {"s": SLUG, "c": CODE, "u": ids[0]}).one().id
            for u in ids:
                conn.execute(text("insert into memberships (community_id, user_id) values (:c, :u)"), {"c": cid, "u": u})
            roles = {}
            for key, name, manage in (("lead", "Community Lead", True), ("secretary", "Secretary", True), ("treasurer", "Treasurer", False), ("events", "Events Coordinator", True)):
                roles[key] = conn.execute(text("insert into role_definitions (community_id, key, name, can_manage) values (:c, :k, :n, :m) returning id"),
                                          {"c": cid, "k": key, "n": name, "m": manage}).one().id
            for key, user in (("lead", ids[0]), ("secretary", ids[1]), ("treasurer", ids[2]), ("events", ids[3])):
                conn.execute(text("insert into role_terms (community_id, role_definition_id, user_id, starts_on, ends_on) values (:c, :d, :u, :s, :e)"),
                             {"c": cid, "d": roles[key], "u": user, "s": date.today() - timedelta(days=90), "e": date.today() + timedelta(days=275)})
            for title, body, pinned, author, days_ago in (
                ("Welcome to Lakeview Residency on Bricks", "This is our community space. Join activities, see who does what, and help each other.", True, ids[0], 20),
                ("Water tank cleaning on Saturday", "Water will be off from 10 am to 1 pm on Saturday. Please store water in advance.", False, ids[1], 3),
                ("Yoga sessions are starting in the community hall", "Every Friday evening at 6 pm. All ages welcome. Bring your own mat.", False, ids[3], 1)):
                conn.execute(text("insert into announcements (community_id, author_id, title, body, pinned, created_at) values (:c, :a, :t, :b, :p, :d)"),
                             {"c": cid, "a": author, "t": title, "b": body, "p": pinned, "d": now - timedelta(days=days_ago)})
            acts = []
            for title, desc, cat, offset, hours, place, cap in (
                ("Evening Walk", "A relaxed walk around the garden. All ages.", "Fitness", timedelta(hours=3), 1, "Block A Garden", None),
                ("Yoga Session", "Gentle yoga with a trained volunteer. Bring a mat.", "Fitness", timedelta(days=2, hours=1), 1, "Community Hall", 30),
                ("Community Health Camp", "Free check-ups, eye screening and a short talk on healthy habits.", "Health Camp", timedelta(days=8), 5, "Community Hall", 60),
                ("Cultural Evening", "Songs, stories and food from every region our neighbours come from.", "Cultural Event", timedelta(days=20), 3, "Clubhouse Lawn", None)):
                start = now + offset
                acts.append(conn.execute(
                    text("insert into activities (community_id, organiser_id, title, description, category, starts_at, ends_at, location, capacity) values "
                         "(:c, :o, :t, :d, :cat, :s, :e, :l, :cap) returning id"),
                    {"c": cid, "o": ids[3], "t": title, "d": desc, "cat": cat, "s": start, "e": start + timedelta(hours=hours), "l": place, "cap": cap}).one().id)
            for i, a in enumerate(acts):
                for u in ids[: 4 + i * 2]:
                    conn.execute(text("insert into activity_participants (activity_id, user_id) values (:a, :u)"), {"a": a, "u": u})
            for user, kind, desc, hours in ((ids[4], "time", "Set up chairs for the yoga session", 1.5), (ids[5], "skill", "Fixed the garden lights", 2), (ids[6], "time", "Led the evening walk", 1),
                                            (ids[7], "goods", "Donated 20 folding chairs", None), (ids[8], "time", "Helped with the health camp registration desk", 4), (ids[9], "skill", "Painted the notice board", 3)):
                conn.execute(text("insert into contributions (community_id, user_id, kind, description, hours, verified_by) values (:c, :u, :k, :d, :h, :v)"),
                             {"c": cid, "u": user, "k": kind, "d": desc, "h": hours, "v": ids[1]})
            for user, kind, title, desc, contact in (
                (ids[5], "referral", "Reliable electrician for the blocks", "Fast and fair. Ask for Suresh.", "Message Ravi (Block B)"),
                (ids[8], "service", "Maths and science tuition, classes 6 to 10", "Evenings, small groups in the clubhouse.", "Message Lakshmi (Block D)"),
                (ids[7], "job", "Part-time library helper wanted", "Two afternoons a week at the community library.", "Message Chen (Block A)")):
                conn.execute(text("insert into opportunities (community_id, posted_by, kind, title, description, contact) values (:c, :u, :k, :t, :d, :ct)"),
                             {"c": cid, "u": user, "k": kind, "t": title, "d": desc, "ct": contact})
            print(f"demo community created: Lakeview Residency (join code {CODE}), {len(ids)} demo members, 4 activities, 3 announcements, 6 contributions, 3 opportunities")
        # real accounts: join as members; the first one becomes Secretary so the manager view can be tried
        cid = conn.execute(text("select id from communities where slug = :s"), {"s": SLUG}).one().id
        for n, email in enumerate(extra_emails):
            u = conn.execute(text("select id from users where email = :e"), {"e": email.strip().lower()}).first()
            if not u:
                print(f"no account for {email}: sign in once first, then run this again")
                continue
            conn.execute(text("insert into memberships (community_id, user_id) values (:c, :u) on conflict (community_id, user_id) do update set status = 'active'"), {"c": cid, "u": u.id})
            if n == 0:
                d = conn.execute(text("select id from role_definitions where community_id = :c and key = 'secretary'"), {"c": cid}).one().id
                if not conn.execute(text("select 1 from role_terms where community_id = :c and user_id = :u and role_definition_id = :d"), {"c": cid, "u": u.id, "d": d}).first():
                    conn.execute(text("insert into role_terms (community_id, role_definition_id, user_id, starts_on, ends_on) values (:c, :d, :u, current_date, current_date + interval '12 months')"),
                                 {"c": cid, "d": d, "u": u.id})
            print(f"added {email} as a member" + (" and Secretary" if n == 0 else ""))
        lead = conn.execute(text("select created_by from communities where slug = :s"), {"s": SLUG}).one().created_by
        seed_others(conn, lead)
        real = [e.strip().lower() for e in extra_emails]
        reserve = len(real)
        for slug, target in ((SLUG, 128), *((o[1], o[4]) for o in OTHERS)):
            c = conn.execute(text("select id from communities where slug = :s"), {"s": slug}).one().id
            for e in real:  # real accounts belong to all four demo communities
                u = conn.execute(text("select id from users where email = :e"), {"e": e}).first()
                if u:
                    conn.execute(text("insert into memberships (community_id, user_id) values (:c, :u) on conflict (community_id, user_id) do update set status = 'active'"), {"c": c, "u": u.id})
            fill(conn, c, target, 0)  # real accounts are already members, so they count toward the target
        print("demo communities ready: Lakeview Residency 128, Heritage Alumni 340, Green Kolkata 86, Weekend Readers 42 members (real accounts included)")
    return CODE


# The other three communities of the Connect sample (ui-samples/09). Each: name, slug, kind, icon, members, description, one activity (title, category, days ahead, place).
OTHERS = [
    ("Heritage Alumni", "heritage-alumni-demo", "club", "school", 340, "Old classmates keeping in touch, mentoring the young and organising reunions.",
     ("Alumni Mentoring Evening", "Workshop", 5, "College Auditorium"), "HERI-DEMO"),
    ("Green Kolkata", "green-kolkata-demo", "neighbourhood", "leaf", 86, "Neighbours growing trees, composting and cleaning up the city together.",
     ("Tree Planting Drive", "Environment Drive", 4, "Maidan Gate 3"), "GREE-DEMO"),
    ("Weekend Readers", "weekend-readers-demo", "other", "book", 42, "A reading circle that meets every weekend to share books and stories.",
     ("Storytelling Circle", "Cultural Event", 3, "Public Library Hall"), "READ-DEMO"),
]


FIRST = ["Aarav", "Ananya", "Arjun", "Aisha", "Amit", "Anjali", "Ben", "Chen", "Daniel", "Deepa", "Divya", "Farhan", "Fatima", "Gita", "Hui Min", "Imran", "Ishaan", "Jia Wei",
         "Kavita", "Kiran", "Lakshmi", "Mei Ling", "Meera", "Mohan", "Nadia", "Nikhil", "Noor", "Omar", "Pooja", "Priya", "Rahul", "Rajesh", "Ravi", "Rohan", "Sanjay", "Sara", "Shreya",
         "Sneha", "Sunita", "Suresh", "Tan", "Uma", "Vikram", "Wei", "Yusuf", "Zara", "Abdul", "Bala", "Carmen", "David"]
LAST = ["Nair", "Rao", "Sheikh", "Tan", "Menon", "Kulkarni", "Khan", "Wei", "Iyer", "Fernandes", "Das", "Hassan", "Sharma", "Banerjee", "Chatterjee", "Lim", "Ng", "Ismail", "Rahman",
        "Pillai", "Reddy", "Singh", "Gupta", "Mukherjee", "Ong", "Lee", "Abdullah", "Kapoor", "Joshi", "Bose", "Ghosh", "Wong", "Krishnan", "D'Souza", "Verma", "Mehta", "Chowdhury", "Goh"]
AREAS = ["Block A", "Block B", "Block C", "Block D"]


def real_people(n: int) -> list[tuple[str, str, str]]:
    """n people with real-sounding, distinct names (first and last names from the communities Bricks serves), their email-like handle and an area."""
    out = []
    for i in range(n):
        f, l = FIRST[i % len(FIRST)], LAST[(i * 7 + i // len(FIRST)) % len(LAST)]
        handle = f"{f}.{l}".lower().replace(" ", "").replace("'", "") + f".{i + 1}@{DOMAIN}"
        out.append((f"{f} {l}", handle, AREAS[i % len(AREAS)]))
    return out


def fill(conn, cid, target: int, reserve: int) -> None:
    """Brings the member count of a community up to `target` with demo people who have real names (shared across communities), leaving `reserve` seats for real accounts."""
    have = conn.execute(text("select count(*) from memberships where community_id = :c and status = 'active'"), {"c": cid}).scalar_one()
    need = max(0, target - reserve - have)
    if need:
        for name, email, area in real_people(400):
            conn.execute(text("insert into users (email, display_name, area_name, age_band) values (:e, :n, :a, '40to59') on conflict (email) do nothing"), {"e": email, "n": name, "a": area})
        conn.execute(text("insert into memberships (community_id, user_id) select :c, u.id from users u where u.email like :d "
                          "and u.email not like 'meera.%' and not exists (select 1 from memberships m where m.community_id = :c and m.user_id = u.id) order by u.email limit :n"),
                     {"c": cid, "n": need, "d": f"%@{DOMAIN}"})


def seed_others(conn, lead_id) -> None:
    now = datetime.now(timezone.utc)
    for name, slug, kind, icon, members, desc, act, code in OTHERS:
        if conn.execute(text("select 1 from communities where slug = :s"), {"s": slug}).first():
            continue
        cid = conn.execute(text("insert into communities (name, slug, kind, icon, description, privacy, invite_code, is_demo, created_by) "
                                "values (:n, :s, :k, :i, :d, 'invite', :c, true, :u) returning id"), {"n": name, "s": slug, "k": kind, "i": icon, "d": desc, "c": code, "u": lead_id}).one().id
        d = conn.execute(text("insert into role_definitions (community_id, key, name, can_manage) values (:c, 'lead', 'Community Lead', true) returning id"), {"c": cid}).one().id
        conn.execute(text("insert into memberships (community_id, user_id) values (:c, :u)"), {"c": cid, "u": lead_id})
        conn.execute(text("insert into role_terms (community_id, role_definition_id, user_id, starts_on, ends_on) values (:c, :d, :u, current_date, current_date + interval '12 months')"),
                     {"c": cid, "d": d, "u": lead_id})
        title, cat, days, place = act
        conn.execute(text("insert into activities (community_id, organiser_id, title, category, starts_at, ends_at, location) values (:c, :o, :t, :cat, :s, :e, :l)"),
                     {"c": cid, "o": lead_id, "t": title, "cat": cat, "s": now + timedelta(days=days, hours=2), "e": now + timedelta(days=days, hours=4), "l": place})
        conn.execute(text("insert into announcements (community_id, author_id, title, body, pinned) values (:c, :a, :t, :b, true)"),
                     {"c": cid, "a": lead_id, "t": f"Welcome to {name}", "b": desc})


def main(argv: list[str]) -> None:
    if "--reset" in argv:
        with engine().begin() as conn:
            reset(conn)
        print("demo community and demo people removed")
        return
    seed([a for a in argv if "@" in a])


if __name__ == "__main__":
    main(sys.argv[1:])
