"""The presentation's default person: Mr Lim Teck Seng, 65, a retired finance manager (over 35 years, the last 20 as finance manager of a logistics firm),
who lives in Tampines. "Demo: skip onboarding" on the first screen signs straight in as him (POST /v1/auth/lim-demo).

His story, everywhere in the app:
- Communities: he leads the Tampines Money Sense Circle (budgeting and CPF talks for neighbours), and plays xiangqi and walks with two Tampines groups;
  he went to their gatherings last week (leaves on his tree) and is going to what is coming up.
- Marketplace: going to the Tampines Hub Market Day, a xiangqi tournament and a money talk where he volunteers to speak; went to two events before.
- Wisdom (TEACH): budgeting, CPF and retirement planning, reading company accounts; invitations from Nurul and the Tampines Young Adults Network;
  mentoring Darren, a junior accountant (a chat, a session coming up, three completed sessions with scores). He has asked Sarah to teach him Python.
- His calendar (morning walk, xiangqi, a blood pressure check), his health card and a few notices.

It also gives the whole demo enough to recommend for every interest near Tampines: eight more communities, events for all eight interests, and an
elder to learn from for each. Real Singapore places, realistic names; every insert checks first, so this runs on every server start and every sign-in.
Dates are counted from today, so what is "coming up" stays coming up."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import Connection, text

SG = ZoneInfo("Asia/Singapore")
EMAIL = "lim.tecksng@demo.wisdom.test"
NAME = "Lim Teck Seng"
INTERESTS = ["walking", "chess", "teaching", "tech"]
WORK = ("Finance manager", 38)  # retired at 65 after 38 years: "over 35 years" in his own words


def _img(cat: str, i: int) -> str:
    import json
    from pathlib import Path

    cats = json.loads((Path(__file__).resolve().parents[1] / "seed_data" / "images.json").read_text(encoding="utf-8"))["by_category"]
    item = cats[cat][i]
    u = item["url"] if isinstance(item, dict) else item
    return u.split("?")[0] if "wikimedia.org" in u else u


def _at(days: int, hour: int, minute: int = 0) -> datetime:
    return datetime.combine(date.today() + timedelta(days=days), time(hour, minute), SG).astimezone(timezone.utc)


# ---------- communities near Tampines, one or more for every interest ----------
# slug, name, kind, icon, description, area, address, interests, cover (category, index), lead, members, target size,
# activities: (title, description, category, days from today, hour, hours, place, picture), one past gathering (title, days ago, hour, place)
COMMUNITIES = (
    ("tampines-money-sense-circle-demo", "Tampines Money Sense Circle", "club", "cash",
     "Neighbours helping neighbours with money: budgeting, CPF, scams to watch for, and planning for retirement. Plain words, no selling, never advice to buy anything.",
     "Tampines, Singapore", "Tampines West Community Club, 5 Tampines Avenue 3, Singapore 529705", ["teaching", "tech"], ("elders", 13), "LIM", ["Halimah binte Yusof", "Kelvin Chua", "Josephine Ng", "Murugan Selvam", "Angela Tay"], 64,
     (("Budgeting for young families", "Mr Lim walks through a simple monthly budget, then questions over kopi.", "Workshop", 3, 19, 2, "Tampines West Community Club", ("volunteer", 9)),
      ("CPF and retirement: what to know at 55", "Withdrawals, CPF LIFE and the questions people ask most, explained slowly.", "Talk", 10, 10, 2, "Tampines Regional Library, Level 3", ("elders", 13))),
     ("Spot the scam: a morning for seniors", 6, 10, "Tampines West Community Club")),
    ("tampines-xiangqi-chess-club-demo", "Tampines Xiangqi and Chess Club", "club", "extension-puzzle",
     "Xiangqi and chess under the void deck every week. Beginners welcome, boards provided, and the uncles are patient teachers.",
     "Tampines, Singapore", "Blk 201 Tampines Street 21, Singapore 520201", ["chess"], ("activity_social", 6), "Goh Eng Kiat", ["Lee Ah Kow", "Mohd Rafi bin Salleh", "Chong Wai Ming", "Ravi Shankar", "Teo Kim Huat"], 72,
     (("Void deck xiangqi night", "Friendly games and a short lesson on openings.", "Social", 2, 19, 3, "Blk 201 Tampines Street 21 void deck", ("activity_social", 9)),
      ("Chess puzzles with the grandchildren", "Bring a grandchild; we pair young and old over chess puzzles.", "Social", 9, 10, 2, "Our Tampines Hub, Level 2", ("activity_social", 7))),
     ("Void deck xiangqi night", 5, 19, "Blk 201 Tampines Street 21 void deck")),
    ("tampines-eco-green-walkers-demo", "Tampines Eco Green Walkers", "club", "walk",
     "An easy morning walk through Tampines Eco Green and Sun Plaza Park, then breakfast together. About 4 km, at a talking pace.",
     "Tampines, Singapore", "Tampines Eco Green, Tampines Avenue 12, Singapore", ["walking"], ("singapore_place", 1), "Tan Siew Choo", ["Abdul Karim bin Osman", "Lucy Fernandez", "Ng Boon Seng", "Wong Mei Ling", "Peter Sim"], 88,
     (("Sunrise walk at Tampines Eco Green", "Meet at the main entrance at 7 am; breakfast at the hawker centre after.", "Exercise", 1, 7, 2, "Tampines Eco Green main entrance", ("activity_exercise", 15)),
      ("Sun Plaza Park loop and kopi", "A gentle 3 km loop for new walkers.", "Exercise", 8, 7, 2, "Sun Plaza Park", ("elders", 14))),
     ("Sunrise walk at Tampines Eco Green", 4, 7, "Tampines Eco Green main entrance")),
    ("tampines-digital-kopi-demo", "Tampines Digital Kopi", "club", "phone-portrait",
     "Bring your phone and a question. Volunteers and patient seniors help with WhatsApp, e-payments, HealthHub and spotting scam messages.",
     "Tampines, Singapore", "Tampines Regional Library, 1 Tampines Walk, Singapore 528523", ["tech", "teaching"], ("elders", 2), "Jasmine Koh", ["Soh Chee Keong", "Fatimah binte Ali", "Daniel Lau", "Mary Thomas"], 53,
     (("Phone help corner", "One question at a time: WhatsApp, PayNow, photos and the HealthHub app.", "Workshop", 4, 14, 2, "Tampines Regional Library, Level 1", ("elders", 2)),
      ("Spotting scam messages on your phone", "Real examples, and what to do when a message looks wrong.", "Workshop", 11, 14, 2, "Tampines Regional Library, Level 1", ("volunteer", 9))), None),
    ("tampines-sing-along-friends-demo", "Tampines Sing-along Friends", "club", "musical-notes",
     "Old Mandarin, Malay, Tamil and English songs every Wednesday afternoon. No need to sing well, only to sing.",
     "Tampines, Singapore", "Tampines Changkat Community Club, 13 Tampines Street 11, Singapore 529453", ["music"], ("activity_social", 13), "Kamala Devi", ["Yeo Siew Hong", "Rosli bin Ahmad", "Ho Kim Lian", "Joseph Pereira"], 61,
     (("Golden oldies sing-along", "Song sheets in four languages; tea after.", "Social", 5, 15, 2, "Tampines Changkat Community Club", ("activity_social", 14)),
      ("Guitar circle for beginners", "Three chords and a song by the end of the afternoon.", "Workshop", 12, 15, 2, "Tampines Changkat Community Club", ("wisdom_share", 6))), None),
    ("tampines-rooftop-growers-demo", "Tampines Rooftop Growers", "club", "leaf",
     "A community garden on the rooftop of a multi-storey car park: chilli, kangkong, pandan and herbs, shared with the neighbours.",
     "Tampines, Singapore", "Blk 489 Tampines Street 45 rooftop garden, Singapore 520489", ["gardening"], ("market", 15), "Ismail bin Hassan", ["Lim Bee Hoon", "Shanthi Rajan", "Ong Kok Wah", "Grace Low"], 47,
     (("Planting morning: chilli and pandan", "Gloves and tools provided; take home a cutting.", "Workshop", 3, 8, 2, "Blk 489 rooftop garden", ("market", 8)),
      ("Harvest and share", "Harvest together and share the greens with the block.", "Social", 13, 8, 2, "Blk 489 rooftop garden", ("market", 15))), None),
    ("tampines-kueh-and-kopi-cooks-demo", "Tampines Kueh and Kopi Cooks", "club", "restaurant",
     "Home cooks sharing family recipes: kueh, curry, soups and dishes from every community in Singapore.",
     "Tampines, Singapore", "Tampines North Community Club, 2 Tampines Street 41, Singapore 529204", ["cooking"], ("activity_cooking", 6), "Rosnah binte Ismail", ["Tan Ah Moi", "Lakshmi Iyer", "Chew Lay Hoon", "Norhayati binte Kassim"], 69,
     (("Kueh lapis morning", "Learn to layer kueh lapis and take a tray home.", "Workshop", 6, 9, 3, "Tampines North Community Club", ("activity_cooking", 9)),
      ("Family soups for cooler days", "Three soups, three families, one pot each.", "Workshop", 14, 9, 3, "Tampines North Community Club", ("activity_cooking", 1))), None),
    ("tampines-park-tai-chi-demo", "Tampines Park Tai Chi", "club", "body",
     "Yang-style tai chi in the park at 7 am, six days a week. Slow, gentle and good for balance.",
     "Tampines, Singapore", "Tampines Central Park, Tampines Avenue 4, Singapore", ["taichi", "walking"], ("activity_exercise", 4), "Ong Siew Lan", ["Chia Hock Lye", "Mariam binte Said", "Lee Chee Meng", "Doris Tan"], 95,
     (("Tai chi for beginners", "The first eight movements, slowly; stand at the back and follow.", "Exercise", 2, 7, 1, "Tampines Central Park", ("activity_exercise", 3)),
      ("Tai chi fan form", "For those who know the basic form.", "Exercise", 9, 7, 1, "Tampines Central Park", ("activity_exercise", 2))), None),
)
LIM_GROUPS = ("tampines-money-sense-circle-demo", "tampines-xiangqi-chess-club-demo", "tampines-eco-green-walkers-demo")


def _user(conn: Connection, email: str, name: str, band: str = "60plus", area: str = "Tampines") -> str:
    uid = conn.execute(text("select id from users where email = :e"), {"e": email}).scalar()
    if uid is None:
        uid = conn.execute(text("insert into users (email, display_name, age_band, area_name, language) values (:e, :n, :b, :a, 'en') returning id"),
                           {"e": email, "n": name, "b": band, "a": area}).scalar()
    return str(uid)


def _handle(name: str, slug: str) -> str:
    from .seed_demo import _handle as h

    return h(name, slug)


def seed_communities(conn: Connection, lim: str) -> dict[str, str]:
    from .seed_demo import LEAD, _role, fill

    ids: dict[str, str] = {}
    for n, (slug, name, kind, icon, desc, area, address, interests, cover, lead, members, target, acts, _past) in enumerate(COMMUNITIES):
        cid = conn.execute(text("select id from communities where slug = :s"), {"s": slug}).scalar()
        lead_id = lim if lead == "LIM" else _user(conn, _handle(lead, slug), lead)
        if cid is None:
            cid = conn.execute(text(
                "insert into communities (name, slug, kind, icon, description, area_name, address, interests, cover_url, privacy, invite_code, is_demo, created_by) values "
                "(:n, :s, :k, :i, :d, :a, :ad, cast(:it as text[]), :cv, 'open', :c, true, :u) returning id"),
                {"n": name, "s": slug, "k": kind, "i": icon, "d": desc, "a": area, "ad": address, "it": interests, "cv": _img(*cover), "c": f"TAMP-{n + 1:02d}", "u": lead_id}).scalar()
            people = [lead_id] + [_user(conn, _handle(m, slug), m) for m in members]
            for u in people:
                conn.execute(text("insert into memberships (community_id, user_id) values (:c, :u) on conflict do nothing"), {"c": cid, "u": u})
            conn.execute(text("insert into role_terms (community_id, role_definition_id, user_id, starts_on, ends_on) values (:c, :d, :u, :s, :e)"),
                         {"c": cid, "d": _role(conn, cid, LEAD).id, "u": lead_id, "s": date.today() - timedelta(days=200), "e": date.today() + timedelta(days=165)})
            fill(conn, cid, target, 700 + n)
        ids[slug] = str(cid)
        # what is coming up: made again from today whenever the last one has passed, so the demo always has something next
        for title, about, cat, days, hour, hours, place, pic in acts:
            if conn.execute(text("select 1 from activities where community_id = :c and title = :t and starts_at > now() and status = 'scheduled'"), {"c": cid, "t": title}).first():
                continue
            start = _at(days, hour)
            aid = conn.execute(text("insert into activities (community_id, organiser_id, title, description, category, starts_at, ends_at, location, capacity, image_url) values "
                                    "(:c, :o, :t, :d, :cat, :s, :e, :l, null, :img) returning id"),
                               {"c": cid, "o": lead_id, "t": title, "d": about, "cat": cat, "s": start, "e": start + timedelta(hours=hours), "l": place, "img": _img(*pic)}).scalar()
            conn.execute(text("insert into activity_participants (activity_id, user_id) select :a, m.user_id from memberships m where m.community_id = :c and m.status = 'active' "
                              "order by md5(m.user_id::text || :t) limit 7 on conflict do nothing"), {"a": aid, "c": cid, "t": title})
    return ids


def seed_lim_groups(conn: Connection, lim: str, ids: dict[str, str]) -> None:
    from .modules.nodes import feed

    for slug in LIM_GROUPS:
        conn.execute(text("insert into memberships (community_id, user_id) values (:c, :u) on conflict do nothing"), {"c": ids[slug], "u": lim})
        conn.execute(text("update memberships set status = 'active' where community_id = :c and user_id = :u"), {"c": ids[slug], "u": lim})
    # going to everything coming up in his three groups
    conn.execute(text("insert into activity_participants (activity_id, user_id) select a.id, :u from activities a where a.community_id = any(cast(:c as uuid[])) "
                      "and a.starts_at > now() and a.status = 'scheduled' on conflict do nothing"), {"u": lim, "c": [ids[s] for s in LIM_GROUPS]})
    # last week's gatherings he checked in at (each a leaf on his tree), made once
    for slug, name, *_rest, past in [c for c in COMMUNITIES if c[0] in LIM_GROUPS]:
        title, ago, hour, place = past
        cid = ids[slug]
        aid = conn.execute(text("select id from activities where community_id = :c and title = :t and starts_at < now() order by starts_at desc limit 1"), {"c": cid, "t": title}).scalar()
        if aid is None:
            start = _at(-ago, hour)
            aid = conn.execute(text("insert into activities (community_id, organiser_id, title, description, category, starts_at, ends_at, location, status) values "
                                    "(:c, :u, :t, '', 'Social', :s, :e, :l, 'scheduled') returning id"),
                               {"c": cid, "u": lim, "t": title, "s": start, "e": start + timedelta(hours=2), "l": place}).scalar()
        at = conn.execute(text("select starts_at from activities where id = :a"), {"a": aid}).scalar()
        conn.execute(text("insert into activity_participants (activity_id, user_id, status, checked_in_at, checked_in_by) values (:a, :u, 'going', :at, :u) "
                          "on conflict (activity_id, user_id) do update set checked_in_at = coalesce(activity_participants.checked_in_at, excluded.checked_in_at)"),
                     {"a": aid, "u": lim, "at": at})
        feed.showed_up(conn, lim, "community", str(aid), title, at, source_name=name)


# ---------- the Marketplace: something for every interest, near Tampines ----------
# title, kind, venue, venue kind, address, area, days from today, hour, minutes, intents, interests, about, cover
EVENTS = (
    ("Tampines Hub Market Day", "market_day", "Our Tampines Hub", "community_centre", "1 Tampines Walk, Singapore 528523", "Tampines", 5, 9, 300, ("earn", "enjoy"), ("cooking", "gardening"),
     "Stalls from neighbours: home cooking, crafts and plants. Host a stall or come and share a skill.", ("market", 9)),
    ("Xiangqi friendly tournament", "activity", "Our Tampines Hub, Level 2", "community_centre", "1 Tampines Walk, Singapore 528523", "Tampines", 6, 14, 180, ("enjoy",), ("chess",),
     "Friendly rounds for every level, with a short lesson for beginners. Boards provided.", ("activity_social", 9)),
    ("Money talk: budgeting for young families", "volunteer", "Tampines West Community Club", "community_centre", "5 Tampines Avenue 3, Singapore 529705", "Tampines", 8, 19, 120, ("volunteer", "contribute"), ("teaching",),
     "Volunteer speakers share how they budgeted for a family. Experience, not financial advice. Speakers and helpers welcome.", ("volunteer", 9)),
    ("Smartphone help corner", "volunteer", "Tampines Regional Library", "other", "1 Tampines Walk, Singapore 528523", "Tampines", 3, 14, 120, ("volunteer", "contribute"), ("tech", "teaching"),
     "Help seniors with WhatsApp, e-payments and HealthHub, one question at a time. A short briefing first.", ("elders", 2)),
    ("Sunrise heritage walk: old Tampines", "activity", "Tampines Eco Green", "other", "Tampines Avenue 12, Singapore", "Tampines", 4, 7, 120, ("enjoy",), ("walking",),
     "A 4 km walk past the old kampung sites, with stories from people who grew up there.", ("singapore_place", 1)),
    ("Plant swap and seedling sale", "market_day", "Tampines Central Community Club", "community_centre", "866A Tampines Street 83, Singapore 521866", "Tampines", 7, 9, 240, ("enjoy", "earn"), ("gardening",),
     "Bring a cutting, take a cutting. Seniors' stalls with herbs, chilli and orchids.", ("market", 8)),
    ("Kueh making class", "activity", "Tampines North Community Club", "community_centre", "2 Tampines Street 41, Singapore 529204", "Tampines", 9, 9, 180, ("enjoy",), ("cooking",),
     "Learn ondeh-ondeh and kueh salat from a home cook with forty years of practice.", ("activity_cooking", 6)),
    ("Golden oldies concert", "show", "Tampines Changkat Community Club", "community_centre", "13 Tampines Street 11, Singapore 529453", "Tampines", 10, 15, 120, ("enjoy",), ("music",),
     "Songs from the 60s and 70s by a seniors' band. Singing along is encouraged.", ("activity_social", 13)),
    ("Tai chi at Tampines Park", "activity", "Tampines Central Park", "other", "Tampines Avenue 4, Singapore", "Tampines", 1, 7, 60, ("enjoy",), ("taichi", "walking"),
     "A gentle morning session for all ages. Wear comfortable shoes.", ("activity_exercise", 4)),
    ("Reading buddies for primary pupils", "volunteer", "Tampines North Community Club", "community_centre", "2 Tampines Street 41, Singapore 529204", "Tampines", 11, 15, 90, ("volunteer", "contribute"), ("teaching",),
     "Read with a primary school pupil for an hour after school. Training given.", ("elders", 13)),
)
LIM_GOING = ("Tampines Hub Market Day", "Xiangqi friendly tournament", "Money talk: budgeting for young families")
# what he went to before (each "I went" a leaf): title, days ago, hour, area, interests
LIM_WENT = (("Pasir Ris seniors' carnival", 9, 10, "Pasir Ris", ("enjoy",), ("music", "cooking")),
            ("Bedok xiangqi open", 16, 14, "Bedok", ("enjoy",), ("chess",)))
# interests for the events seeded earlier (Uncle Tan's EXTRAS and market days), so recommendations by interest find them
OLDER = {"Kopi and kueh morning": ["cooking"], "Nostalgic songs afternoon": ["music"], "Befriender training and weekly calls": ["teaching"],
         "Meal delivery for homebound seniors": ["cooking"], "Heritage walk guide for school groups": ["walking", "teaching"], "Bedok Mall Sunday market": ["cooking", "gardening"],
         "Tampines Kampung Market Day": ["cooking", "gardening"]}


def seed_market(conn: Connection, lim: str) -> None:
    from .modules.nodes import feed

    for title, kind, venue, vkind, addr, area, days, hour, mins, intents, interests, about, cover in EVENTS:
        start = _at(days, hour)
        conn.execute(text(
            "insert into market_events (title, description, venue_name, venue_kind, address, area_name, starts_at, ends_at, stalls_total, source, kind, intents, interests, cover_url) "
            "select cast(:t as text), :d, :v, :vk, :ad, :a, :s, :e, :st, 'partner', :k, cast(:i as text[]), cast(:it as text[]), :cv "
            "where not exists (select 1 from market_events e where e.title = cast(:t as text) and e.starts_at > now() and e.status = 'scheduled')"),
            {"t": title, "d": about, "v": venue, "vk": vkind, "ad": addr, "a": area, "s": start, "e": start + timedelta(minutes=mins), "st": 16 if kind == "market_day" else 0,
             "k": kind, "i": list(intents), "it": list(interests), "cv": _img(*cover)})
        conn.execute(text("update market_events set interests = cast(:it as text[]) where title = :t and coalesce(array_length(interests, 1), 0) = 0"), {"t": title, "it": list(interests)})
    for title, keys in OLDER.items():
        conn.execute(text("update market_events set interests = cast(:it as text[]) where title = :t and coalesce(array_length(interests, 1), 0) = 0"), {"t": title, "it": keys})
    conn.execute(text("insert into market_event_goers (event_id, user_id) select e.id, :u from market_events e where e.title = any(:t) and e.starts_at > now() and e.status = 'scheduled' "
                      "and not exists (select 1 from market_event_goers g where g.event_id = e.id and g.user_id = :u)"), {"u": lim, "t": list(LIM_GOING)})
    for title, ago, hour, area, intents, interests in LIM_WENT:
        eid = conn.execute(text("select id from market_events where title = :t order by starts_at desc limit 1"), {"t": title}).scalar()
        if eid is None:
            start = _at(-ago, hour)
            eid = conn.execute(text("insert into market_events (title, description, venue_name, venue_kind, address, area_name, starts_at, ends_at, stalls_total, source, kind, intents, interests) "
                                    "values (:t, 'A day out for seniors and their families.', :a, 'community_centre', :a, :a, :s, :e, 0, 'partner', 'activity', cast(:i as text[]), cast(:it as text[])) returning id"),
                               {"t": title, "a": area, "s": start, "e": start + timedelta(hours=4), "i": list(intents), "it": list(interests)}).scalar()
        at = conn.execute(text("select starts_at from market_events where id = :e"), {"e": eid}).scalar()
        conn.execute(text("insert into market_event_goers (event_id, user_id) select :e, :u where not exists (select 1 from market_event_goers g where g.event_id = :e and g.user_id = :u)"), {"e": eid, "u": lim})
        conn.execute(text("insert into market_event_attendance (event_id, user_id, attended, source) values (:e, :u, true, 'app') on conflict do nothing"), {"e": eid, "u": lim})
        feed.showed_up(conn, lim, "market", str(eid), title, at, source_name=area)


# ---------- Wisdom: an elder to learn from for every interest, and Lim's own Teach side ----------
# email local part, name, area, offer title, about, field, years, topics (interest keys first), languages, availability
ELDERS = (
    ("ong.siewlan", "Ong Siew Lan", "Tampines", "Tai chi for beginners",
     "I have taught Yang-style tai chi in Tampines Central Park for twenty years. We start slowly, with balance and breathing.", "Tai chi instructor", 20,
     ["taichi", "hobbies", "exercise"], ["Mandarin", "English"], "Weekday mornings"),
    ("rosnah.ismail", "Rosnah binte Ismail", "Tampines", "Kueh and family cooking",
     "Forty years of cooking for my family and for weddings in the kampung. Kueh, rendang and the small tricks nobody writes down.", "Home caterer", 40,
     ["cooking", "hobbies"], ["Malay", "English"], "Saturday mornings"),
    ("goh.engkiat", "Goh Eng Kiat", "Tampines", "Xiangqi and chess",
     "Twenty-five years coaching xiangqi and chess to children and adults. Openings, endgames, and how to enjoy losing.", "Chess coach", 25,
     ["chess", "hobbies"], ["Mandarin", "Hokkien", "English"], "Weekday evenings"),
    ("rajendran.pillai", "Rajendran Pillai", "Pasir Ris", "Guitar and old songs",
     "A music teacher for 35 years. Three chords to start, then the Tamil, Hindi and English songs you grew up with.", "Music teacher", 35,
     ["music", "hobbies"], ["Tamil", "English"], "Tuesday and Thursday afternoons"),
    ("tan.ahhock", "Tan Ah Hock", "Tampines", "Heritage walks of old Tampines",
     "I grew up in the Tampines kampung before the new town. I guide walks and tell what the places used to be.", "Former bus captain and walk guide", 30,
     ["walking", "hobbies"], ["Hokkien", "Mandarin", "English"], "Weekend mornings"),
    ("lee.meilan", "Lee Mei Lan", "Tampines", "Reading and homework help",
     "A primary school teacher for 33 years. Patient reading practice and homework help, for children and for parents who want to help at home.", "Primary school teacher", 33,
     ["teaching", "language"], ["English", "Mandarin"], "Weekday afternoons"),
)
# interest keys added to the topics of the elders seeded before (seed_wisdom_teach), so a recommendation by interest finds them
TOPICS = {"Excel and Python for work": ["tech"], "Gardening and painting": ["gardening"], "Interview Prep": ["teaching"]}

LIM_PROFILE = {"expertise": "Budgeting, CPF and retirement planning, reading company accounts", "days": "Mon-Fri", "start_time": "10:00", "end_time": "16:00",
               "bio": "Thirty-eight years in finance, the last twenty as finance manager of a logistics firm. Now retired in Tampines, I like helping young people "
                      "understand money and accounts. I share my experience; I do not give financial advice."}
LIM_OFFER = ("Budgeting, CPF and reading company accounts",
             "Retired finance manager, 38 years. Plain-words help with a household budget, CPF and how to read a company's annual report. My experience, not financial advice.")
NURUL = ("nurul.huda", "Nurul Huda", "under40", "Tampines")
YAN = ("joel.tan.yan", "Joel Tan", "under40", "Tampines")  # asks for the Tampines Young Adults Network
DARREN = ("darren.ng", "Darren Ng", "under40", "Simei")
CHAT = (("learner", "Good morning Mr Lim! I finished the reading on cash flow statements. Can we go through the questions at the end?"),
        ("mentor", "Good morning Darren. Yes, bring them. We will also look at a real annual report so you see it in practice."),
        ("learner", "Thank you. Should I print the report or bring my laptop?"),
        ("mentor", "Laptop is fine. Mark the pages you find hard, and we start there."))
DONE = (("Reading a company's annual report", 24, 5, "Mr Lim made the balance sheet finally make sense. He used examples from his own career."),
        ("Budgeting for my first flat", 17, 5, "Very practical. We built a budget for my BTO flat together and I still use it."),
        ("Preparing for the CPA exams", 10, 4, "Good study plan and honest about the hard parts. I would like more practice questions next time."))


def seed_wisdom(conn: Connection, lim: str) -> None:
    from .modules.nodes import feed
    from .modules.wisdom import service as wisdom
    from .modules.wisdom import teach
    from .seed_wisdom_teach import _connection, _next_weekday_at, _person

    for local, name, area, title, about, field, years, topics, languages, when in ELDERS:
        uid = _person(conn, local, name, "60plus", area)
        if not conn.execute(text("select 1 from wisdom_offers where user_id = :u and title = :t"), {"u": uid, "t": title}).first():
            wisdom.create_offer(conn, uid, {"title": title, "about": about, "kind": "mentoring", "mode": "volunteer", "domain": "social",
                                            "availability": when, "proof_field": field, "proof_years": years, "topics": topics, "languages": languages})
        if not conn.execute(text("select 1 from wisdom_teaching_profiles where user_id = :u"), {"u": uid}).first():
            conn.execute(text("insert into wisdom_teaching_profiles (user_id, expertise, bio, days, start_time, end_time) values (:u, :e, :b, 'Mon-Sat', '09:00', '17:00')"),
                         {"u": uid, "e": title, "b": about})
    for title, keys in TOPICS.items():
        for k in keys:
            conn.execute(text("update wisdom_offers set topics = array_append(topics, cast(:k as text)) where title = :t and not (cast(:k as text) = any(coalesce(topics, '{}')))"), {"t": title, "k": k})

    # Lim's Teach side
    if not conn.execute(text("select 1 from wisdom_teaching_profiles where user_id = :u"), {"u": lim}).first():
        teach.save_teaching_profile(conn, lim, LIM_PROFILE)
    if not conn.execute(text("select 1 from wisdom_offers where user_id = :u"), {"u": lim}).first():
        wisdom.create_offer(conn, lim, {"title": LIM_OFFER[0], "about": LIM_OFFER[1], "kind": "mentoring", "mode": "volunteer", "domain": "professional",
                                        "availability": "Weekdays, 10 am to 4 pm", "proof_field": WORK[0], "proof_years": WORK[1],
                                        "topics": ["teaching", "career", "finance", "budgeting"], "languages": ["English", "Mandarin"]})
    nurul, joel, darren = (_person(conn, *p) for p in (NURUL, YAN, DARREN))
    _connection(conn, lim, nurul, "pending", "Budgeting", "Hello Mr Lim, I just started my first job. Could you help me make a budget I can keep to?", ago_days=1)
    _connection(conn, lim, joel, "pending", "Personal finance basics", "Our young adults group would love a talk on budgeting, CPF and avoiding scams.", ("Tampines Young Adults Network", 18), ago_days=2)
    active = _connection(conn, lim, darren, "accepted", "Finance Career Mentoring", "I am a junior accountant. Could you mentor me as I prepare for my CPA exams?", ago_days=35)
    if not conn.execute(text("select 1 from wisdom_messages where connection_id = :c"), {"c": active}).first():
        start = datetime.now(timezone.utc) - timedelta(hours=20)
        for k, (who, body) in enumerate(CHAT):
            conn.execute(text("insert into wisdom_messages (connection_id, sender_id, body, created_at, read_at) values (:c, :s, :b, :at, :at)"),
                         {"c": active, "s": darren if who == "learner" else lim, "b": body, "at": start + timedelta(minutes=12 * k)})
    conn.execute(text("update wisdom_meetings set status = 'cancelled' where connection_id = :c and status = 'scheduled' and starts_at < now() - interval '12 hours'"), {"c": active})
    if not conn.execute(text("select 1 from wisdom_meetings where connection_id = :c and status = 'scheduled'"), {"c": active}).first():
        conn.execute(text("insert into wisdom_meetings (connection_id, title, starts_at, minutes, place, created_by) values (:c, 'Cash flow statements', :s, 60, "
                          "'Tampines Regional Library, Level 3 discussion room', :u)"), {"c": active, "s": _next_weekday_at(11), "u": lim})
    for title, ago, score, note in DONE:
        if conn.execute(text("select 1 from wisdom_meetings where connection_id = :c and title = :t"), {"c": active, "t": title}).first():
            continue
        at = datetime.combine(date.today() - timedelta(days=ago), time(15, 0), SG).astimezone(timezone.utc)
        sid = conn.execute(text("insert into wisdom_sessions (connection_id, logged_by, minutes, occurred_at) values (:c, :u, 60, :at) returning id"), {"c": active, "u": lim, "at": at}).scalar()
        mid = conn.execute(text("insert into wisdom_meetings (connection_id, title, starts_at, minutes, place, status, completed_at, session_id, created_by) "
                                "values (:c, :t, :at, 60, 'Tampines Regional Library', 'completed', :at + interval '1 hour', :s, :u) returning id"),
                           {"c": active, "t": title, "at": at, "s": sid, "u": lim}).scalar()
        conn.execute(text("insert into wisdom_reviews (meeting_id, learner_id, score, note, created_at) values (:m, :l, :sc, :n, :at + interval '2 hours')"),
                     {"m": mid, "l": darren, "sc": score, "n": note, "at": at})
        feed.showed_up(conn, lim, "wisdom", str(mid), title, at, source_name="Darren")
        feed.showed_up(conn, darren, "wisdom", str(mid), title, at, source_name="Lim")
    # he wants to learn Python, and has asked Sarah
    conn.execute(text("insert into wisdom_connections (mentor_id, learner_id, initiated_by, offer_id, message, status, topic) select o.user_id, :u, :u, o.id, "
                      "'Hello Sarah, I used Excel for 38 years and would like to learn Python for my spreadsheets.', 'pending', o.title from wisdom_offers o "
                      "where o.title = 'Excel and Python for work' and o.status = 'active' and not exists (select 1 from wisdom_connections k where k.learner_id = :u and k.offer_id = o.id) limit 1"),
                 {"u": lim})


# ---------- his own things: calendar, health card, notices ----------
CALENDAR = (("exercise", "Morning walk at Tampines Eco Green", "With the Eco Green Walkers. Bring water.", 1, time(6, 45), "weekly"),
            ("event", "Xiangqi at Blk 201", "Friendly games with Mr Goh.", 2, time(19, 0), "weekly"),
            ("appointment", "Blood pressure check, Tampines Polyclinic", "Bring the readings book.", 9, time(9, 30), "none"))
NOTES = (("Darren confirmed your session on cash flow statements.", False),
         ("Nurul would like to learn budgeting from you. Open Wisdom to reply.", False),
         ("Welcome, Mr Lim. Your groups, your learners and the events near you are ready.", True))


def seed_personal(conn: Connection, lim: str) -> None:
    for kind, title, note, days, at, repeat in CALENDAR:
        conn.execute(text("insert into calendar_items (person_id, created_by, kind, title, note, first_date, local_time, repeat, channel) select :u, :u, :k, :t, :n, :d, :at, :r, 'app' "
                          "where not exists (select 1 from calendar_items i where i.person_id = :u and i.title = :t)"),
                     {"u": lim, "k": kind, "t": title, "n": note, "d": date.today() + timedelta(days=days), "at": at, "r": repeat})
    conn.execute(text("insert into health_cards (user_id, blood_group, conditions, medicines, allergies, contact_name, contact_phone) values "
                      "(:u, 'O+', 'High blood pressure (controlled)', 'Amlodipine 5 mg, every morning', 'Penicillin', 'Lim Wei Jie (son)', '+65 9123 4567') on conflict (user_id) do nothing"), {"u": lim})
    for k, (body, read) in enumerate(NOTES):
        conn.execute(text("insert into notifications (user_id, body, status, dedupe_key, read_at) select :u, :b, 'sent', :k, case when :r then now() end "
                          "where not exists (select 1 from notifications n where n.user_id = :u and n.dedupe_key = :k)"), {"u": lim, "b": body, "k": f"lim:{k}", "r": read})


def ensure_lim(conn: Connection):
    """Makes Mr Lim once, with every first question already answered, then tops up his story and the demo's data (safe to run on every start and sign-in).
    Returns his user row."""
    from .modules.onboarding import service as onboarding

    user = conn.execute(text("select * from users where email = :e"), {"e": EMAIL}).first()
    if user is None:
        user = conn.execute(text("insert into users (email, display_name, age_band, area_name, language, spoken_languages) values (:e, :n, '60plus', 'Tampines', 'en', :l) returning *"),
                            {"e": EMAIL, "n": NAME, "l": ["en", "zh"]}).one()
        me = str(user.id)
        onboarding.answer(conn, me, "purpose", {"roles": ["connect", "share", "learn"]})
        onboarding.answer(conn, me, "basics", {"country": "SG", "age_band": "60plus", "area_name": "Tampines"})
        onboarding.answer(conn, me, "interests", {"interests": INTERESTS})
        onboarding.answer(conn, me, "share", {"field": WORK[0], "years": WORK[1], "skills": ["Budgeting", "CPF and retirement planning", "Reading company accounts"]})
        onboarding.answer(conn, me, "learn", {"age_15_plus": True, "topics": ["Python"]})
        onboarding.answer(conn, me, "channels", {"preferred_channel": "app"})
        onboarding.answer(conn, me, "consent", {"privacy": True, "terms": True})
        user = conn.execute(text("select * from users where id = :u"), {"u": me}).one()
    lim = str(user.id)
    for part in (lambda: seed_lim_groups(conn, lim, seed_communities(conn, lim)), lambda: seed_market(conn, lim), lambda: seed_wisdom(conn, lim), lambda: seed_personal(conn, lim)):
        try:
            with conn.begin_nested():  # one part failing never stops the sign-in or the others
                part()
        except Exception:
            import logging

            logging.getLogger("uvicorn.error").exception("Lim demo seed part failed")
    return user


def main(argv: list[str]) -> None:
    from .core.db import engine

    with engine().begin() as conn:
        ensure_lim(conn)
    print("Mr Lim and the demo data are ready")
