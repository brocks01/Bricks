"""Seeds Wisdom with a realistic, matured Singapore: real Active Ageing Centres (as circles under their operators), circles of every feeling, about a
thousand people of fifteen shapes with real-sounding names, six months of gatherings, Wisdom stories, offers and requests, and market days.

  python backend/run.py seed-wisdom            # writes to the database in backend/.env, in ONE transaction (all or nothing)
  python backend/run.py seed-wisdom --reset    # removes exactly what this script wrote

Everything it writes is tagged so it can always be removed: people use the address domain @seed.wisdom.test (they cannot sign in), circles and market events
carry external_ref 'seed:...'. Sources of the real data (centres, programmes, names, funding, images with credits) are in backend/seed_data/*.json."""
import json
import random
import re
import sys
import uuid
import zlib
from datetime import datetime, timedelta, timezone
from pathlib import Path

from psycopg2.extras import execute_values
from sqlalchemy import text

from .core.db import engine
from .modules.onboarding.rules import INTEREST_KEYS

DATA = Path(__file__).resolve().parents[1] / "seed_data"
DOMAIN = "seed.wisdom.test"
REF = "seed:"
rng = random.Random(2026)
NOW = datetime.now(timezone.utc)
PEOPLE = 1000


def load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def uid() -> str:
    return str(uuid.uuid4())


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:56]


def ins(cur, table: str, cols: list[str], rows: list, tmpl: str | None = None) -> None:
    if rows:
        execute_values(cur, f"insert into {table} ({','.join(cols)}) values %s", rows, template=tmpl, page_size=500)


def days(n: float) -> datetime:
    return NOW + timedelta(days=n)


# ---- pictures: the verified list, by category (Wikimedia with credit, or the Unsplash ones the app already uses) ----
_IMG = load("images.json")["by_category"]


def pic(category: str, key: str) -> str | None:
    lst = _IMG.get(category) or []
    if not lst:
        return None
    item = lst[zlib.crc32(key.encode()) % len(lst)]
    url = item["url"] if isinstance(item, dict) else item
    return url.split("?")[0] if "wikimedia.org" in url else url


# ---- people: names by community and age, fifteen shapes ----
NAMES = load("names.json")
GROUPS = [("chinese", 74), ("malay", 13), ("indian_tamil", 7), ("indian_north", 2), ("english_eurasian", 2), ("korean", 2)]
LANGS = {  # group -> (app language, spoken languages)
    "chinese": ("en", ["en", "zh", "nan"]), "malay": ("ms", ["ms", "en"]), "indian_tamil": ("ta", ["ta", "en"]),
    "indian_north": ("hi", ["hi", "bho", "en"]), "english_eurasian": ("en", ["en"]), "korean": ("en", ["en"]),
}
BAND_KEY = {"60plus": "elder", "40to59": "middle", "under40": "young"}

# id -> weight, age band, gender (None = either), roles, share chance, engagement tiers (very_high, high, steady, gentle), likes (words in a circle's name or tags)
SHAPES = {
    "retired_regular": dict(w=22, band="60plus", gender=None, roles=["connect"], share=0.5, tier=(30, 45, 20, 5), likes=["tai chi", "walk", "chess", "garden", "kopi"]),
    "aunty_cook": dict(w=11, band="60plus", gender="woman", roles=["connect", "share"], share=1, tier=(40, 40, 15, 5), likes=["cook", "kueh", "craft", "sing"]),
    "quiet_widow": dict(w=8, band="60plus", gender="woman", roles=["connect"], share=0, tier=(0, 10, 30, 60), likes=["sing", "craft", "tea"]),
    "men_kaki": dict(w=9, band="60plus", gender="man", roles=["connect"], share=0.4, tier=(25, 45, 25, 5), likes=["chess", "kopi", "fish", "walk"]),
    "centre_leader": dict(w=5, band="60plus", gender=None, roles=["connect", "share"], share=1, tier=(80, 20, 0, 0), likes=["lead", "craft", "sing", "tai chi"]),
    "homebound_elder": dict(w=5, band="60plus", gender=None, roles=["connect"], share=0, tier=(0, 0, 20, 80), likes=["story", "sing"]),
    "active_volunteer": dict(w=10, band="40to59", gender=None, roles=["help", "connect"], share=0.2, tier=(50, 35, 15, 0), likes=["volunteer", "garden", "walk"]),
    "helper_daughter": dict(w=9, band="40to59", gender="woman", roles=["care"], share=0, tier=(10, 40, 40, 10), likes=["family"]),
    "far_from_home": dict(w=5, band="40to59", gender=None, roles=["connect"], share=0, tier=(15, 40, 35, 10), likes=["festival"]),
    "korean_expatriate": dict(w=4, band="40to59", gender=None, roles=["connect"], share=0, tier=(10, 40, 40, 10), likes=["dance"]),
    "student_learner": dict(w=4, band="under40", gender=None, roles=["learn"], share=0, tier=(10, 30, 40, 20), likes=["tech"]),
    "career_switcher": dict(w=2, band="under40", gender=None, roles=["learn"], share=0, tier=(10, 40, 40, 10), likes=["tech"]),
    "expecting_parent": dict(w=2, band="under40", gender=None, roles=["learn"], share=0, tier=(10, 40, 40, 10), likes=["family"]),
    "young_helper_teen": dict(w=2, band="under40", gender=None, roles=["help"], share=0, tier=(20, 40, 30, 10), likes=["tech", "volunteer"]),
    "new_migrant_worker": dict(w=2, band="under40", gender=None, roles=["help", "connect"], share=0, tier=(25, 40, 25, 10), likes=["volunteer", "tech"]),
}
TIERS = ["very_high", "high", "steady", "gentle"]
PLACES = load("places-languages.json")["towns"]
CENTRES = load("centres.json")
PROGRAMMES = load("programmes.json")["programmes"]


