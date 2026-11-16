"""Everything that makes Uncle Tan's first look at Interchange full: his three groups and the sessions he is going to, learners asking for his advice,
a teacher he has asked about photography, the next market days, a weekly tai chi reminder and a few notices. Real Singapore groups and people already in the database
(see seed_wisdom.py); nothing here is invented outside them. Safe to run again: every insert checks first.

  python backend/run.py seed-uncle        fill every Uncle Tan account (the mock Singpass login makes a new one each time and calls this too)
"""
from __future__ import annotations

from datetime import date, time, timedelta

from sqlalchemy import Connection, text

GROUPS = ("Tampines Kampung Spirit", "Tai chi", "Block 123 Growers")
ASKS = (  # what the earlier demo seeded; seed_wisdom_teach removes these so his Teach side shows exactly the revamp's invitations
    "Hello Uncle Tan, I am starting in tech sales next month. May I learn from your 40 years of experience?",
    "I want to move into sales and would love your career advice. Could we talk for half an hour?",
    "How did you handle difficult customers? I would like to learn how you did it.",
    "Could you coach me for a job interview? I heard you led a sales team for many years.",
)
NOTES = (
    ("Tai chi at Tampines Park is on this week. 8 people are going.", False),
    ("Someone new would like to learn from you. Open Wisdom to read the message.", False),
    ("Welcome to Interchange, Uncle Tan. Your groups and your experience are ready.", True),
)


# title, kind, venue, venue kind, address, area, days from today, hour, minutes long, what a person can do there, a line about it
EXTRAS = (
    ("Tai chi at Tampines Park", "activity", "Tampines Park", "other", "Tampines Street 11, Singapore", "Tampines", 1, 7, 60, ("enjoy",), "A gentle morning session for all ages. Wear comfortable shoes."),
    ("Kopi and kueh morning", "activity", "Active Ageing Centre, Bedok", "community_centre", "Bedok North Avenue 1, Singapore", "Bedok", 2, 9, 120, ("enjoy",), "Tea, kueh and a good chat with neighbours."),
    ("Nostalgic songs afternoon", "show", "Tampines Hub", "community_centre", "1 Tampines Walk, Singapore", "Tampines", 4, 14, 120, ("enjoy",), "Sing along to old Mandarin, Malay and Tamil favourites."),
    ("Befriender training and weekly calls", "volunteer", "Active Ageing Centre, Geylang East", "community_centre", "Geylang East Avenue 1, Singapore", "Geylang", 3, 9, 120, ("volunteer", "contribute"), "Learn to call and befriend seniors who live alone."),
    ("Meal delivery for homebound seniors", "volunteer", "Active Ageing Centre, Fernvale", "community_centre", "Sengkang East Way, Singapore", "Sengkang", 6, 9, 180, ("volunteer", "contribute"), "Deliver hot meals and stay for a short chat."),
    ("Heritage walk guide for school groups", "gig", "Chinatown Heritage Centre", "other", "48 Pagoda Street, Singapore", "Chinatown", 8, 10, 180, ("earn",), "Share your memories of old Singapore with students. Paid per walk."),
    ("Bedok Mall Sunday market", "market_day", "Bedok Mall", "mall", "311 New Upper Changi Road, Singapore", "Bedok", 6, 10, 300, ("earn", "enjoy"), "Seniors' stalls with home cooking, crafts and plants."),
)


