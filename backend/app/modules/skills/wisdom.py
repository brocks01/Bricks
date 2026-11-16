"""Wisdom skills: capture what a person knows by talking (a call or a chat), share it, offer to teach, ask to learn, and answer introductions.
The agent listens to a story, asks a few questions, then saves it in the person's own words with capture_wisdom. Nothing is shown to anyone until the person clearly says to share it."""
from ..wisdom import service as w
from ..wisdom.service import WisdomError
from .registry import B, S, SkillError, pick, skill

CHANNELS = ["call", "telegram", "whatsapp", "sms", "app"]


def _do(fn, *a):
    try:
        return fn(*a)
    except WisdomError as e:
        raise SkillError(e.code, "That did not work." if e.status != 404 else "I could not find that.") from None


@skill("capture_wisdom", "Keep a story or lesson", "Save something the person knows or lived, in THEIR words: an experience in one of three domains: cultural (food, festivals, language, crafts, traditions), social (family, community, how to live a life) or professional (their work and trade). "
       "Listen first, ask a question or two, then write it down as they told it (in their language, first person, at least a few sentences). It stays private until they say to share it.",
       {"title": S("A short title, for example 'How I fixed a ship engine in a storm'"), "story": S("What they told you, in their words, first person"),
        "kind": S("cultural, social or professional", enum=list(w.CAPSULE_KINDS)), "tags": S("A few topic words, comma separated"),
        "source": S("The channel you are talking on", enum=CHANNELS)}, ["title", "story"])
def capture_wisdom(conn, me, args):
    r = _do(w.capture, conn, me, {"title": args["title"], "body": args["story"], "kind": args.get("kind") or "social", "tags": args.get("tags"),
                                  "source": args.get("source") if args.get("source") in w.SOURCES else "app"})
    return {"kept": str(args["title"])[:120], "status": r["status"], "note": "It is private. Ask if they would like to share it with younger people."}


def _mine(conn, me):
    return w.my_capsules(conn, me)


@skill("share_wisdom", "Share a story", "Share one of the person's kept stories with others (younger people can then read it), by its title in words. Others will see it with the person's first name, "
       "so ask them clearly first and call it with confirmed true only after they say yes.",
       {"title": S("The story, in words"), "confirmed": B("true only after the person said yes")}, ["title"], risk="confirm")
def share_wisdom(conn, me, args):
    c = pick([x for x in _mine(conn, me) if x["status"] == "draft"], args.get("title"), lambda r: r["title"], "kept story")
    _do(w.set_published, conn, me, c["id"], True)
    return {"shared": c["title"]}


@skill("unshare_wisdom", "Stop sharing a story", "Take one of the person's shared stories back to private, by its title in words.", {"title": S("The story, in words")}, ["title"])
def unshare_wisdom(conn, me, args):
    c = pick([x for x in _mine(conn, me) if x["status"] == "published"], args.get("title"), lambda r: r["title"], "shared story")
    _do(w.set_published, conn, me, c["id"], False)
    return {"private_again": c["title"]}


@skill("my_wisdom", "My Wisdom", "What the person has kept and offered in Wisdom: their stories (private or shared), what they offer to teach, what they asked to learn, and who is waiting for their answer.", risk="read")
def my_wisdom(conn, me, args):
    waiting = [c for c in w.my_connections(conn, me) if c["waiting_for_me"]]
    return {"stories": [{"title": c["title"], "kind": c["kind"], "shared": c["status"] == "published"} for c in _mine(conn, me)][:10],
            "offering": [{"title": o["title"], "kind": o["kind"], "mode": o["mode"], "status": o["status"]} for o in w.my_offers(conn, me)],
            "this_month": w.stats(conn, me), "asked_to_learn": [r["topic"] for r in w.my_requests(conn, me)], "waiting_for_my_answer": [{"from": c["with"], "about": c["about"], "message": c["message"]} for c in waiting]}


@skill("browse_wisdom", "Read shared stories", "Look in the library of stories and lessons that experienced people shared, by a word or a kind. Use it for 'is there anything about farming', 'read me a story'.",
       {"search": S("A word to look for (optional)"), "kind": S("professional (work and career), culture (traditions), community, social (social life) or life (a life lesson) (optional)", enum=list(w.CAPSULE_KINDS))}, risk="read")