def person_name(group: str, band: str, gender: str) -> str:
    g = NAMES[group]
    male = gender == "man"
    if group == "korean":
        return f"{rng.choice(g['surnames'])} {rng.choice(g['given_male' if male else 'given_female'])}"
    given = rng.choice(g[f"{BAND_KEY[band]}_given_{'male' if male else 'female'}"])
    if group == "chinese":
        return f"{rng.choice(g['surnames'])} {given}"
    if group == "malay":
        return f"{given} {'bin' if male else 'binte'} {rng.choice(g['elder_given_male'])}"
    return f"{given} {rng.choice(g['surnames'])}"


# ---- circles by feeling (origin, faith, place, life, interest); audience men/women where the circle is for one ----
# name, feeling, audience, icon, one line, when they meet, who comes (words matched to shapes), origin tags
CIRCLES = [
    ("Bihari in Singapore", "origin", "all", "home", "Chhath, litti chokha and the sound of home, far from Bihar. Bhojpuri and Hindi spoken here.", "First Sunday, Little India", ["festival"], ["indian_north"]),
    ("Tamil Heritage Kakis", "origin", "all", "book", "Tamil stories, music and food, passed from the old to the young.", "Saturdays, Serangoon", ["story", "sing"], ["indian_tamil"]),
    ("Hokkien Kopi Corner", "origin", "all", "cafe", "Speak Hokkien, drink kopi, tell the old stories. Everyone welcome.", "Weekday mornings, Geylang", ["kopi", "story"], ["chinese"]),
    ("Teochew Opera and Tea", "origin", "all", "musical-notes", "Teochew opera afternoons and tea for lovers of the old songs.", "Fridays, Chinatown", ["sing"], ["chinese"]),
    ("Malay Kampung Spirit", "origin", "all", "people", "Kampung games, kuih and gotong-royong, as it was.", "Saturday mornings", ["kuih", "cook"], ["malay"]),
    ("Peranakan Table", "origin", "all", "restaurant", "Nyonya cooking, beadwork and the stories behind the dishes.", "Second Sunday, Katong", ["cook", "kueh", "craft"], ["chinese", "english_eurasian"]),
    ("Eurasian Heritage Circle", "origin", "all", "book", "Devil curry, Papiah Kristang and a shared history.", "Last Saturday, Katong", ["story", "cook"], ["english_eurasian"]),
    ("Korean Friends in Singapore", "origin", "all", "heart", "Korean dance, language exchange and holiday dinners.", "Thursday evenings", ["dance"], ["korean"]),
    ("Deepavali Kakis", "faith", "all", "sparkles", "Lamps, sweets and visiting each other's homes at Deepavali.", "Before Deepavali", ["festival"], ["indian_tamil", "indian_north"]),
    ("Hari Raya Open House", "faith", "all", "moon", "Open doors, ketupat and rendang at Hari Raya, for neighbours of every faith.", "Hari Raya weekends", ["festival", "cook"], ["malay"]),
    ("Chinese New Year Reunion", "faith", "all", "gift", "Reunion dinner for those with no family nearby, and lion dance for all.", "Eve of CNY", ["festival", "cook"], ["chinese"]),
    ("Mid-Autumn Lantern Walk", "faith", "all", "moon", "Lanterns, mooncakes and a slow evening walk with the grandchildren.", "Mid-Autumn evening", ["festival", "walk"], ["chinese"]),
    ("Still Here: living on our own", "life", "all", "heart", "For those who live alone now. A phone call, a walk, a kopi. Nobody is forgotten here.", "Weekly call and monthly kopi", ["story", "sing"], []),
    ("First Year of Retirement", "life", "all", "sunny", "The first year at home is strange. Share how it goes, and what filled the days.", "Alternate Wednesdays", ["tai chi", "garden", "walk"], []),
    ("Grandparents Who Mind", "life", "all", "happy", "For grandparents minding grandchildren: swap tips, trade hours, share a meal.", "Tuesday afternoons", ["family"], []),
    ("Mums and Dads to Be", "life", "all", "people", "Expecting? Elders who raised families here answer your real questions.", "Monthly", ["family"], []),
    ("Caring for Mum and Dad", "life", "all", "heart", "Children caring for a parent from nearby or far. You are not alone.", "Monthly", ["family"], []),
    ("Uncle Time (men only)", "life", "men", "beer", "Men's kopi corner: chess, fishing talk, football and a place to say how you really are.", "Weekday afternoons", ["kopi", "chess", "fish"], []),
    ("Aunties Cook Together (women only)", "life", "women", "restaurant", "Cook, laugh and share recipes. A women-only circle.", "Thursday mornings", ["cook", "kueh", "craft"], []),
    ("Tai Chi at Dawn", "interest", "all", "body", "Slow tai chi before the sun is high, every morning.", "Daily 7am", ["tai chi", "walk"], []),
    ("Chess and Kopi", "interest", "all", "grid", "Xiangqi and chess, with kopi. All levels.", "Daily afternoons", ["chess", "kopi"], []),
    ("Singing Seniors Karaoke", "interest", "all", "mic", "Old songs in four languages, every week.", "Fridays", ["sing"], []),
    ("Community Gardeners", "interest", "all", "leaf", "Grow vegetables and herbs together on the estate.", "Saturday mornings", ["garden"], []),
    ("Walking Group", "interest", "all", "walk", "A steady morning walk through the estate and park connectors.", "Mon, Wed, Fri 7:30am", ["walk"], []),
    ("Phone Help for Everyone", "interest", "all", "phone-portrait", "Young volunteers help elders with phones, banking and video calls, and learn stories in return.", "Saturdays", ["tech", "volunteer"], []),
    ("Craft and Calligraphy", "interest", "all", "color-palette", "Brush, thread, paper: make something with your hands.", "Wednesdays", ["craft"], []),
    ("Silver Guardians", "interest", "all", "shield-checkmark", "Befriending, meal delivery and quiet visits to neighbours who are alone.", "Training monthly", ["volunteer"], []),
    ("Storytellers of the Old Kampung", "interest", "all", "chatbubbles", "Elders tell, the young record. A living archive of Singapore.", "First Thursday", ["story"], []),
    ("Line Dance and Zumba Gold", "interest", "all", "musical-note", "Gentle dance classes that are really a good excuse to laugh together.", "Tuesdays and Fridays", ["dance", "sing"], []),
]

