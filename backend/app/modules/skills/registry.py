"""Backend skills: the things a person can ask Wisdom to DO, written once on the server, so any channel (a Telegram chat, a phone call, a test, the command line)
can read and change their data with no app open. Each skill takes the person's id and some small arguments and returns a small dict the agent can say in a sentence.

Rules every skill follows:
- it acts only for the person it is run for, through the same services the app uses (so every rule the app has holds here too);
- a name given in words ("the Thursday kopi") is matched to the person's own things, and when more than one fits it answers with the choices instead of guessing;
- a skill that tells other people (the family) needs `confirmed: true`, which the agent may only send after the person said yes;
- it never raises to the model: a refusal is an answer ({"error": code}) the agent can explain.
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Callable

from sqlalchemy import Connection, text

from ..calendar import service as cal
from ..communities import lead as comm_lead
from ..communities import service as comm
from ..health import service as health
from ..market import events as mevents
from ..nodes import service as nodes
from ..nodes.rules import NodeError

UTC = timezone.utc


class SkillError(Exception):
    def __init__(self, code: str, message: str = "", options: list[str] | None = None):
        super().__init__(code)
        self.code, self.message, self.options = code, message, options or []


@dataclass
class Skill:
    name: str
    label: str
    description: str
    run: Callable[[Connection, str, dict], dict]
    properties: dict = field(default_factory=dict)
    required: list[str] = field(default_factory=list)
    risk: str = "safe"  # read: only looks | safe: changes the person's own data | confirm: tells other people, needs "confirmed"
    voice: bool = True  # may a phone call use it


SKILLS: dict[str, Skill] = {}


def skill(name: str, label: str, description: str, properties: dict | None = None, required: list[str] | None = None, risk: str = "safe", voice: bool = True):
    def wrap(fn):
        SKILLS[name] = Skill(name, label, description, fn, properties or {}, required or [], risk, voice)
        return fn
    return wrap


def S(desc: str, **extra) -> dict:
    return {"type": "STRING", "description": desc, **extra}


def B(desc: str) -> dict:
    return {"type": "BOOLEAN", "description": desc}


# ---------- helpers ----------
def _norm(s: str) -> str:
    return " ".join("".join(ch.lower() if ch.isalnum() else " " for ch in str(s or "")).split())


def pick(rows: list, words: str, key: Callable, what: str):
    """The one row whose text matches the words: exact, then 'contains', then every word present. Two or more matches (or none) is an answer, never a guess."""
    w = _norm(words)
    if not w:
        raise SkillError("name_needed", f"Which {what}?", [str(key(r)) for r in rows][:6])
    keyed = [(r, _norm(key(r))) for r in rows]
    for test in (lambda k: k == w, lambda k: w in k, lambda k: all(x in k for x in w.split())):
        hit = [r for r, k in keyed if test(k)]
        if len(hit) == 1:
            return hit[0]
        if len(hit) > 1:
            raise SkillError("which_one", f"More than one {what} fits.", [str(key(r)) for r in hit][:6])
    raise SkillError("not_found", f"I could not find that {what}.", [str(key(r)) for r in rows][:6])


def _tz(conn: Connection, me: str) -> int:
    return conn.execute(text("select coalesce(tz_offset_min, 480) from users where id = :u"), {"u": me}).scalar_one()


def _local(conn: Connection, me: str, iso: str | datetime | None, fmt: str = "%a %d %b, %H:%M") -> str:
    if not iso:
        return ""
    d = iso if isinstance(iso, datetime) else datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
    return (d.astimezone(UTC) + timedelta(minutes=_tz(conn, me))).strftime(fmt)


def _today_range(conn: Connection, me: str) -> tuple[datetime, datetime]:
    off = timedelta(minutes=_tz(conn, me))
    local_now = datetime.now(UTC) + off
    start = local_now.replace(hour=0, minute=0, second=0, microsecond=0) - off
    return start, start + timedelta(hours=24)


def _today_occurrences(conn: Connection, me: str) -> list[dict]:
    a, b = _today_range(conn, me)
    return cal.occurrences(conn, me, None, a, b, True)


def _gatherings(conn: Connection, me: str, limit: int = 10) -> list[dict]:
    return comm.upcoming(conn, me, limit)


def _tree(conn: Connection, me: str) -> dict:
    return nodes.tree(conn, me)


def _goals(tree: dict) -> list[dict]:
    areas = {n["nid"] for n in tree["nodes"] if n["type"] == "area" and n["key"] == "goals"}
    return [n for n in tree["nodes"] if n["type"] == "goal" and n["parent_id"] in areas]


# ---------- read ----------
@skill("my_day", "My day", "What is on the person's plan today (reminders, medicine, appointments, gatherings they said yes to), their next gathering, and whether they answered 'did you move today'. Use it for 'what do I have today', 'what is next', 'good morning'.", risk="read")
def my_day(conn, me, args):
    items = []
    for o in _today_occurrences(conn, me)[:10]:
        items.append({"title": o["title"], "at": _local(conn, me, o["occurs_at"], "%H:%M"), "kind": o["kind"], "done": o.get("status") == "done"})
    up = _gatherings(conn, me, 1)
    st = health.status(conn, me)
    return {"today": _local(conn, me, datetime.now(UTC), "%A %d %B"), "things_today": items,
            "next_gathering": ({"title": up[0]["title"], "when": _local(conn, me, up[0]["starts_at"]), "where": up[0]["location"], "community": up[0]["community_name"],
                                "i_am_going": up[0]["i_going"], "going": up[0]["going_count"]} if up else None),
            "moved_today_answered": st["answered"], "days_in_a_row": st["streak"]}


@skill("my_tree", "My tree", "How the person's tree is growing: leaves, level, habits with their streaks, goals with how far along they are, and their vision sentence. Use it for 'how am I doing', 'my progress', 'my tree'.", risk="read")
def my_tree(conn, me, args):
    t = _tree(conn, me)
    vision = conn.execute(text("select vision from users where id = :u"), {"u": me}).scalar()
    goals = []
    for g in _goals(t):
        steps = [n for n in t["nodes"] if n["type"] == "task" and n["parent_id"] == g["nid"]]
        goals.append({"goal": g["title"], "percent": round(g["progress"] * 100), "done": g["status"] == "closed", "steps_left": [s["title"] for s in steps if s["status"] != "closed"][:5]})
    return {"leaves": t["leaves"], "level": t["level"], "still_growing": t["growing"], "roots_health": round(t["roots"]["strength"] * 100),
            "habits": [{"habit": h["title"], "streak": h["streak"], "done_today": h["done_today"], "kind": h["kind"]} for h in t["habits"]], "goals": goals, "vision": vision}


@skill("market_events", "What is happening near me", "Opportunities near the person in the physical world, hosted by Active Ageing Centres, malls and others: market days, volunteering, paid gigs, shows, activities. Says where, when, who hosts it, what they can do there (earn, contribute, volunteer, enjoy), stalls left and whether they are going. "
       "Use it for 'what is on near me', 'is there a market this weekend', 'where can I volunteer', 'where can I earn a little'.", {"intent": S("earn, contribute, volunteer or enjoy (optional)"), "area": S("An area (optional)")}, risk="read")
def market_events(conn, me, args):
    return {"events": [{"title": e["title"], "kind": e["kind"], "host": e["host"], "venue": e["venue_name"], "when": _local(conn, me, e["starts_at"]), "what_you_can_do": e["intents"], "stalls_left": e["stalls_left"], "going": e["going_count"],
                        "i_am_going": e["i_going"], "my_communities_going": [c["name"] for c in e["my_communities"]]} for e in mevents.list_events(conn, me, 6, args.get("intent") or None, args.get("area") or None)]}


@skill("my_communities", "My communities", "The communities the person is in, and each one's next gathering.", risk="read")
def my_communities(conn, me, args):
    ups = _gatherings(conn, me, 10)
    out = []
    for c in comm.my_communities(conn, me):
        nxt = next((u for u in ups if u["community_id"] == c["id"]), None)
        out.append({"community": c["name"], "members": c["member_count"], "my_role": c["my_role"], "next": ({"title": nxt["title"], "when": _local(conn, me, nxt["starts_at"]), "i_am_going": nxt["i_going"]} if nxt else None)})
    return {"communities": out}


# ---------- change the person's own things ----------
@skill("checkin_today", "Did I move today", "Record the answer to 'did you move today?': moved true or false. A yes grows a leaf and strengthens the 'move every day' habit.", {"moved": B("true if they moved or exercised today")}, ["moved"])
def checkin_today(conn, me, args):
    return {"saved": True, **health.checkin(conn, me, bool(args.get("moved")), None)}


@skill("tick_reminder", "Tick a reminder done", "Mark one of today's planned things (medicine, an appointment, exercise) as done, by its title in words.", {"title": S("The reminder, in words, for example 'blood pressure tablet'")}, ["title"])
def tick_reminder(conn, me, args):
    rows = [o for o in _today_occurrences(conn, me) if o.get("item_id") and o.get("status") != "done"]
    o = pick(rows, args.get("title"), lambda r: r["title"], "reminder")
    when = o["occurs_at"] if isinstance(o["occurs_at"], str) else o["occurs_at"].isoformat()
    cal.mark(conn, me, str(o["item_id"]), when, "done")
    return {"done": o["title"]}


@skill("gathering_going", "Say I am going", "Say yes or no to a gathering in the person's communities, by its title in words.", {"title": S("The gathering, in words, for example 'kopi and stories'"), "going": B("true to say I'm going, false to say not this time")}, ["title", "going"])
def gathering_going(conn, me, args):
    g = pick(_gatherings(conn, me, 10), args.get("title"), lambda r: r["title"], "gathering")
    r = comm.rsvp(conn, me, g["id"], bool(args.get("going")))
    return {"gathering": g["title"], "when": _local(conn, me, g["starts_at"]), "going": r["going"], "going_count": r["going_count"]}


@skill("im_here", "I'm here", "Check the person in at a gathering that is starting or on now ('I'm here'). It grows a green leaf. Optional title in words; without it, the soonest one.", {"title": S("The gathering, in words (optional)")})
def im_here(conn, me, args):
    ups = _gatherings(conn, me, 5)
    if not ups:
        raise SkillError("nothing_on", "There is no gathering to check in to.")
    g = pick(ups, args["title"], lambda r: r["title"], "gathering") if args.get("title") else ups[0]
    try:
        comm_lead.check_in(conn, me, g["id"])
    except Exception as e:  # noqa: BLE001 - the window is checked in lead.check_in
        code = getattr(e, "code", "failed")
        raise SkillError(code, "Check-in opens an hour before it starts." if code == "not_open_yet" else "") from None
    return {"checked_in": g["title"]}


@skill("habit_done", "A habit done today", "Record that the person did one of their repeating habits today ('I watered the plants'), by its name in words. A habit done again and again makes the stem of their tree thicker.", {"name": S("The habit, in words"), "undo": B("true to take today's tick back")}, ["name"])
def habit_done(conn, me, args):
    t = _tree(conn, me)
    h = pick(t["habits"], args.get("name"), lambda r: r["title"], "habit")
    r = nodes.habit_log(conn, me, h["nid"], bool(args.get("undo")))
    return {"habit": h["title"], "streak": r["streak"], "done_today": r["done_today"]}


@skill("add_goal", "Add a goal", "Add a goal of the person's own, for example 'learn to video call my grandchildren'.", {"title": S("The goal")}, ["title"])
def add_goal(conn, me, args):
    return {"added": nodes.add_goal(conn, me, str(args.get("title") or ""))["title"]}


@skill("add_goal_step", "Add a step to a goal", "Add a step to one of the person's goals.", {"goal": S("The goal, in words"), "step": S("The step")}, ["goal", "step"])
def add_goal_step(conn, me, args):
    g = pick(_goals(_tree(conn, me)), args.get("goal"), lambda r: r["title"], "goal")
    return {"added": nodes.attach(conn, me, "task", str(args.get("step") or ""), parent_id=g["nid"])["title"], "to": g["title"]}


@skill("close_step", "Tick a step done", "Mark a step of one of the person's goals as done. It grows a green leaf.", {"step": S("The step, in words")}, ["step"])
def close_step(conn, me, args):
    t = _tree(conn, me)
    goal_ids = {g["nid"] for g in _goals(t)}
    steps = [n for n in t["nodes"] if n["type"] == "task" and n["parent_id"] in goal_ids and n["status"] != "closed"]
    s = pick(steps, args.get("step"), lambda r: r["title"], "step")
    nodes.set_badge(conn, me, s["nid"], {"status": "closed", "own": 1})
    return {"done": s["title"]}


@skill("set_vision", "Set my vision", "Save the person's vision sentence (what they want their year to look like). It shows under their tree.", {"text": S("The vision, one or two sentences")}, ["text"])
def set_vision(conn, me, args):
    v = str(args.get("text") or "").strip()[:500]
    if not v:
        raise SkillError("text_needed", "What is the vision?")
    conn.execute(text("update users set vision = :v where id = :u"), {"v": v, "u": me})
    return {"saved": v}


@skill("remember_about_me", "Remember something about me", "Save one short lasting fact the person told you about themselves (their family, a worry, what they enjoy, a plan), in a few words, so you remember it next time on any channel.", {"note": S("The fact, a few words, in third person, for example 'daughter Priya lives in Perth'")}, ["note"])
def remember_about_me(conn, me, args):
    from ..channels import memory

    note = str(args.get("note") or "").strip()
    if len(note) < 2:
        raise SkillError("note_needed", "What should I remember?")
    memory.add_fact(conn, me, note)
    return {"remembered": note[:300]}


@skill("market_going", "Go to a market event", "Say yes or no to a market event in a mall or community centre, by its title in words. With a community that planned a visit, the person goes together with it.", {"title": S("The market event, in words"), "going": B("true to say I'm going")}, ["title", "going"])
def market_going(conn, me, args):
    evs = mevents.list_events(conn, me, 20)
    e = pick(evs, args.get("title"), lambda r: r["title"] + " " + r["venue_name"], "market event")
    r = mevents.set_going(conn, me, e["id"], bool(args.get("going")))
    return {"event": e["title"], "venue": e["venue_name"], "when": _local(conn, me, e["starts_at"]), **r}


@skill("take_stall", "Take a stall", "For a senior: take a stall at a market event to sell something they make or show a skill. Slot is first, second or whole.", {
    "event": S("The market event, in words"), "selling": S("What they sell or the skill they show"), "slot": S("first, second or whole", enum=["first", "second", "whole"]), "helper": S("A helper's name (optional)")}, ["event", "selling"])
def take_stall(conn, me, args):
    e = pick(mevents.list_events(conn, me, 20), args.get("event"), lambda r: r["title"] + " " + r["venue_name"], "market event")
    mevents.take_stall(conn, me, e["id"], str(args.get("selling") or ""), args.get("helper"), str(args.get("slot") or "whole"))
    return {"stall": args.get("selling"), "at": e["venue_name"], "when": _local(conn, me, e["starts_at"])}


@skill("tell_family", "Tell my family I need help", "Send a help message to the person's family. This tells other people, so FIRST ask the person to confirm, then call it with confirmed true. It never calls an emergency number: for an emergency tell them to call 995 (Singapore) or 112 (India) themselves.",
       {"message": S("What to tell them (optional)"), "confirmed": B("true only after the person said yes")}, risk="confirm")
def tell_family(conn, me, args):
    r = health.send_help(conn, me, str(args.get("message") or "")[:300] or None)
    return {"family_told": r.get("family_told", 0)}


# ---------- running ----------
def get(name: str) -> Skill | None:
    return SKILLS.get(str(name))


def listing(voice_only: bool = False) -> list[dict]:
    return [{"name": s.name, "label": s.label, "description": s.description, "risk": s.risk} for s in SKILLS.values() if s.voice or not voice_only]


def declaration(s: Skill) -> dict:
    props = {k: v for k, v in s.properties.items()}
    return {"name": s.name, "description": s.description, "parameters": {"type": "OBJECT", "properties": props, "required": s.required}} if props else {"name": s.name, "description": s.description}


def declarations(voice_only: bool = False) -> list[dict]:
    return [declaration(s) for s in SKILLS.values() if s.voice or not voice_only]


def run(conn: Connection, me: str, name: str, args: dict | None) -> dict:
    """Runs one skill for one person. Never raises: every refusal is a small answer the agent can say."""
    s = get(name)
    if s is None:
        return {"error": "unknown_skill", "message": "That is not something I can do."}
    args = args if isinstance(args, dict) else {}
    missing = [k for k in s.required if args.get(k) in (None, "")]
    if missing:
        return {"error": "missing", "message": f"I need: {', '.join(missing)}."}
    if s.risk == "confirm" and args.get("confirmed") is not True:
        return {"error": "needs_confirmation", "message": "This tells other people. Ask the person if they want it, and call again with confirmed true only after they say yes."}
    try:
        with conn.begin_nested():
            return s.run(conn, me, args)
    except SkillError as e:
        return {"error": e.code, "message": e.message, **({"options": e.options} if e.options else {})}
    except NodeError as e:
        return {"error": e.code, "message": e.message}
    except Exception as e:  # noqa: BLE001 - the services raise their own coded errors (CommunityError, MarketError, HealthError, CalendarError)
        code = getattr(e, "code", None)
        if code:
            return {"error": str(code)}
        return {"error": "failed", "message": "That did not work just now."}


def run_for_user(user_id: str, name: str, args: dict | None) -> dict:
    """The same, with its own connection and its own transaction (for a phone call or a chat that has no request around it)."""
    from ...core.db import engine

    with engine().begin() as conn:
        return run(conn, user_id, name, args)


from . import everyday, onboarding, schedule, wisdom  # noqa: E402,F401  (registers the everyday, onboarding, scheduled-call and Wisdom skills)
from ..hosts import skill as host_skill  # noqa: E402,F401  (registers the host's own skills)