def browse_wisdom(conn, me, args):
    return {"stories": [{"title": c["title"], "by": c["by"], "kind": c["kind"], "text": c["body"][:600]} for c in w.library(conn, me, args.get("search"), args.get("kind") or None, 5)]}


@skill("offer_to_teach", "Offer to teach", "Put up what the person can offer: mentoring, a workshop, or paid freelance work, with whether it is free, paid or either, and when they are free. Younger people can then ask them for guidance.",
       {"title": S("What they offer, for example 'Teach the basics of accounting'"), "about": S("A sentence or two about it (optional)"), "kind": S("mentoring, workshop or freelance", enum=list(w.OFFER_KINDS)),
        "mode": S("volunteer, paid or either", enum=list(w.MODES)), "availability": S("When they are free, in words (optional)"), "domain": S("cultural, social or professional (optional)", enum=list(w.CAPSULE_KINDS)),
        "price_note": S("If paid, a short price note such as '$30 an hour, first call free' (optional)")}, ["title"])
def offer_to_teach(conn, me, args):
    r = _do(w.create_offer, conn, me, {k: args.get(k) for k in ("title", "about", "kind", "mode", "availability", "domain", "price_note") if args.get(k)})
    return {"offered": str(args["title"])[:120], "status": r["status"]}


@skill("pause_offer", "Pause an offer", "Pause or close one of the person's offers, by its title in words.", {"title": S("The offer, in words"), "close": B("true to close it for good; otherwise it is paused")}, ["title"])
def pause_offer(conn, me, args):
    o = pick([x for x in w.my_offers(conn, me) if x["status"] == "active"], args.get("title"), lambda r: r["title"], "offer")
    _do(w.set_offer_status, conn, me, o["id"], "closed" if args.get("close") is True else "paused")
    return {"stopped": o["title"], "closed": args.get("close") is True}


@skill("find_a_mentor", "Find a mentor", "Look for experienced people who offer to teach or do something, by a word, a kind (mentoring, workshop, freelance) or free or paid. Use it for 'who can teach me accounting', 'I need someone to help with my business plan'.",
       {"search": S("What they want to learn (optional)"), "kind": S("mentoring, workshop or freelance (optional)", enum=list(w.OFFER_KINDS)), "mode": S("volunteer or paid (optional)", enum=["volunteer", "paid"]), "domain": S("cultural, social or professional (optional)", enum=list(w.CAPSULE_KINDS))}, risk="read")
def find_a_mentor(conn, me, args):
    return {"offers": [{"title": o["title"], "by": o["by"], "kind": o["kind"], "mode": o["mode"], "when": o["availability"], "about": (o["about"] or "")[:160]}
                       for o in w.browse_offers(conn, me, args.get("search"), args.get("kind") or None, args.get("mode") or None, 6, args.get("domain") or None)]}


@skill("ask_for_guidance", "Ask a mentor", "Ask one of the offers found by find_a_mentor for guidance, with a short message. This sends a note to that person, so ask the learner to confirm first, "
       "then call it with confirmed true. The mentor decides; nobody is forced.",
       {"offer": S("The offer, in words"), "message": S("A short message to the mentor (optional)"), "confirmed": B("true only after the person said yes")}, ["offer"], risk="confirm")
def ask_for_guidance(conn, me, args):
    o = pick(w.browse_offers(conn, me, None, None, None, 50), args.get("offer"), lambda r: r["title"], "offer")
    r = _do(w.ask_offer, conn, me, o["id"], args.get("message"))
    return {"asked": r["to"], "about": r["about"], "status": "waiting for their answer"}


@skill("ask_to_learn", "Say what I want to learn", "Post what the person wants to learn or needs help with, so experienced people can offer to help.",
       {"topic": S("What they want to learn, for example 'how to start a small business'"), "about": S("A line or two of detail (optional)")}, ["topic"])
def ask_to_learn(conn, me, args):
    _do(w.create_request, conn, me, {"topic": args["topic"], "about": args.get("about")})
    return {"posted": str(args["topic"])[:120]}