DOMAIN_CATEGORY = {"physical": "Fitness", "social": "Social", "cognitive": "Education", "learning": "Workshop", "volunteerism": "Community"}
DOMAIN_PIC = {"physical": "activity_exercise", "social": "activity_social", "cognitive": "activity_social", "learning": "wisdom_share", "volunteerism": "volunteer"}


def _invite(used: set) -> str:
    while True:
        c = "".join(rng.choice("ABCDEFGHJKMNPQRSTUVWXYZ23456789") for _ in range(8))
        if c not in used:
            used.add(c)
            return c


# ---- Wisdom content: what elders offer, what they write down, what learners and elders ask for ----
OFFERS = {
    "retired_regular": [
        ("Fixing small appliances, fans and bicycles", "Repair what you have and learn how. I explain each step so you can do it next time.", "workshop", "volunteer", "social", None, ["repair", "electrical"], "Electrician", (15, 35), "A town council"),
        ("Career advice for engineering students", "How the real work differs from the course, what to learn first, and how to get that first job.", "mentoring", "volunteer", "professional", None, ["engineering", "career"], "Engineer", (20, 40), "A shipyard and an electronics firm"),
        ("Gardening for balcony and void deck", "Chillies, kang kong and herbs that thrive in Singapore heat.", "workshop", "either", "social", "Free for neighbours, S$15 for a group", ["gardening"], "Gardener", (5, 20), "Community garden"),
    ],
    "aunty_cook": [
        ("Kueh and nyonya cooking at my kitchen table", "Kueh lapis, ondeh-ondeh, ang ku kueh. We cook together and you take some home.", "workshop", "paid", "cultural", "S$25 per session, ingredients included", ["cooking", "kueh", "heritage"], "Home cook", (25, 50), "A neighbourhood stall"),
        ("Teaching grandma's festival recipes", "Pineapple tarts, rendang, murukku: the recipes that matter at festival time.", "workshop", "either", "cultural", "Free at the centre, S$20 at home", ["cooking", "festival"], "Home cook", (20, 50), "Family kitchen"),
    ],
    "men_kaki": [
        ("How a hawker stall really works", "Costs, hours, suppliers, regulars. Honest numbers from thirty years.", "mentoring", "either", "professional", "Free chat, S$30 for a full plan", ["hawker", "small business"], "Hawker", (15, 40), "A hawker centre"),
        ("Old Singapore stories for children", "Kampung, the sea before the reclamation, the first HDB flats.", "workshop", "volunteer", "cultural", None, ["storytelling", "heritage"], "Bus captain", (20, 38), "Singapore Bus Service"),
    ],
    "centre_leader": [
        ("Tuition mentoring for primary pupils", "Reading and maths help for one hour after school. Patient and gentle.", "mentoring", "volunteer", "professional", None, ["teaching", "primary school"], "Teacher", (25, 40), "Primary schools"),
        ("How to start and lead a circle", "From the first three members to a weekly gathering. What worked for me.", "mentoring", "volunteer", "social", None, ["leadership", "community"], "Teacher and centre volunteer", (20, 40), "Active Ageing Centres"),
    ],
    "active_volunteer": [
        ("How to be a good befriender", "What to say, what not to, how to keep going. For new Silver Guardians.", "mentoring", "volunteer", "social", None, ["befriending", "volunteering"], "Volunteer", (4, 15), "Silver Generation Office"),
    ],
}
CAPSULES = {
    "cultural": [
        ("How my grandmother made kueh lapis", "She steamed it one thin layer at a time, nine layers on a good day, waiting for each to set before the next. She said you cannot hurry kueh, and you cannot hurry a family either. I still count the layers aloud, the way she did, and when I teach the young ones I make them wait too."),
        ("Chinese New Year in the kampung", "Before the flats, we visited every house on the lane in one afternoon. Each door had mandarin oranges and a plate of pineapple tarts, and by dinner we could not eat a single thing more. What I remember is not the food but that nobody was ever alone at New Year."),
        ("The first time I fasted at Ramadan", "I was eight, and my mother woke me before dawn for sahur. The whole kampung smelled of frying. At sunset we broke the fast together on a long mat, neighbours of every race. I still think of that mat when someone says Singapore is not one family."),
        ("Why we light the lamp at Deepavali", "My mother said the lamp is not for the gods but for those walking home in the dark. Every year we put one at the gate for whoever needs it. We have never counted who came. That is the point."),
        ("Songs my mother sang while she cooked", "She sang in Teochew, softly, never for anyone. I learned every word by standing in the kitchen. Now I sing them to my granddaughter, who does not speak Teochew but knows the tune. That is enough for me."),
    ],
    "social": [
        ("What I learned minding four grandchildren", "Do not fight about food. Do not fight about the phone. Do one thing together every day, even if it is only folding laundry. They remember who was there, not what was said."),
        ("How to ask a neighbour for help", "Start with a small favour, one you can return. Sugar, a ladder, a lift to the clinic. Ask, say thank you, and bring something back. Asking is how neighbours become neighbours."),
        ("The first year after my husband passed", "The hardest hour was dinner. So I started cooking for two, and giving the second plate to the neighbour. Within a month we ate together. I do not know who rescued whom."),
        ("What a good volunteer actually does", "Turn up on time. Listen more than you speak. Do not fix everything. And always ask the person what they want before you decide what they need."),
        ("Teaching a teenager to talk to an old person", "I tell them to ask about food. Everyone has a food story, and from the food comes the family, and from the family comes everything. Within ten minutes they are laughing."),
    ],
    "professional": [
        ("Thirty years in a hawker stall: what the numbers said", "Rent is not the killer, hours are. Know your cost per plate, buy early, never run out of the first item on the menu, and the regulars will carry you through a bad month."),
        ("How I taught my team to read a blueprint", "Start from the corner, not the middle. Learn what each line means before you learn what the building is. The hardest part of engineering is deciding what not to draw."),
        ("What nursing taught me about listening", "Patients tell you what is wrong in the first minute if you stay quiet. They tell you what matters in the third. Most mistakes happen in the second, when we start talking."),
        ("Teaching primary school, forty years on", "The child who is hardest to teach usually needs one adult who is not tired. If you can be that adult for one hour a week, you have changed a year of their life."),
        ("What a driver sees that others do not", "Thirty years on a bus route teaches you people. Who is lonely, who is late, who is about to cry. I did not do anything about it then. I wish I had said good morning properly."),
    ],
}
REQUESTS = [
    ("learn", "How to start a food stall", "I am 29 and want to start a small food business. What should I watch for in the first year, and how much money do I need?"),
    ("learn", "Interview practice for my first job", "I am finishing polytechnic. Can someone practise an interview with me and tell me honestly how I sounded?"),
    ("learn", "Raising a baby in Singapore", "We are expecting in March. What did you wish you knew in the first three months? Real advice, not a book."),
    ("learn", "Learning to cook my grandmother's dishes", "My grandmother is gone and I never wrote the recipes down. Can someone teach me the old way?"),
    ("learn", "Talking to my father about retirement", "My father just retired and is restless. How do I help without nagging?"),
    ("learn", "Basic home repair", "I want to fix a leaking tap and a loose door without calling someone every time."),
    ("learn", "Starting a small garden on the balcony", "I live on the 14th floor. What actually grows?"),
    ("learn", "Writing a CV after twenty years", "I have not written one since 2004. Where do I start?"),
    ("support", "Help setting up my phone for video calls", "I want to see my grandchildren but I do not know how to use the video call on my phone."),
    ("support", "A phone befriender once a week", "I live alone and it would be nice to have a short call each week from someone friendly."),
    ("support", "Help reading my letters and bills", "My eyes are poor. I need someone to read and explain my letters, a few minutes a month."),
    ("support", "Company to the clinic", "I would like someone to go with me to my check-up, once every two months."),
]
MARKET_DAYS = [
    ("Sunday Market Day at the Void Deck", "Neighbours sell kueh, crafts and plants. Seniors run the stalls with a helper from the younger generation.", "community_centre"),
    ("Heritage Bazaar", "Handmade crafts, old photographs for sale to benefit the centre, and live Hokkien storytelling.", "mall"),
    ("Silver Market", "Everything made by people over sixty: sambal, beadwork, baked goods, repair.", "mall"),
    ("Kampung Pasar Malam", "Food, games and music from the old kampung, with a stage for singers over sixty.", "other"),
    ("Pre-Raya Kuih Market", "Order and collect kuih for Hari Raya from the aunties who bake them.", "community_centre"),
    ("Deepavali Lamps and Sweets", "Hand-painted lamps and homemade sweets for Deepavali.", "mall"),
]
OPPORTUNITIES = [
    ("volunteer", ["volunteer", "contribute"], "Befriender training and weekly calls", "Be the friendly voice for a neighbour who lives alone. Training provided, one hour a week."),
    ("volunteer", ["volunteer", "contribute"], "Meal delivery for homebound seniors", "Deliver meals on a short route near the centre. Wednesday and Friday mornings."),
    ("volunteer", ["volunteer", "enjoy"], "Digital buddy for the Phone Help Saturday", "Teach elders to video call and bank online. Young volunteers especially welcome."),
    ("volunteer", ["volunteer", "contribute"], "Garden helper", "Water and tend the estate garden. Take vegetables home."),
    ("gig", ["earn"], "Heritage walk guide for school groups", "Lead a one-hour heritage walk. Paid per walk, training provided."),
    ("gig", ["earn"], "Cooking demo at a centre event", "Show a traditional recipe to a group of thirty. Paid, ingredients provided."),
    ("gig", ["earn", "contribute"], "Homework mentor, two afternoons a week", "Help primary pupils with reading and maths. Paid hourly."),
    ("show", ["enjoy"], "Seniors' Singing Afternoon", "Old songs in four languages, with tea."),
    ("show", ["enjoy"], "Opera and Storytelling Matinee", "A free afternoon of Teochew opera and old-kampung stories."),
    ("activity", ["enjoy"], "Open morning at the Active Ageing Centre", "Come and see what we do, join a class, meet the aunties and uncles."),
]


