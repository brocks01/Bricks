"""Fills the demo with enough life to SHOW every screen end to end: leaders' vote and rota, a gathering about to start (so "I'm here" shows), market stalls with time
slots, and for one real account a month of history (check-ins, walks, gatherings attended, reminders ticked, a goal with steps, habits, aspirations, a health card,
a service, a booking request) so the tree is full, the roots are strong and Today, Progress and Profile are all alive. Names are realistic (the demo people of
seed_demo.py); nothing is a placeholder. Safe to run again: it checks before it adds.

  python backend/run.py showcase you@example.com          # fill it
  python backend/run.py showcase you@example.com --undo   # take this account's showcase history out again (the demo communities stay)
"""
import sys
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import text

from .core.db import engine
from .modules.nodes import feed, service
from .seed_demo import PHOTOS, _img

UTC = timezone.utc
PRODUCTS = {  # slug -> (what it is known for, when it meets)
    "bedok-heritage-kakis-demo": ("Kampung recipes", "Thursdays, 9.30 am"),
    "toa-payoh-silver-mentors-demo": ("Mentoring for pupils", "Weekday afternoons, 3 pm"),
    "tampines-kampung-spirit-demo": ("Grandparents' storytelling", "Saturdays, 8 am"),
    "jurong-green-gardeners-demo": ("Chilli padi", "Sundays, 9 am"),
}


def _community(conn, slug: str):
    return conn.execute(text("select id, created_by from communities where slug = :s"), {"s": slug}).first()


def _members(conn, cid) -> list:
    return [r.user_id for r in conn.execute(text("select user_id from memberships where community_id = :c and status = 'active' order by joined_at limit 20"), {"c": cid})]


def communities(conn, me: str) -> None:
    now = datetime.now(UTC)
    for slug, (product, meeting) in PRODUCTS.items():
        conn.execute(text("update communities set signature_product = coalesce(signature_product, :p), signature_since = coalesce(signature_since, current_date - 60), meeting = coalesce(meeting, :m) where slug = :s"),
                     {"p": product, "m": meeting, "s": slug})
    bedok = _community(conn, "bedok-heritage-kakis-demo")
    if bedok is None:
        print("no demo communities yet: run seed-demo first")
        return
    people = _members(conn, bedok.id)

    # a gathering that starts soon, so "I'm here" is there to be tapped
    if not conn.execute(text("select 1 from activities where community_id = :c and title = 'Thursday Kopi and Stories'"), {"c": bedok.id}).first():
        a = conn.execute(text(
            "insert into activities (community_id, organiser_id, title, description, category, starts_at, ends_at, location, image_url) "
            "values (:c, :o, 'Thursday Kopi and Stories', 'One elder tells a story from the kampung days, then everyone shares a cup of kopi.', 'Cultural Event', :s, :e, 'Bedok North Community Club', :i) returning id"),
            {"c": bedok.id, "o": people[3], "s": now + timedelta(minutes=20), "e": now + timedelta(minutes=110), "i": _img(PHOTOS["bedok-heritage-kakis-demo"][1][0])}).scalar_one()
        for u in people[:9]:
            conn.execute(text("insert into activity_participants (activity_id, user_id) values (:a, :u) on conflict do nothing"), {"a": a, "u": u})

    # the open vote in Bedok: the secretary (the real account) can close it from the lead tools
    if not conn.execute(text("select 1 from community_votes where community_id = :c"), {"c": bedok.id}).first():
        v = conn.execute(text("insert into community_votes (community_id, title, created_by) values (:c, 'What should Bedok Heritage Kakis be known for?', :u) returning id"), {"c": bedok.id, "u": people[0]}).scalar_one()
        opts = [conn.execute(text("insert into community_vote_options (vote_id, name, ord) values (:v, :n, :o) returning id"), {"v": v, "n": n, "o": i}).scalar_one()
                for i, n in enumerate(["Kampung recipes", "Old photographs", "Storytelling"])]
        for i, u in enumerate(people[1:10]):
            conn.execute(text("insert into community_vote_ballots (vote_id, user_id, option_id) values (:v, :u, :o) on conflict do nothing"), {"v": v, "u": u, "o": opts[[0, 0, 0, 1, 1, 1, 1, 2, 2][i]]})

    # the rota: Thursday host in Bedok, Saturday tai chi helper in Tampines
    for slug, weekday, label, cap, fills in [("bedok-heritage-kakis-demo", 3, "Kopi and stories host", 3, [3, 2, 1, 0]), ("tampines-kampung-spirit-demo", 5, "Tai chi helper", 2, [2, 1, 0, 0])]:
        c = _community(conn, slug)
        crew = _members(conn, c.id)
        d = date.today() + timedelta(days=(weekday - date.today().weekday()) % 7)
        for i in range(4):
            sid = conn.execute(text("insert into community_rota_slots (community_id, on_date, label, capacity) values (:c, :d, :l, :n) on conflict do nothing returning id"),
                               {"c": c.id, "d": d + timedelta(days=7 * i), "l": label, "n": cap}).scalar()
            if sid is None:
                continue
            for u in crew[i : i + fills[i]]:
                conn.execute(text("insert into community_rota_signups (slot_id, user_id) values (:s, :u) on conflict do nothing"), {"s": sid, "u": u})

    # Market Day: a Sunday morning, with three stalls and their time slots
    m = conn.execute(text("select id from activities where community_id = :c and lower(category) = 'market' order by starts_at limit 1"), {"c": bedok.id}).first()
    if m:
        sunday = datetime.combine(date.today() + timedelta(days=(6 - date.today().weekday()) % 7 or 7), datetime.min.time(), tzinfo=UTC) + timedelta(hours=1)  # 9 am Singapore
        conn.execute(text("update activities set starts_at = :s, ends_at = :e, location = 'Bedok North Community Club' where id = :a"), {"s": sunday, "e": sunday + timedelta(hours=4), "a": m.id})
        for u, selling, helper, slot in [(people[1], "Pineapple tarts and kuih raya", "Grandson Arif", "first"), (people[2], "Hand-sewn tote bags", None, "second"), (people[3], "Chinese calligraphy cards", "Neighbour Mei Ling", "whole")]:
            conn.execute(text("insert into market_stalls (activity_id, seller_id, selling, helper_name, slot) values (:a, :u, :s, :h, :sl) on conflict (activity_id, seller_id) do nothing"),
                         {"a": m.id, "u": u, "s": selling, "h": helper, "sl": slot})
    print("showcase: communities ready (products, today's gathering, vote, rota, market stalls)")


