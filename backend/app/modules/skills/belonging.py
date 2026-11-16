"""Belonging skills: the days a circle keeps, sending something for one of them from wherever the person is, saying they are away, and
the circle's stories. The same services the app uses, so every rule holds here too (members only, leaders only, the person's own choice)."""
from datetime import date

from ..belonging import service as belong
from ..communities import service as comm
from .registry import B, S, SkillError, pick, skill


def _when(iso: str) -> str:
    """A day as a person says it: Thu 20 Nov."""
    return date.fromisoformat(str(iso)[:10]).strftime("%a %d %b")


def _one_circle(conn, me: str, named: str | None) -> dict:
    """The circle these words mean: the one they named, or their only one (asking with its options when there is more than one)."""
    mine = comm.my_communities(conn, me)
    if not mine:
        raise SkillError("no_community", "They are not in a circle yet.")
    if named or len(mine) > 1:
        return pick(mine, named, lambda r: r["name"], "community")
    return mine[0]


@skill("our_days", "Our days", "The days the person's circles are keeping (a festival they keep together, or a day of their own), soonest first, with how many days to go "
       "and which circle keeps it. Use it for 'when is Chhath', 'what is our next festival', 'what days do we keep'.",
       {"community": S("The circle, in words (optional; with nothing it is every circle)")}, risk="read")
def our_days(conn, me, args):
    days = belong.my_days(conn, me)
    if args.get("community"):
        c = _one_circle(conn, me, str(args["community"]))
        days = [d for d in days if d["community_id"] == c["id"]]
    if not days:
        return {"days": [], "note": "No day is kept yet. A Community Lead can add one to the circle."}
    return {"days": [{"when": _when(d["starts_on"]), "day": d["name"], "in_days": d["days_to_go"], "circle": d["community_name"], "about": d["tradition"]}
                     for d in days[:8]]}


@skill("send_blessing", "Send for our day", "Send a blessing, message, recipe or story for one of the circle's days, from wherever the person is: the circle reads it and is told "
       "at most once a day. Ask them what to write first, and send it in their own words.",
       {"day": S("The day it is for, in words (optional)"), "community": S("The circle, in words (optional if they are in one)"),
        "kind": S("blessing, message, recipe or story", enum=list(belong.KINDS)), "text": S("What to send, in their own words")},
       ["text"])
def send_blessing(conn, me, args):
    days = belong.my_days(conn, me)
    if args.get("day"):
        day = pick(days, str(args["day"]), lambda r: r["name"], "day")
        circle_id, circle_name = day["community_id"], day["community_name"]
    else:
        c = _one_circle(conn, me, args.get("community"))
        circle_id, circle_name = c["id"], c["name"]
        mine_days = [d for d in days if d["community_id"] == circle_id]
        day = mine_days[0] if mine_days else None  # the soonest day of that circle, when it keeps one
    kind = str(args.get("kind") or "") if args.get("kind") in belong.KINDS else ("blessing" if day else "message")
    made = belong.add_contribution(conn, me, circle_id, day["id"] if day else None, kind, str(args.get("text") or ""))
    return {"sent": kind, "for": day["name"] if day else None, "circle": circle_name}


@skill("i_am_away", "I am away", "Say the person is away from their circle (with where, if they say it), or that they are back. It is private unless they ask for it to be shared: "
       "share true lets the circle see they are away, share false keeps it to themselves.",
       {"community": S("The circle, in words (optional if they are in one)"), "away": B("true to say they are away, false to say they are back (default true)"),
        "place": S("Where they are, a few words (optional)"), "share": B("true to let the circle see it (default false, which keeps it private)")})
def i_am_away(conn, me, args):
    c = _one_circle(conn, me, args.get("community"))
    away = args.get("away") is not False
    share = bool(args.get("share")) if args.get("share") is not None else None
    r = belong.set_presence(conn, me, c["id"], "away" if away else "here", args.get("place"), share)
    if not away:
        return {"back": c["name"]}
    return {"away_from": c["name"], "where": r["place"], "the_circle_can_see": r["share"]}


@skill("circle_stories", "Our stories", "The stories members of the person's circle have shared into it (a Wisdom story shared to the circle), newest first. "
       "Use it for 'show me our stories', 'what has the circle written'.",
       {"community": S("The circle, in words (optional if they are in one)")}, risk="read")
def circle_stories(conn, me, args):
    c = _one_circle(conn, me, args.get("community"))
    r = belong.circle_stories(conn, me, c["id"])
    if not r["stories"]:
        return {"stories": [], "note": "No story has been shared into this circle yet."}
    return {"circle": c["name"], "stories": [{"title": s["title"], "by": s["by"], "domain": s["kind"], "about": s["body"][:300]} for s in r["stories"]]}
