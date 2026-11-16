"""Onboarding rules, as data: the sections, their questions, which roles switch a section on, and which roles show which parts of Wisdom.
Nothing here touches the database or a screen. The app, the agent on a phone call and the chat all read this same list."""
import re

from ...core import languages


class OnboardingError(Exception):
    def __init__(self, code: str, message: str = ""):
        super().__init__(code)
        self.code, self.message = code, message


ROLES = ("connect", "share", "learn", "help", "care")
ROLE_WORDS = {
    "connect": "stay connected and active",
    "share": "share what I know",
    "learn": "learn from experienced people",
    "help": "help seniors",
    "care": "look after a parent or loved one",
}
# What each role shows. The app asks the backend for the list and never hard-codes who sees what.
ALWAYS = ("home", "agent", "profile")
SURFACES = {
    "connect": ("community", "markets", "health", "calendar"),
    "share": ("wisdom_share", "freelance"),
    "learn": ("wisdom_learn",),
    "help": ("wisdom_help",),
    "care": ("family_circle",),
}
# Until a person says what they want here, their age picks the starting roles.
DEFAULT_ROLES = {"60plus": ("connect", "share"), "40to59": ("care", "learn"), "under40": ("learn", "help")}

CHANNELS = ("call", "whatsapp", "telegram", "sms", "app")
CONSENTS = {
    "privacy": "keep my information private and use it only to help me (PDPA, DPDP)",
    "terms": "the terms of using Wisdom",
    "notes_memory": "let Wisdom remember what I tell it",
    "family_share": "let my family see my day",
    "insights": "let Wisdom use my interests, without my name, to help centres plan what to run",
}
REQUIRED_CONSENTS = ("privacy", "terms")
# The interests step: fixed keys, so a circle or an event can be matched to a person without parsing free text.
INTEREST_KEYS = ("walking", "taichi", "cooking", "chess", "music", "gardening", "teaching", "tech")


def Q(key, label, kind, options=None, required=False, low=None, high=None, why=None):
    """One question. `why` is a short, honest reason it is asked, shown kindly under the question when there is one; it is never a justification to insist."""
    return {"key": key, "label": label, "kind": kind, "options": list(options or []), "required": required, "low": low, "high": high, "why": why}