def seed_uncle(conn: Connection, user_id: str) -> None:
    u = {"u": user_id}
    # his three groups (the most a person can join), so the app opens straight to his own groups
    for name in GROUPS:
        conn.execute(text("insert into memberships (community_id, user_id) select c.id, cast(:u as uuid) from communities c where c.name = :n "
                          "and not exists (select 1 from memberships m where m.community_id = c.id and m.user_id = cast(:u as uuid))"), {**u, "n": name})
    # going to what is coming up in them
    conn.execute(text("insert into activity_participants (activity_id, user_id) select a.id, cast(:u as uuid) from activities a join communities c on c.id = a.community_id "
                      "where c.name = any(:g) and a.starts_at > now() and a.status = 'scheduled' and not exists (select 1 from activity_participants p where p.activity_id = a.id and p.user_id = cast(:u as uuid))"),
                 {**u, "g": list(GROUPS)})
    # his Teach side (profile, invitations from Sarath and the SMU Students, the mentorship and its sessions) and the elders under Learn
    from .seed_wisdom_teach import seed as seed_teach

    seed_teach(conn, user_id)
    # he has asked a photography teacher to teach him
    conn.execute(text("insert into wisdom_connections (mentor_id, learner_id, initiated_by, offer_id, message, status) select o.user_id, cast(:u as uuid), cast(:u as uuid), o.id, "
                      "'Hello, I would like to learn digital photography. I am a beginner.', 'pending' from wisdom_offers o where o.status = 'active' and (o.title ilike '%photo%' or :n = '') "
                      "and o.user_id <> cast(:u as uuid) and not exists (select 1 from wisdom_connections k where k.learner_id = cast(:u as uuid) and k.offer_id = o.id) order by o.created_at limit 1"), {**u, "n": "x"})
    # the next two market days (the earlier seeded ones are in the past by now, so two more are made once, in Tampines)
    if not conn.execute(text("select 1 from market_events where kind = 'market_day' and starts_at > now() limit 1")).first():
        for k, (title, area, days) in enumerate((("Tampines Hub Market Day", "Tampines", 5), ("Tampines Kampung Market Day", "Tampines", 12))):
            start = (date.today() + timedelta(days=days))
            conn.execute(text("insert into market_events (title, description, venue_name, venue_kind, address, area_name, starts_at, ends_at, stalls_total, source, kind, intents) "
                              "values (:t, 'Stalls from neighbours: home cooking, crafts, plants. Host a stall or come and share a skill.', 'Tampines Hub', 'community_centre', "
                              "'1 Tampines Walk, Singapore', :a, (cast(:s as date) + time '09:30') at time zone 'Asia/Singapore', (cast(:s as date) + time '14:30') at time zone 'Asia/Singapore', 16, 'partner', 'market_day', array['earn','enjoy'])"), {"t": title, "a": area, "s": start})
    # what else is on near him, one of each kind, always in the next fortnight (checked by title, so running this again adds nothing)
    for title, kind, venue, vkind, addr, area, day, hour, mins, intents, about in EXTRAS:
        conn.execute(text("insert into market_events (title, description, venue_name, venue_kind, address, area_name, starts_at, ends_at, stalls_total, source, kind, intents) "
                          "select cast(:t as text), :d, :v, :vk, :ad, :a, (cast(:s as date) + make_time(:h, 0, 0)) at time zone 'Asia/Singapore', (cast(:s as date) + make_time(:h, 0, 0) + make_interval(mins => :m)) at time zone 'Asia/Singapore', 0, 'partner', :k, cast(:i as text[]) "
                          "where not exists (select 1 from market_events e where e.title = cast(:t as text) and e.kind = :k and e.starts_at > now())"),
                     {"t": title, "k": kind, "v": venue, "vk": vkind, "ad": addr, "a": area, "s": date.today() + timedelta(days=day), "h": hour, "m": mins, "i": "{" + ",".join(intents) + "}", "d": about})
    # going to the next two
    conn.execute(text("insert into market_event_goers (event_id, user_id) select e.id, cast(:u as uuid) from market_events e where e.kind = 'market_day' and e.starts_at > now() "
                      "and not exists (select 1 from market_event_goers g where g.event_id = e.id and g.user_id = cast(:u as uuid)) order by e.starts_at limit 2"), u)
    # a weekly tai chi reminder
    conn.execute(text("insert into calendar_items (person_id, created_by, kind, title, note, first_date, local_time, repeat, channel) select cast(:u as uuid), cast(:u as uuid), 'exercise', "
                      "'Tai chi at Tampines Park', 'Wear comfortable shoes.', :d, :t, 'weekly', 'app' where not exists (select 1 from calendar_items i where i.person_id = cast(:u as uuid) and i.title = 'Tai chi at Tampines Park')"),
                 {**u, "d": date.today() + timedelta(days=1), "t": time(7, 30)})
    for k, (body, read) in enumerate(NOTES):
        conn.execute(text("insert into notifications (user_id, body, status, dedupe_key, read_at) select cast(:u as uuid), :b, 'sent', :k, case when :r then now() end "
                          "where not exists (select 1 from notifications n where n.user_id = cast(:u as uuid) and n.dedupe_key = :k)"), {**u, "b": body, "k": f"uncle:{k}", "r": read})


def main(argv: list[str]) -> None:
    from .core.db import engine

    with engine().begin() as conn:
        ids = [str(r.id) for r in conn.execute(text("select id from users where email like 'uncle-tan-%@demo.wisdom.test' or email = 'uncle.tan@demo.wisdom.test'")).all()]
        for i in ids:
            seed_uncle(conn, i)
    print(f"filled {len(ids)} Uncle Tan accounts")