def main(argv: list[str]) -> None:
    if "--reset" in argv:
        reset()
        return
    seed()


def reset() -> None:
    with engine().begin() as conn:
        n = conn.execute(text("delete from communities where external_ref like :r"), {"r": REF + "%"}).rowcount
        m = conn.execute(text("delete from market_events where external_ref like :r"), {"r": REF + "%"}).rowcount
        u = conn.execute(text("delete from users where email like :d"), {"d": f"%@{DOMAIN}"}).rowcount
        h = conn.execute(text("delete from hosts h where h.created_by is null and not exists (select 1 from communities c where c.host_id = h.id) and not exists (select 1 from market_events e where e.host_id = h.id) and h.name = any(:n)"),
                         {"n": [o["name"] for o in CENTRES["operators"]] + MALLS}).rowcount
    print(f"removed: {n} circles, {m} market events, {u} people, {h} hosts")


MALLS = ["Bedok Mall", "Tampines Mall", "Jurong Point", "Waterway Point", "Causeway Point", "Northpoint City", "Our Tampines Hub", "Junction 8", "Heartland Mall", "Toa Payoh HDB Hub"]


def seed() -> None:
    with engine().begin() as conn:
        if conn.execute(text("select 1 from communities where external_ref like :r limit 1"), {"r": REF + "%"}).first():
            print("already seeded; run with --reset to remove it first")
            return
        cur = conn.connection.cursor()
        used_codes = {r[0] for r in conn.execute(text("select invite_code from communities"))}
        used_slugs = {r[0] for r in conn.execute(text("select slug from communities"))}

        # ---------------- hosts ----------------
        host_ids: dict[str, str] = {}
        host_rows = []
        for o in CENTRES["operators"]:
            hid = uid()
            host_ids[o["id"]] = hid
            host_rows.append((hid, o["name"], "aac", "Singapore"))
        mall_ids = {}
        for m in MALLS:
            hid = uid()
            mall_ids[m] = hid
            host_rows.append((hid, m, "community_centre" if "Hub" in m else "mall", "Singapore"))
        ins(cur, "hosts", ["id", "name", "kind", "area_name"], host_rows)

        # ---------------- people ----------------
        shape_ids = list(SHAPES)
        weights = [SHAPES[s]["w"] for s in shape_ids]
        people = []
        used_names: set[str] = set()
        for i in range(PEOPLE):
            sh = rng.choices(shape_ids, weights)[0]
            S = SHAPES[sh]
            gender = S["gender"] or rng.choice(["man", "woman"])
            if sh == "korean_expatriate":
                group = "korean"
            elif sh in ("far_from_home", "new_migrant_worker"):
                group = "indian_north"
            else:
                group = rng.choices([g for g, _ in GROUPS[:5]], [w for _, w in GROUPS[:5]])[0]
            name = person_name(group, S["band"], gender)
            for _ in range(6):
                if name not in used_names:
                    break
                name = person_name(group, S["band"], gender)
            used_names.add(name)
            lang, spoken = LANGS[group]
            if sh == "new_migrant_worker":
                lang, spoken = rng.choice([("bn", ["bn", "hi", "en"]), ("hi", ["hi", "en"])])
            if S["band"] == "under40" or sh in ("helper_daughter",):
                lang = "en"
            tier = rng.choices(TIERS, S["tier"])[0]
            town = rng.choice(PLACES)
            roles = list(S["roles"])
            sharer = "share" in roles or rng.random() < S["share"]
            if sharer and "share" not in roles:
                roles.append("share")
            people.append(dict(id=uid(), n=i + 1, name=name, shape=sh, band=S["band"], gender=gender, group=group, lang=lang, spoken=spoken, tier=tier, town=town,
                               roles=roles, sharer=sharer, interests=rng.sample(INTEREST_KEYS, rng.randint(1, 3)), joined=NOW - timedelta(days=rng.randint(20, 330))))
        ins(cur, "users", ["id", "email", "display_name", "language", "age_band", "area_name", "spoken_languages", "comm_language", "interests", "login_kind", "created_at"],
            [(p["id"], f"{slug(p['name'])}.{p['n']}@{DOMAIN}", p["name"], p["lang"], p["band"], f"Blk {rng.randint(1, 900)} {p['town']}, Singapore", p["spoken"], p["spoken"][0], p["interests"], "own", p["joined"]) for p in people])
        profile_rows = []
        for p in people:
            ans = {
                "basics": {"display_name": p["name"], "language": p["lang"], "age_band": p["band"], "country": "SG", "area_name": p["town"], "spoken_languages": p["spoken"], "gender": p["gender"]},
                "purpose": {"roles": p["roles"]},
                "interests": {"interests": p["interests"]},
                "consent": {"privacy": True, "terms": True, "notes_memory": p["tier"] != "gentle", "family_share": p["shape"] in ("quiet_widow", "homebound_elder"), "insights": True},
            }
            if p["shape"] in ("far_from_home", "new_migrant_worker"):
                ans["belonging"] = {"from_state": "Bihar" if p["shape"] == "far_from_home" else "West Bengal", "from_language": p["spoken"][0], "keeps": ["festivals", "traditions"], "lives_now": p["town"]}
            profile_rows.append((p["id"], p["roles"], json.dumps(ans), json.dumps(ans["consent"]), p["joined"] + timedelta(minutes=9), p["joined"] + timedelta(minutes=9)))
        ins(cur, "profiles", ["user_id", "roles", "answers", "consents", "completed_at", "updated_at"], profile_rows, "(%s,%s,%s::jsonb,%s::jsonb,%s,%s)")

        by_town: dict[str, list] = {}
        for p in people:
            by_town.setdefault(p["town"], []).append(p)
        leaders = [p for p in people if p["shape"] in ("centre_leader", "retired_regular", "aunty_cook") and p["tier"] in ("very_high", "high")]
        rng.shuffle(leaders)

        # ---------------- circles ----------------
        # Real Active Ageing Centres: first one in each town, then a second where a town has more, up to 45 centres (imported under their operator)
        chosen, seen_town = [], {}
        for c in CENTRES["centres"]:
            if seen_town.get(c["town"], 0) < 1:
                chosen.append(c)
                seen_town[c["town"]] = 1
        for c in CENTRES["centres"]:
            if len(chosen) >= 45:
                break
            if c not in chosen and seen_town.get(c["town"], 0) < 2:
                chosen.append(c)
                seen_town[c["town"]] = 2
        comms = []  # dict(id, kind, ...)
        rows, role_rows = [], []
        li = 0
        for c in chosen:
            cid = uid()
            nm = c["name"][:78]
            sl = slug(nm)
            while sl in used_slugs:
                sl += "-" + str(rng.randint(10, 99))
            used_slugs.add(sl)
            lead = next((p for p in leaders[li:] if p["town"] == c["town"]), leaders[li % len(leaders)])
            li += 1
            op_name = next((o["name"] for o in CENTRES["operators"] if o["id"] == c["operator"]), "its operator")
            c.setdefault("address", c["town"] + ", Singapore")
            c["hours"] = c.get("hours") or "Weekdays, daytime"
            desc = f"A real Active Ageing Centre in {c['town']}, brought in under {op_name}. {c['address']}. Open {c['hours']}." + (f" Call {c['tel']}." if c.get("tel") else "")
            rows.append((cid, nm, sl, "neighbourhood", desc[:900], f"{c['town']}, Singapore", "open", _invite(used_codes), pic("singapore_place", nm), lead["id"], "home", c["hours"][:190], "place", "all", host_ids[c["operator"]], "imported", REF + "aac:" + sl, c["address"]))
            comms.append(dict(id=cid, kind="aac", name=nm, town=c["town"], address=c["address"], lead=lead, circle="place", audience="all", tags=[c["town"]]))
        for (nm, feel, aud, icon, desc, meet, likes, groups) in CIRCLES:
            cid = uid()
            sl = slug(nm)
            while sl in used_slugs:
                sl += "-" + str(rng.randint(10, 99))
            used_slugs.add(sl)
            lead = leaders[li % len(leaders)]
            li += 1
            rows.append((cid, nm[:78], sl, "club", desc, "Singapore", "open", _invite(used_codes), pic("festival" if feel in ("faith", "origin") else "activity_social", nm), lead["id"], icon, meet, feel, aud, None, "people", REF + "circle:" + sl, None))
            comms.append(dict(id=cid, kind="circle", name=nm, town=None, address=None, lead=lead, circle=feel, audience=aud, tags=likes, groups=groups))
        ins(cur, "communities", ["id", "name", "slug", "kind", "description", "area_name", "privacy", "invite_code", "cover_url", "created_by", "icon", "meeting", "circle", "audience", "host_id", "source", "external_ref", "signature_product"],
            [(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[12], r[13], r[14], r[15], r[16], None) for r in rows])

        role_def = {c["id"]: uid() for c in comms}
        ins(cur, "role_definitions", ["id", "community_id", "key", "name", "can_manage"], [(role_def[c["id"]], c["id"], "lead", "Community Lead", True) for c in comms])
        ins(cur, "role_terms", ["community_id", "role_definition_id", "user_id", "starts_on", "ends_on"],
            [(c["id"], role_def[c["id"]], c["lead"]["id"], (NOW - timedelta(days=120)).date(), (NOW + timedelta(days=245)).date()) for c in comms])

        # ---------------- memberships ----------------
        aacs = [c for c in comms if c["kind"] == "aac"]
        circles = [c for c in comms if c["kind"] == "circle"]
        members: dict[str, set] = {c["id"]: {c["lead"]["id"]} for c in comms}
        for p in people:
            home = [c for c in aacs if c["town"] == p["town"]] or [rng.choice(aacs)]
            members[home[0]["id"]].add(p["id"])
            want = {"very_high": rng.randint(2, 3), "high": rng.randint(1, 3), "steady": rng.randint(1, 2), "gentle": rng.randint(0, 1)}[p["tier"]]
            S = SHAPES[p["shape"]]
            scored = []
            for c in circles:
                if c["audience"] == "men" and p["gender"] != "man":
                    continue
                if c["audience"] == "women" and p["gender"] != "woman":
                    continue
                sc = rng.random() * 0.4
                if p["group"] in c.get("groups", []):
                    sc += 1.2
                if any(l in c["tags"] for l in S["likes"]) or any(l in c["name"].lower() for l in S["likes"]):
                    sc += 1.0
                if p["shape"] in ("quiet_widow", "homebound_elder") and "Still Here" in c["name"]:
                    sc += 2
                if p["shape"] == "helper_daughter" and "Caring for" in c["name"]:
                    sc += 2
                if p["shape"] == "expecting_parent" and "to Be" in c["name"]:
                    sc += 2
                if p["shape"] in ("student_learner", "young_helper_teen", "career_switcher") and "Phone Help" in c["name"]:
                    sc += 2
                scored.append((sc, c))
            for _, c in sorted(scored, key=lambda t: -t[0])[:want]:
                members[c["id"]].add(p["id"])
        ins(cur, "memberships", ["community_id", "user_id", "joined_at"],
            [(cid, uidm, NOW - timedelta(days=rng.randint(5, 300))) for cid, ms in members.items() for uidm in ms])

        # ---------------- announcements and gatherings (past and coming) ----------------
        ann = [(c["id"], c["lead"]["id"], f"Welcome to {c['name']}", f"Everyone is welcome. {'Drop in at the centre any weekday.' if c['kind'] == 'aac' else 'Come to the next gathering and say hello.'}", True, NOW - timedelta(days=rng.randint(20, 200))) for c in comms]
        ins(cur, "announcements", ["community_id", "author_id", "title", "body", "pinned", "created_at"], ann)
        act_rows, part_rows = [], []
        progs = PROGRAMMES
        for c in comms:
            member_list = list(members[c["id"]])
            k_future, k_past = (3, 2) if c["kind"] == "aac" else (2, 1)
            for j in range(k_future + k_past):
                pr = rng.choice(progs)
                future = j < k_future
                day = rng.randint(1, 20) if future else -rng.randint(7, 150)
                start = (NOW + timedelta(days=day)).replace(hour=rng.choice([8, 9, 10, 14, 15]), minute=0, second=0, microsecond=0)
                aid = uid()
                cat = "Cooking" if "cook" in pr["name"].lower() else DOMAIN_CATEGORY.get(pr["domain"], "Social")
                picc = "activity_cooking" if "cook" in pr["name"].lower() else DOMAIN_PIC.get(pr["domain"], "activity_social")
                act_rows.append((aid, c["id"], c["lead"]["id"], pr["name"][:118], (pr.get("note") or "")[:900], cat, start, start + timedelta(hours=rng.choice([1, 2])),
                                 (c["address"] or c["name"])[:200], rng.choice([None, 20, 25, 30]), pic(picc, aid), "scheduled" if future else "done"))
                for u in rng.sample(member_list, min(len(member_list), rng.randint(4, 16))):
                    part_rows.append((aid, u))
        ins(cur, "activities", ["id", "community_id", "organiser_id", "title", "description", "category", "starts_at", "ends_at", "location", "capacity", "image_url", "status"], act_rows)
        ins(cur, "activity_participants", ["activity_id", "user_id"], list({(a, u) for a, u in part_rows}))

        # ---------------- Wisdom ----------------
        offers, capsules = [], []
        offer_owner: dict[str, dict] = {}
        for p in people:
            if not p["sharer"]:
                continue
            for (title, about, kind, mode, dom, price, topics, field, yrs, where) in (OFFERS.get(p["shape"]) or []):
                if rng.random() < 0.55:
                    oid = uid()
                    offers.append((oid, p["id"], title, about, kind, mode, "Weekday mornings and Saturdays" if rng.random() < 0.5 else "Evenings by arrangement", dom, price, field, rng.randint(*yrs), where, topics, p["spoken"], NOW - timedelta(days=rng.randint(5, 200))))
                    offer_owner[oid] = p
            if p["shape"] in ("aunty_cook", "centre_leader", "men_kaki", "retired_regular", "active_volunteer") and rng.random() < 0.7:
                for _ in range(rng.randint(1, 2)):
                    dom = rng.choice(list(CAPSULES))
                    title, body = rng.choice(CAPSULES[dom])
                    capsules.append((uid(), p["id"], title, body, dom, [dom], "app", "published", NOW - timedelta(days=rng.randint(3, 220)), None))
        ins(cur, "wisdom_offers", ["id", "user_id", "title", "about", "kind", "mode", "availability", "domain", "price_note", "proof_field", "proof_years", "proof_where", "topics", "languages", "created_at"], offers,
            "(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)")
        # published_at is the same moment as created_at for a published story
        ins(cur, "wisdom_capsules", ["id", "author_id", "title", "body", "kind", "tags", "source", "status", "created_at", "community_id"], capsules)
        cur.execute("update wisdom_capsules set published_at = created_at where published_at is null and status = 'published' and author_id in (select id from users where email like %s)", (f"%@{DOMAIN}",))
        learners = [p for p in people if p["shape"] in ("student_learner", "career_switcher", "expecting_parent", "young_helper_teen", "helper_daughter")]
        elders_help = [p for p in people if p["shape"] in ("quiet_widow", "homebound_elder", "retired_regular")]
        reqs = []
        req_owner: dict[str, dict] = {}
        for p in learners:
            for kind, topic, about in rng.sample([r for r in REQUESTS if r[0] == "learn"], rng.randint(1, 2)):
                rid = uid()
                reqs.append((rid, p["id"], topic, about, kind, NOW - timedelta(days=rng.randint(2, 150))))
                req_owner[rid] = p
        for p in rng.sample(elders_help, min(60, len(elders_help))):
            kind, topic, about = rng.choice([r for r in REQUESTS if r[0] == "support"])
            rid = uid()
            reqs.append((rid, p["id"], topic, about, kind, NOW - timedelta(days=rng.randint(2, 100))))
            req_owner[rid] = p
        ins(cur, "wisdom_requests", ["id", "user_id", "topic", "about", "kind", "created_at"], reqs)
        conns, sess = [], []
        offer_ids = list(offer_owner)
        learn_reqs = [r for r in reqs if r[4] == "learn"]
        for r in rng.sample(learn_reqs, min(60, len(learn_reqs))):
            oid = rng.choice(offer_ids)
            mentor, learner = offer_owner[oid], req_owner[r[0]]
            if mentor["id"] == learner["id"]:
                continue
            status = rng.choices(["accepted", "pending", "closed"], [5, 3, 2])[0]
            cid_ = uid()
            created = NOW - timedelta(days=rng.randint(3, 120))
            conns.append((cid_, mentor["id"], learner["id"], learner["id"], oid, r[0], "Hello, I would like to learn from you. Is this a good time to start?", status, created, created + timedelta(days=1) if status != "pending" else None))
            if status == "accepted":
                for _ in range(rng.randint(1, 3)):
                    sess.append((uid(), cid_, learner["id"], rng.choice([30, 45, 60, 90]), created + timedelta(days=rng.randint(2, 40))))
        ins(cur, "wisdom_connections", ["id", "mentor_id", "learner_id", "initiated_by", "offer_id", "request_id", "message", "status", "created_at", "decided_at"], conns)
        ins(cur, "wisdom_sessions", ["id", "connection_id", "logged_by", "minutes", "occurred_at"], sess)

        # ---------------- Marketplace ----------------
        ev_rows, stall_rows, goer_rows = [], [], []
        hosts_pool = list(mall_ids.items())
        stalls_total_by_event: dict[str, int] = {}
        sellers = [p for p in people if p["shape"] in ("aunty_cook", "men_kaki", "retired_regular")]
        for i, (title, desc, vk) in enumerate(MARKET_DAYS * 2):
            eid = uid()
            hn, hid = hosts_pool[i % len(hosts_pool)]
            start = (NOW + timedelta(days=3 + i * 6)).replace(hour=9, minute=30, second=0, microsecond=0)
            ev_rows.append((eid, f"{title} at {hn}"[:118], desc, hn, vk, f"{hn}, Singapore", "Singapore", start, start + timedelta(hours=5), rng.choice([12, 16, 20]), pic("market", eid), "partner", "market_day", ["earn", "enjoy"], hid, REF + f"market:{i}"))
            tot = ev_rows[-1][9]
            for s in rng.sample(sellers, min(tot - 3, len(sellers))):
                stall_rows.append((uid(), eid, s["id"], None, rng.choice(["Homemade kueh and tarts", "Handmade bags and cloth crafts", "Plants and herbs from my balcony", "Sambal and pickles", "Cards and calligraphy", "Repairs while you wait", "Beaded jewellery"]), "goods", "whole"))
            for g in rng.sample(people, 40):
                goer_rows.append((eid, g["id"]))
        for i, (kind, intents, title, desc) in enumerate(OPPORTUNITIES * 3):
            eid = uid()
            c = aacs[i % len(aacs)]
            start = (NOW + timedelta(days=2 + i * 2)).replace(hour=rng.choice([9, 10, 14]), minute=0, second=0, microsecond=0)
            ev_rows.append((eid, f"{title}"[:118], desc, c["name"][:118], "community_centre", c["address"], c["town"], start, start + timedelta(hours=3), 0, pic({"volunteer": "volunteer", "gig": "activity_social", "show": "activity_social", "activity": "elders"}[kind], eid), "partner", kind, intents, host_ids[next(x["operator"] for x in CENTRES["centres"] if x["name"][:78] == c["name"])], REF + f"opp:{i}"))
        ins(cur, "market_events", ["id", "title", "description", "venue_name", "venue_kind", "address", "area_name", "starts_at", "ends_at", "stalls_total", "cover_url", "source", "kind", "intents", "host_id", "external_ref"], ev_rows)
        ins(cur, "market_event_stalls", ["id", "event_id", "seller_id", "community_id", "selling", "kind", "slot"], stall_rows)
        ins(cur, "market_event_goers", ["event_id", "user_id"], list(set(goer_rows)))

        print(f"seeded: {len(hosts_pool) + len(CENTRES['operators'])} hosts, {len(people)} people, {len(comms)} circles ({len(aacs)} real centres), "
              f"{len(act_rows)} gatherings, {len(capsules)} stories, {len(offers)} offers, {len(reqs)} requests, {len(conns)} introductions, {len(sess)} sessions, {len(ev_rows)} market events and opportunities")


if __name__ == "__main__":
    main(sys.argv[1:])
