"""Onboarding skills: the same steps the app shows, spoken. A person can finish their setup on a phone call, a chat or in the app, because all of them
read and write the one onboarding module (modules/onboarding). The agent asks one thing at a time and saves each answer as the person gives it."""
from ..onboarding import rules, service
from ..onboarding.rules import OnboardingError
from .registry import B, S, SkillError, skill


def _guard(fn):
    try:
        return fn()
    except OnboardingError as e:
        raise SkillError(e.code, e.message) from None


@skill("my_profile", "My profile", "Who the person is to Wisdom: what they are here for, what parts of Wisdom they can use, and whether their setup is finished.", risk="read")
def my_profile(conn, me, args):
    return service.profile(conn, me)


@skill("onboarding_next", "What to ask next", "The next part of the person's setup and its questions that are still unanswered. Ask them in your own words, one at a time, never as a form. "
       "Returns done when nothing is left.", risk="read")
def onboarding_next(conn, me, args):
    nxt = service.state(conn, me)["next"]
    if not nxt:
        return {"done": True}
    todo = [{"field": q["key"], "ask": q["label"], "kind": q["kind"], "options": q["options"], "needed": q["required"]} for q in nxt["questions"] if q["answer"] in (None, [])]
    return {"section": nxt["id"], "title": nxt["title"], "required": nxt["required"], "questions": todo}


@skill("save_answer", "Save an answer", "Save one thing the person told you for their setup, for example section basics, field display_name, value 'Meena'. Lists are comma separated "
       "(roles: connect, share, learn, help, care). Consent has its own skill. Use the field names that onboarding_next gave you.",
       {"section": S("The section id from onboarding_next"), "field": S("The field name"), "value": S("What the person said, in a few words")}, ["section", "field", "value"])
def save_answer(conn, me, args):
    section, field = str(args["section"]).strip(), str(args["field"]).strip()
    if section == "consent":
        raise SkillError("use_give_consent", "Consent needs the person's clear yes. Use give_consent.")
    st = _guard(lambda: service.answer(conn, me, section, {field: args["value"]}))
    return {"saved": field, "setup_finished": st["completed"], "next": (st["next"] or {}).get("title")}


@skill("give_consent", "Record a consent", "Record one consent the person gave: privacy (keep my information private), terms, notes_memory (remember what I tell it) or family_share. "
       "Ask first, explain it in a sentence, and call it with confirmed true only after they clearly say yes.",
       {"which": S("privacy, terms, notes_memory or family_share"), "confirmed": B("true only after the person said yes")}, ["which"], risk="confirm")
def give_consent(conn, me, args):
    which = str(args["which"]).strip().lower()
    if which not in rules.CONSENTS:
        raise SkillError("unknown_consent", "The choices are: " + ", ".join(rules.CONSENTS), list(rules.CONSENTS))
    st = _guard(lambda: service.answer(conn, me, "consent", {which: True}))
    return {"consented": which, "setup_finished": st["completed"]}


@skill("skip_section", "Skip an optional part", "The person would rather not answer an optional part of their setup now. Needed parts cannot be skipped.",
       {"section": S("The section id from onboarding_next")}, ["section"])
def skip_section(conn, me, args):
    st = _guard(lambda: service.skip(conn, me, str(args["section"]).strip()))
    return {"skipped": str(args["section"]).strip(), "next": (st["next"] or {}).get("title")}


@skill("wellbeing_check", "How connected they feel", "Record the answers to three short questions about feeling connected, asked gently when onboarding_next or your notes say the check is due: "
       "how often they lack company, feel left out, feel isolated. Each answer is hardly_ever, some_of_the_time or often. Private: never shown to anyone as an individual.",
       {"lack_companionship": S("hardly_ever, some_of_the_time or often", enum=["hardly_ever", "some_of_the_time", "often"]),
        "feel_left_out": S("hardly_ever, some_of_the_time or often", enum=["hardly_ever", "some_of_the_time", "often"]),
        "feel_isolated": S("hardly_ever, some_of_the_time or often", enum=["hardly_ever", "some_of_the_time", "often"])}, ["lack_companionship", "feel_left_out", "feel_isolated"])
def wellbeing_check(conn, me, args):
    from ..onboarding import wellbeing

    answers = {k: str(args[k]).strip().lower().replace(" ", "_") for k in wellbeing.KEYS}
    if wellbeing.score(answers) is None:
        raise SkillError("bad_answer", "Each answer is: hardly ever, some of the time, or often.")
    r = wellbeing.record_due(conn, me, answers)
    return {"saved": True, "thanks": "Thank you for telling me."} if r else {"saved": False, "note": "No check is due right now."}