# kind: text | choice | multi | int | time | phone | bool
SECTIONS = [
    {"id": "basics", "title": "About you", "required": True, "roles": None, "questions": [
        Q("display_name", "What should we call you?", "text", required=True),
        Q("language", "Which language do you want to use?", "choice", ["en", "hi", "bn", "ta", "zh", "ms"], required=True),
        Q("age_band", "Which age group are you in?", "choice", ["under40", "40to59", "60plus"], required=True),
        Q("country", "Which country are you in?", "choice", ["SG", "IN", "other"], required=True),
        Q("area_name", "Which area do you live in?", "text"),
        Q("spoken_languages", "Which languages do you speak?", "multi"),
        Q("gender", "Are you a man, a woman, another gender, or would you rather not say?", "choice", ["man", "woman", "other", "prefer_not_to_say"],
          why="We ask only so you can find circles that are for men only or for women only, if you want that. You can leave this out."),
        Q("referral", "Did an employer or an active ageing centre invite you? Which one?", "text"),
    ]},
    {"id": "purpose", "title": "What you want here", "required": True, "roles": None, "questions": [
        Q("roles", "What would you like to do here? You can pick more than one.", "multi", ROLES, required=True),
    ]},
    # The interests step, right after "What you want here": optional, its own screen in the app (big tiles), skippable in one tap.
    {"id": "interests", "title": "What you enjoy", "required": False, "roles": None, "questions": [
        Q("interests", "Which of these do you enjoy?", "multi", INTEREST_KEYS),
    ]},
    {"id": "consent", "title": "Your say over your information", "required": True, "roles": None, "questions": [
        Q("privacy", CONSENTS["privacy"], "bool", required=True),
        Q("terms", CONSENTS["terms"], "bool", required=True),
        Q("notes_memory", CONSENTS["notes_memory"], "bool"),
        Q("family_share", CONSENTS["family_share"], "bool"),
        Q("insights", CONSENTS["insights"], "bool"),
    ]},
    {"id": "channels", "title": "How to reach you", "required": False, "roles": None, "questions": [
        Q("phone", "Which phone number can we use?", "phone"),
        Q("preferred_channel", "Where do you like to talk to us?", "choice", CHANNELS),
        Q("voice_or_text", "Do you prefer talking or writing?", "choice", ["voice", "text"]),
        Q("large_text", "Would you like bigger text?", "bool"),
        Q("quiet_from", "From what time should we leave you in peace?", "time", why="Only if you want to set your own quiet hours. Without this we keep to the usual night of 21:00 to 08:00."),
        Q("quiet_to", "Until what time should we keep quiet?", "time"),
    ]},
    # Belonging: opt-in, never inferred. The person's own words are used only to offer circles that fit them, and are never shown outside a circle.
    {"id": "belonging", "title": "Where you are from", "required": False, "roles": None, "questions": [
        Q("from_state", "Which state or region are you from?", "text", why="Only if you want to. These answers are used only to offer circles that fit you; they are never shown outside a circle."),
        Q("from_place", "Which city, town or village are you from?", "text"),
        Q("from_language", "Which language feels like home?", "text"),
        Q("keeps", "What do you keep? (festivals, faith, traditions)", "multi", ["festivals", "faith", "traditions"]),
        Q("lives_now", "Where do you live now?", "text"),
    ]},
    {"id": "share", "title": "What you can share", "required": False, "roles": ("share",), "questions": [
        Q("field", "What was your work or field?", "text"),
        Q("years", "How many years of experience?", "int", low=0, high=70),
        Q("skills", "Which skills or life experience can you teach?", "multi"),
        Q("share_modes", "How would you like to share?", "multi", ["voice_capsules", "live_sessions", "freelance"]),
        Q("pay", "Is it voluntary, paid, or either?", "choice", ["volunteer", "paid", "either"]),
        Q("availability", "When are you usually free?", "text"),
    ]},
    {"id": "help", "title": "How you can help", "required": False, "roles": ("help",), "questions": [
        Q("offers", "What can you help with?", "multi", ["companionship", "errands", "digital_help"]),
        Q("areas", "Which areas can you help in?", "text"),
        Q("times", "When are you free to help?", "text"),
    ]},
    {"id": "learn", "title": "What you want to learn", "required": False, "roles": ("learn",), "questions": [
        Q("age_15_plus", "Are you 15 or older?", "bool"),
        Q("topics", "What would you like to learn about?", "multi"),
        Q("goal", "What do you hope to do with it?", "text"),
    ]},
    {"id": "care", "title": "Who you care for", "required": False, "roles": ("care",), "questions": [
        Q("relation", "Who do you look after? (for example my mother)", "text"),
        Q("emergency_name", "Who is the emergency contact?", "text"),
        Q("emergency_phone", "Their phone number?", "phone"),
    ]},
    {"id": "rhythm", "title": "Your day", "required": False, "roles": None, "questions": [
        Q("wake", "What time do you usually wake up?", "time"),
        Q("sleep", "What time do you usually sleep?", "time"),
        Q("living", "Do you live alone, with family, or in a care home?", "choice", ["alone", "with_family", "care_home"]),
        Q("interests", "What do you enjoy? (music, cooking, gardening, sport...)", "multi"),
        Q("vision", "What would you like the next three months to look like?", "text"),
    ]},
    {"id": "wellbeing", "title": "How connected you feel", "required": False, "roles": None, "questions": [
        Q("lack_companionship", "How often do you feel you lack company?", "choice", ["hardly_ever", "some_of_the_time", "often"]),
        Q("feel_left_out", "How often do you feel left out?", "choice", ["hardly_ever", "some_of_the_time", "often"]),
        Q("feel_isolated", "How often do you feel isolated from others?", "choice", ["hardly_ever", "some_of_the_time", "often"]),
    ]},
    {"id": "access", "title": "Making it easy for you", "required": False, "roles": ("connect",), "questions": [
        Q("hearing", "How is your hearing?", "choice", ["fine", "some_trouble", "hard"]),
        Q("eyesight", "How is your eyesight?", "choice", ["fine", "some_trouble", "hard"]),
        Q("walking", "How is walking?", "choice", ["fine", "some_trouble", "hard"]),
    ]},
]
BY_ID = {s["id"]: s for s in SECTIONS}
SKIPPED = "_skipped"
# What is copied onto the person's account (everything else already reads it there).
ON_USER = {"basics": ("display_name", "language", "age_band", "area_name", "spoken_languages"), "channels": ("phone",), "interests": ("interests",)}


def applicable(roles: list[str]) -> list[dict]:
    """The sections that apply to a person who chose these roles."""
    return [s for s in SECTIONS if not s["roles"] or any(r in roles for r in s["roles"])]


def surfaces(roles: list[str]) -> list[str]:
    out = list(ALWAYS)
    for r in roles:
        out += [x for x in SURFACES.get(r, ()) if x not in out]
    return out


def default_roles(age_band: str | None) -> list[str]:
    return list(DEFAULT_ROLES.get(age_band or "", ("connect",)))


