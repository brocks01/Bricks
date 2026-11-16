"""Onboarding: the one place that knows which step a person is on. The app, the agent on a phone call and the chat all call these functions, so a person can
start on a call and finish in the app. A section can be answered in any order and in parts; only the required ones (about you, what you want, consent) must be done."""
import json
from datetime import date

from sqlalchemy import Connection, text

from ..identity import service as identity
from . import rules, wellbeing
from .rules import OnboardingError


def _row(conn: Connection, me: str):
    conn.execute(text("insert into profiles (user_id) values (:u) on conflict do nothing"), {"u": me})
    return conn.execute(text("select roles, answers, consents, completed_at from profiles where user_id = :u"), {"u": me}).one()


def _done(section: dict, answers: dict) -> bool:
    a = answers.get(section["id"]) or {}
    if not section["required"]:
        return bool(a)
    for q in section["questions"]:
        if not q["required"]:
            continue
        v = a.get(q["key"])
        if v is None or v == [] or (q["kind"] == "bool" and v is not True):
            return False
    return True


def _view(section: dict, answers: dict) -> dict:
    a = answers.get(section["id"]) or {}
    return {"id": section["id"], "title": section["title"], "required": section["required"], "done": _done(section, answers), "skipped": bool(a.get(rules.SKIPPED)),
            "questions": [{**q, "answer": a.get(q["key"])} for q in section["questions"]]}


def _prefilled(conn: Connection, me: str, answers: dict) -> dict:
    """What the person already told the app's first setup (name, language, age group, area, languages) counts as answered, so it is never asked twice."""
    u = conn.execute(text("select display_name, language, age_band, area_name, spoken_languages from users where id = :u"), {"u": me}).one()
    basics = dict(answers.get("basics") or {})
    for key in rules.ON_USER["basics"]:
        v = getattr(u, key)
        if key == "language" and not u.display_name:  # every account starts as English, so only someone who has been through the app's setup has really chosen
            continue
        if key not in basics and v not in (None, "", []):
            basics[key] = list(v) if key == "spoken_languages" else v
    return {**answers, "basics": basics}


def state(conn: Connection, me: str) -> dict:
    row = _row(conn, me)
    roles = list(row.roles or [])
    answers = _prefilled(conn, me, row.answers or {})
    sections = [_view(s, answers) for s in rules.applicable(roles)]
    todo = [s for s in sections if not s["done"] and not s["skipped"]]
    nxt = next((s for s in todo if s["required"]), None) or (todo[0] if todo else None)
    return {"completed": row.completed_at is not None, "roles": roles, "sections": sections, "next": nxt}


def answer(conn: Connection, me: str, section_id: str, values: dict) -> dict:
    s = rules.BY_ID.get(section_id)
    row = _row(conn, me)
    roles = list(row.roles or [])
    if section_id == "learn" and "learn" not in roles:  # answering what they want to learn makes them a learner
        add_role(conn, me, "learn")
        roles.append("learn")
    if s is None or s not in rules.applicable(roles):
        raise OnboardingError("no_such_section", "That part is not for this person.")
    if not isinstance(values, dict) or not values:
        raise OnboardingError("nothing_to_save", "There is nothing to save.")
    questions = {q["key"]: q for q in s["questions"]}
    cleaned = {}
    for key, value in values.items():
        if key not in questions:
            raise OnboardingError("unknown_question", f"There is no question called {key}.")
        cleaned[key] = rules.clean(questions[key], value)
    answers = dict(row.answers or {})
    mine = {k: v for k, v in (answers.get(section_id) or {}).items() if k != rules.SKIPPED}
    mine.update(cleaned)
    answers[section_id] = mine
    consents = dict(row.consents or {})
    if section_id == "consent":
        for key, v in cleaned.items():
            if v is True:
                consents.setdefault(key, date.today().isoformat())
            else:
                consents.pop(key, None)
    if section_id == "purpose":
        roles = cleaned["roles"]
    on_user = {k: cleaned[k] for k in rules.ON_USER.get(section_id, ()) if k in cleaned}
    if on_user:
        identity.update_profile(conn, me, on_user)
    if "vision" in cleaned:
        conn.execute(text("update users set vision = :v where id = :u"), {"v": cleaned["vision"], "u": me})
    conn.execute(text("update profiles set roles = :r, answers = cast(:a as jsonb), consents = cast(:c as jsonb), updated_at = now() where user_id = :u"),
                 {"r": roles, "a": json.dumps(answers), "c": json.dumps(consents), "u": me})
    if section_id == "wellbeing":
        wellbeing.record_due(conn, me, mine)
    return _finish_if_ready(conn, me)