@skill("who_wants_to_learn", "Who wants to learn", "What younger people are asking to learn, for a mentor who might help, by a word (optional).", {"search": S("A word to look for (optional)")}, risk="read")
def who_wants_to_learn(conn, me, args):
    return {"requests": [{"topic": r["topic"], "by": r["by"], "about": (r["about"] or "")[:160]} for r in w.open_requests(conn, me, args.get("search"), 30, "learn")[:6]]}


@skill("offer_help_with", "Offer to help a learner", "Offer to help one of the learners found by who_wants_to_learn, with a short message. This sends a note to that person, so ask the mentor to confirm, then call it with confirmed true. The learner decides.",
       {"topic": S("The request, in words"), "message": S("A short message (optional)"), "confirmed": B("true only after the person said yes")}, ["topic"], risk="confirm")
def offer_help_with(conn, me, args):
    r = pick(w.open_requests(conn, me, None, 50), args.get("topic"), lambda x: x["topic"], "request")
    out = _do(w.answer_request, conn, me, r["id"], args.get("message"))
    return {"offered_to": out["to"], "about": out["about"], "status": "waiting for their answer"}


@skill("my_introductions", "My introductions", "The introductions the person is part of: who, what about, whether it is waiting for their answer, accepted or declined. Use it for 'who wants my help', 'did anyone answer'.", risk="read")
def my_introductions(conn, me, args):
    return {"introductions": [{"with": c["with"], "about": c["about"], "i_am": c["i_am"], "status": c["status"], "waiting_for_me": c["waiting_for_me"], "message": c["message"]} for c in w.my_connections(conn, me)]}


@skill("reply_to_introduction", "Answer an introduction", "Say yes or no to a person who asked for the person's guidance or offered to help them, by their name or topic in words. Only the person who was asked can answer. "
       "This tells the other person, so ask first and call with confirmed true only after the person decided.",
       {"who": S("The other person or the topic, in words"), "accept": B("true to say yes, false for not this time"), "confirmed": B("true only after the person said yes to answering")}, ["who", "accept"], risk="confirm")
def reply_to_introduction(conn, me, args):
    waiting = [c for c in w.my_connections(conn, me) if c["waiting_for_me"]]
    c = pick(waiting, args.get("who"), lambda r: f"{r['with']} {r['about']}", "introduction")
    out = _do(w.decide, conn, me, c["id"], bool(args.get("accept")))
    return {"answered": out["with"], "status": out["status"]}


@skill("log_wisdom_session", "Note that we talked", "Record that the person just talked with someone they are connected to in Wisdom (a mentor or a learner), and for how many minutes. Use it after 'I spoke with Priya for half an hour'. It adds to their monthly calls and people helped.",
       {"who": S("The other person or the topic, in words"), "minutes": S("How long, in minutes")}, ["who", "minutes"])
def log_wisdom_session(conn, me, args):
    mine = [c for c in w.my_connections(conn, me) if c["status"] == "accepted"]
    c = pick(mine, args.get("who"), lambda r: f"{r['with']} {r['about']}", "introduction")
    _do(w.log_session, conn, me, c["id"], args.get("minutes"))
    return {"noted": c["with"], "minutes": args.get("minutes"), "this_month": w.stats(conn, me)}


@skill("ask_for_help", "Ask the next generation for a hand", "An older person asks for support: a hand with their phone, a video call to the grandchildren, company on a walk, an errand. Posts it so younger people can offer to help. The person decides who to say yes to.",
       {"topic": S("What they need a hand with, for example 'set up video calls with my grandchildren'"), "about": S("A line or two of detail (optional)")}, ["topic"])
def ask_for_help(conn, me, args):
    _do(w.create_request, conn, me, {"topic": args["topic"], "about": args.get("about"), "kind": "support"})
    return {"posted": str(args["topic"])[:120], "note": "Younger people can now offer to help; they will decide who to say yes to."}


@skill("who_needs_help", "Who needs a hand", "For a younger person who wants to support the elderly: what older people are asking for a hand with, by a word (optional). Use it for 'who can I help', 'is anyone near me needing a hand'.",
       {"search": S("A word to look for (optional)")}, risk="read")
def who_needs_help(conn, me, args):
    return {"requests": [{"topic": r["topic"], "by": r["by"], "about": (r["about"] or "")[:160]} for r in w.open_requests(conn, me, args.get("search"), 30, "support")[:6]]}