def _bool(v):
    if isinstance(v, bool):
        return v
    s = str(v).strip().lower()
    if s in ("true", "yes", "y", "1", "ok", "yeah", "yep"):
        return True
    if s in ("false", "no", "n", "0", "nope"):
        return False
    raise ValueError


def _list(v) -> list[str]:
    items = v if isinstance(v, list) else re.split(r"[,;]| and ", str(v))
    return [str(i).strip() for i in items if str(i).strip()]


def clean(q: dict, value):
    """One answer, checked and put in its proper form. A bad answer says which question and why, so the agent can ask again in words."""
    k, kind = q["key"], q["kind"]
    bad = OnboardingError("bad_answer", f"That does not look right for: {q['label']}")
    try:
        if kind == "text":
            v = str(value).strip()
            if not 1 <= len(v) <= 200:
                raise ValueError
            return v
        if kind == "bool":
            return _bool(value)
        if kind == "int":
            v = int(str(value).strip())
            if not q["low"] <= v <= q["high"]:
                raise ValueError
            return v
        if kind == "time":
            m = re.fullmatch(r"(\d{1,2})[:.](\d{2})", str(value).strip())
            if not m or int(m[1]) > 23 or int(m[2]) > 59:
                raise ValueError
            return f"{int(m[1]):02d}:{m[2]}"
        if kind == "phone":
            v = str(value).strip()
            if not re.fullmatch(r"\+?[0-9 ]{6,20}", v):
                raise ValueError
            return v
        if kind == "choice":
            v = str(value).strip().lower().replace(" ", "_")
            opts = {o.lower(): o for o in q["options"]}
            if v not in opts:
                raise ValueError
            return opts[v]
        if kind == "multi":
            items = _list(value)
            if k == "spoken_languages":
                items = languages.clean(items)
            elif q["options"]:
                opts = {o.lower(): o for o in q["options"]}
                items = [opts[i.lower().replace(" ", "_")] for i in items]
            if not items and q["required"]:
                raise ValueError
            return items[:20]
    except (ValueError, KeyError):
        raise bad from None
    raise bad


def wisdom_parts(roles: list[str]) -> list[str]:
    """The parts of the Wisdom tab this person gets. Someone who came to share or help: their own experience and who is asking. A learner: shared experience and mentors. Both: experience, mentors and their own. Otherwise: shared experience.
    Paid sessions (a person's own paid services, and the sessions others offer) go to everyone: those who share see "My services", the rest browse and book."""
    giving, taking = ("share" in roles or "help" in roles), "learn" in roles
    if giving and taking:
        return ["stories", "mentors", "mine", "paid"]
    if giving:
        return ["mine", "learners", "paid"]  # what they have lived, who is asking, and their own services
    if taking:
        return ["stories", "mentors", "paid"]
    return ["stories", "paid"]


def wisdom_default(roles: list[str]) -> str:
    giving = "share" in roles or "help" in roles
    return "mine" if giving and "learn" not in roles else "stories"


def focus(roles: list[str]) -> str:
    """One word for the app to tune its wording: serve (they came to share or help), learn, or both."""
    giving, taking = ("share" in roles or "help" in roles), "learn" in roles
    return "both" if giving and taking else "serve" if giving else "learn" if taking else "connect"


def rank_circles(belonging, circles: list[dict]) -> list[dict]:
    """Offer circles in the order they fit this person, from the belonging answers THEY chose to give (never inferred; used only to rank, never shown outside a circle).
    `circles` are plain dicts with `circle` (origin, faith, place, life, interest), `name`, `area_name` and `description`; the same dicts come back in order.
    With no answers the order is unchanged. Pure: no database, no screen, so any area can call it with its own circle list."""
    a = belonging or {}
    from_there = {t for k in ("from_state", "from_place", "from_language") for t in str(a.get(k) or "").casefold().split() if len(t) >= 3}
    live = str(a.get("lives_now") or "").casefold().strip()
    keeps = {str(k).casefold() for k in (a.get("keeps") or [])}

    def hay(c: dict) -> str:
        return " ".join(str(c.get(k) or "") for k in ("name", "area_name", "description")).casefold()

    def score(c: dict) -> int:
        h, kind = hay(c), str(c.get("circle") or "")
        s = 2 * sum(1 for t in from_there if t in h) + (3 if live and len(live) >= 3 and live in h else 0)
        if "faith" in keeps and kind == "faith":
            s += 2
        if "festivals" in keeps and kind in ("faith", "origin"):
            s += 1
        if "traditions" in keeps and kind in ("origin", "faith"):
            s += 1
        return s

    return sorted(circles, key=lambda c: -score(c))  # stable: equal scores keep the caller's order