def personal(conn, me: str, email: str) -> None:
    if conn.execute(text("select 1 from nodes where user_id = :u and title = 'Water the balcony plants' and not archived"), {"u": me}).first():
        print("showcase: this account already has its history")
        return
    off = conn.execute(text("select coalesce(tz_offset_min, 480) from users where id = :u"), {"u": me}).scalar_one()
    today = (datetime.now(UTC) + timedelta(minutes=off)).date()
    utc = lambda d, h=8, m=0: datetime.combine(d, datetime.min.time(), tzinfo=UTC) + timedelta(hours=h, minutes=m) - timedelta(minutes=off)  # noqa: E731
    conn.execute(text("update users set age_band = coalesce(age_band, '40to59'), tz_offset_min = coalesce(tz_offset_min, 480) where id = :u"), {"u": me})

    # health: a card, twelve days of "yes" in the last fortnight, six walks in three weeks
    conn.execute(text("insert into health_cards (user_id, blood_group, allergies, conditions, medicines, contact_name) values (:u, 'O+', 'Penicillin', 'High blood pressure', 'One tablet every morning', 'Priya, my daughter') "
                      "on conflict (user_id) do update set blood_group = excluded.blood_group, allergies = excluded.allergies, conditions = excluded.conditions, medicines = excluded.medicines, contact_name = excluded.contact_name"), {"u": me})
    move = service.ensure_habit(conn, me, "habit:move", "Move every day", "daily", "move", feed.AREAS["move"])
    for o in [x for x in range(14) if x not in (5, 9)]:
        d = today - timedelta(days=o)
        conn.execute(text("insert into health_checkins (user_id, day, moved, feeling) values (:u, :d, true, 4) on conflict (user_id, day) do update set moved = true"), {"u": me, "d": d})
        conn.execute(text("insert into node_repeats (user_id, nid, day) values (:u, :n, :d) on conflict do nothing"), {"u": me, "n": move["nid"], "d": d})
        title = f"Moved on {d.isoformat()}"
        if not conn.execute(text("select 1 from nodes where user_id = :u and kind = 'checkin' and title = :t and not archived"), {"u": me, "t": title}).first():
            service.earn(conn, me, "move", feed.AREAS["move"], title, kind="checkin")
    service.habit_log(conn, me, move["nid"])
    walk = service.ensure_habit(conn, me, "habit:walk", "Walk every week", "weekly", "move", feed.AREAS["move"])
    for i, o in enumerate([1, 4, 8, 11, 15, 19]):
        d = today - timedelta(days=o)
        dist = 2100 + 260 * i
        conn.execute(text("insert into health_walks (user_id, started_at, duration_s, moving_s, distance_m, steps, avg_pace_s_km) values (:u, :s, :du, :mo, :di, :st, :p)"),
                     {"u": me, "s": utc(d, 7, 0), "du": 2000 + 120 * i, "mo": 1800 + 100 * i, "di": dist, "st": int(dist * 1.3), "p": round((1800 + 100 * i) / (dist / 1000))})
        conn.execute(text("insert into node_repeats (user_id, nid, day) values (:u, :n, :d) on conflict do nothing"), {"u": me, "n": walk["nid"], "d": d})
        service.earn(conn, me, "move", feed.AREAS["move"], "Walk", kind="walk")
    service.habit_log(conn, me, walk["nid"])

    # communities: gatherings attended, and the next ones he said yes to
    for slug, title, days_ago, cat in [("bedok-heritage-kakis-demo", "Kopitiam Storytelling Morning", 6, "Cultural Event"), ("toa-payoh-silver-mentors-demo", "Digital Skills with Silver Mentors", 3, "Workshop")]:
        c = _community(conn, slug)
        if not c:
            continue
        a = conn.execute(text("insert into activities (community_id, organiser_id, title, category, starts_at, ends_at, location) values (:c, :o, :t, :k, :s, :e, :l) returning id"),
                         {"c": c.id, "o": c.created_by, "t": title + " (past)", "k": cat, "s": datetime.now(UTC) - timedelta(days=days_ago), "e": datetime.now(UTC) - timedelta(days=days_ago) + timedelta(hours=2), "l": "Community Club"}).scalar_one()
        conn.execute(text("insert into activity_participants (activity_id, user_id, status, checked_in_at) values (:a, :u, 'attended', now()) on conflict do nothing"), {"a": a, "u": me})
        feed.attended(conn, me, str(a))
    for slug in PRODUCTS:
        c = _community(conn, slug)
        if not c or not conn.execute(text("select 1 from memberships where community_id = :c and user_id = :u and status = 'active'"), {"c": c.id, "u": me}).first():
            continue
        nxt = conn.execute(text("select id from activities where community_id = :c and status = 'scheduled' and starts_at > now() and title not like '%(past)%' order by starts_at limit 1"), {"c": c.id}).first()
        if nxt:
            conn.execute(text("insert into activity_participants (activity_id, user_id) values (:a, :u) on conflict do nothing"), {"a": nxt.id, "u": me})
            feed.going(conn, me, str(nxt.id), True)

    # my own goal with steps, and a habit of my own
    g = service.add_goal(conn, me, "Learn to video call my grandchildren")
    for i, step in enumerate(["Install the video call app", "Make a first call to Priya", "Call the grandchildren every Sunday evening"]):
        t = service.attach(conn, me, "task", step, parent_id=g["nid"], actor="person")
        if i < 2:
            service.set_badge(conn, me, t["nid"], {"status": "closed", "own": 1})
    h = service.add_habit(conn, me, "Water the balcony plants", "daily")
    for o in [x for x in range(20) if x not in (3, 4, 9, 14, 15)]:
        conn.execute(text("insert into node_repeats (user_id, nid, day) values (:u, :n, :d) on conflict do nothing"), {"u": me, "n": h["nid"], "d": today - timedelta(days=o)})
    service.habit_log(conn, me, h["nid"])

    # aspirations
    for title, cat, done in [("Walk the Southern Ridges", "hobby", True), ("Visit my cousins in Chennai", "family", False), ("Learn to paint", "hobby", False)]:
        aid = conn.execute(text("insert into aspirations (user_id, title, category, done_at) values (:u, :t, :c, case when :d then now() end) returning id"), {"u": me, "t": title, "c": cat, "d": done}).scalar_one()
        if done:
            feed.aspired(conn, me, str(aid), title, True)

    # the calendar: a daily tablet (ticked for the last ten days), a check-up tomorrow, evening walks, a Sunday call
    def item(kind, title, d, hh, mm, repeat="none", dur=None, remind=15, days=None, channel="app"):
        return conn.execute(text(
            "insert into calendar_items (person_id, created_by, kind, title, first_date, local_time, tz_offset_min, duration_min, repeat, repeat_days, remind_before_min, channel) "
            "values (:u, :u, :k, :t, :d, :lt, :tz, :du, :r, :rd, :rb, :ch) returning id"),
            {"u": me, "k": kind, "t": title, "d": d, "lt": f"{hh:02d}:{mm:02d}", "tz": off, "du": dur, "r": repeat, "rd": days, "rb": remind, "ch": channel}).scalar_one()
    pill = item("medicine", "Morning blood pressure tablet", today - timedelta(days=14), 8, 0, "daily", 5, 10)
    for o in range(1, 11):
        conn.execute(text("insert into calendar_marks (item_id, occurs_at, status, marked_by) values (:i, :o, 'done', :u) on conflict do nothing"), {"i": pill, "o": utc(today - timedelta(days=o)), "u": me})
    for o in (1, 2, 3):
        feed.care(conn, me, str(pill), utc(today - timedelta(days=o)).isoformat(), "Morning blood pressure tablet", "medicine", True)
    item("appointment", "Polyclinic check-up", today + timedelta(days=1), 10, 0, "none", 45, 60)
    item("exercise", "Evening walk with Mr Lim", today, 18, 0, "weekly", 40, 15, [1, 3])
    item("call", "Video call with Priya and the grandchildren", today + timedelta(days=(6 - today.weekday()) % 7), 19, 0, "weekly", 30, 15, [6])

    # a service he offers and a request for it
    lid = conn.execute(text("insert into service_listings (owner_id, title, category, description, tier, experience_years, proof_text, rate_per_hour, area_name) "
                            "values (:u, 'Helping seniors with phones and video calls', 'teaching', 'One hour, at your home or the void deck: set up WhatsApp, video calls and safe banking, and write the steps down in large print.', 'basic', 8, "
                            "'Software engineer; has set up video calls for family and neighbours for eight years.', null, 'Singapore') returning id"), {"u": me}).scalar_one()
    req = conn.execute(text("select id from users where email like 'gerard.d%cruz%@demo.bricks.test' or display_name = 'Gerard D''Cruz' limit 1")).scalar()
    if req:
        conn.execute(text("insert into service_bookings (listing_id, requester_id, provider_id, starts_at, hours, note) values (:l, :r, :u, :s, 1, 'Please help me set up WhatsApp video calls with my sister in Perth.')"),
                     {"l": lid, "r": req, "u": me, "s": datetime.now(UTC) + timedelta(days=3, hours=6)})
    print(f"showcase: {email} now has a month of history (tree, habits, goal, aspirations, calendar, health card, a service)")


def undo(conn, me: str) -> None:
    """Takes the account's showcase history out: its tree, repeats, health history, calendar, aspirations and the service. The demo communities stay."""
    service.erase(conn, me)
    for sql in ["delete from health_checkins where user_id = :u", "delete from health_walks where user_id = :u", "delete from aspirations where user_id = :u",
                "delete from calendar_items where person_id = :u", "delete from service_listings where owner_id = :u", "delete from health_cards where user_id = :u",
                "delete from activity_participants where user_id = :u and activity_id in (select id from activities where title like '%(past)%')"]:
        conn.execute(text(sql), {"u": me})
    print("showcase history removed")


def main(argv: list[str]) -> None:
    emails = [a for a in argv if "@" in a]
    if not emails:
        raise SystemExit("usage: python backend/run.py showcase you@example.com [--undo]")
    with engine().begin() as conn:
        u = conn.execute(text("select id from users where email = :e"), {"e": emails[0].lower()}).first()
        if u is None:
            raise SystemExit(f"no account for {emails[0]}: sign in once first")
        if "--undo" in argv:
            undo(conn, str(u.id))
            return
        communities(conn, str(u.id))
        personal(conn, str(u.id), emails[0])


if __name__ == "__main__":
    main(sys.argv[1:])