def add_role(conn: Connection, me: str, role: str) -> None:
    """Something the person did shows what they are here for (offering to teach adds 'share', asking to learn adds 'learn'), so what they see follows what they do."""
    if role not in rules.ROLES:
        return
    _row(conn, me)
    conn.execute(text("update profiles set roles = array_append(roles, :r), updated_at = now() where user_id = :u and not (:r = any(roles))"), {"r": role, "u": me})


def skip(conn: Connection, me: str, section_id: str) -> dict:
    s = rules.BY_ID.get(section_id)
    row = _row(conn, me)
    if s is None or s not in rules.applicable(list(row.roles or [])):
        raise OnboardingError("no_such_section", "That part is not for this person.")
    if s["required"]:
        raise OnboardingError("cannot_skip", "That part is needed first.")
    answers = dict(row.answers or {})
    answers.setdefault(section_id, {})[rules.SKIPPED] = True
    conn.execute(text("update profiles set answers = cast(:a as jsonb), updated_at = now() where user_id = :u"), {"a": json.dumps(answers), "u": me})
    return state(conn, me)


def _finish_if_ready(conn: Connection, me: str) -> dict:
    st = state(conn, me)
    if not st["completed"] and all(s["done"] for s in st["sections"] if s["required"]) and any(s["id"] == "purpose" for s in st["sections"]):
        conn.execute(text("update profiles set completed_at = now() where user_id = :u"), {"u": me})
        st = state(conn, me)
    return st


def profile(conn: Connection, me: str) -> dict:
    """What every screen and every channel asks first: who is this person to Wisdom, and what should they see."""
    st = state(conn, me)
    u = conn.execute(text("select display_name, age_band from users where id = :u"), {"u": me}).one()
    chosen = bool(st["roles"])
    roles = st["roles"] if chosen else rules.default_roles(u.age_band)
    nxt = st["next"]
    return {"name": u.display_name, "roles": roles, "roles_chosen": chosen, "surfaces": rules.surfaces(roles), "focus": rules.focus(roles),
            "wisdom": {"parts": rules.wisdom_parts(roles), "default": rules.wisdom_default(roles)}, "onboarded": st["completed"],
            "next": {"id": nxt["id"], "title": nxt["title"], "required": nxt["required"]} if nxt else None}


def can_learn(conn: Connection, me: str) -> bool:
    """A learner must be an adult or have said they are 15 or older, before they can ask anyone for guidance."""
    band = conn.execute(text("select age_band from users where id = :u"), {"u": me}).scalar()
    if band in ("40to59", "60plus"):
        return True
    a = conn.execute(text("select answers from profiles where user_id = :u"), {"u": me}).scalar() or {}
    return (a.get("learn") or {}).get("age_15_plus") is True


def hint(conn: Connection, me: str) -> str:
    """One line for the agent's context: what this person is here for, and what to ask next (gently, one thing at a time)."""
    p = profile(conn, me)
    out = []
    if not p["name"] and not p["roles_chosen"]:
        out.append("They have only just arrived and you have never spoken: welcome them warmly, say in one sentence who you are, and ask what to call them.")
    if p["roles_chosen"]:
        out.append("They are here to: " + ", ".join(rules.ROLE_WORDS[r] for r in p["roles"]) + ".")
    check = wellbeing.due(conn, me)
    if check and (p["onboarded"] or check != "baseline"):
        out.append("A short, kind check on how connected they feel is due (three questions); ask it gently when it fits, with onboarding_next or wellbeing_check.")
    if p["next"]:
        out.append(f"Their setup is not finished. Next to learn, naturally and one question at a time, never like a form: {p['next']['title']}"
                   + (" (needed first)." if p["next"]["required"] else " (optional, skip if they would rather not)."))
    return " ".join(out)
