"""Everyday skills: the rest of what the platform does that a person may want by voice or chat, so the call and the chats can do what the app does:
know what is on and its details, find and join a community, set and cancel reminders, log a walk. The same services the app uses, so every rule holds here too."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from ..calendar import service as cal
from ..communities import rules as comm_rules
from ..communities import screens as comm_screens
from ..health import service as health
from ..market import events as mevents
from .registry import B, S, SkillError, _gatherings, _local, _tz, pick, skill

UTC = timezone.utc
KINDS = ("medicine", "appointment", "exercise", "event", "other")
REPEATS = ("none", "daily", "weekdays", "weekly")


def _events(conn, me: str) -> list[dict]:
    """Everything coming up for this person, in one list: gatherings in their communities and market events."""
    rows = [{"kind": "gathering", "id": g["id"], "title": g["title"], "starts_at": g["starts_at"], "where": g["location"], "community": g["community_name"],
             "going": g["going_count"], "i_going": g["i_going"]} for g in _gatherings(conn, me, 10)]
    rows += [{"kind": "market", "id": e["id"], "title": e["title"], "starts_at": e["starts_at"], "where": e["venue_name"], "community": None,
              "going": e["going_count"], "i_going": e["i_going"]} for e in mevents.list_events(conn, me, 10)]
    return sorted(rows, key=lambda r: r["starts_at"])


@skill("whats_on", "What is on", "Everything coming up for the person in one list: gatherings in their communities and market events, soonest first, with where, when, how many are going and whether they said yes. "
       "Use it for 'what is happening', 'any events this week', 'what can I go to'.", risk="read")
def whats_on(conn, me, args):
    return {"events": [{"title": r["title"], "type": "community gathering" if r["kind"] == "gathering" else "market event", "when": _local(conn, me, r["starts_at"]), "where": r["where"],
                        "community": r["community"], "going": r["going"], "i_am_going": r["i_going"]} for r in _events(conn, me)[:10]]}


@skill("event_details", "Event details", "Everything about ONE event by its name in words: what it is, when, where, who runs it, who is going, how many places or stalls are left, and whether the person is going. "
       "Use it for 'tell me about the kopi morning', 'where is the market', 'who is going'. To say yes or no afterwards use gathering_going (community gathering) or market_going (market event).",
       {"title": S("The event, in words")}, ["title"])
def event_details(conn, me, args):
    e = pick(_events(conn, me), args.get("title"), lambda r: r["title"], "event")
    if e["kind"] == "gathering":
        d = comm_screens.activity_detail(conn, me, e["id"])
        return {"title": d["title"], "type": "community gathering", "about": d["description"], "category": d["category"], "when": _local(conn, me, d["starts_at"]), "where": d["location"],
                "organiser": d["organiser"], "community": e["community"], "places": d["capacity"], "going": d["going_count"], "who_is_going": [g["name"] for g in d["going"] if g["name"]][:5],
                "i_am_going": d["i_going"], "rsvp_with": "gathering_going"}
    d = mevents.get_event(conn, me, e["id"])
    return {"title": d["title"], "type": "market event", "about": d["description"], "when": _local(conn, me, d["starts_at"]), "where": d["venue_name"], "address": d["address"],
            "stalls_left": d["stalls_left"], "going": d["going_count"], "selling": [f"{s['seller']}: {s['selling']}" for s in d["stalls"]][:6], "i_am_going": d["i_going"],
            "communities_going": [c["name"] for c in d["my_communities"]], "rsvp_with": "market_going"}


@skill("find_communities", "Find communities", "Look for communities the person could join, by a word (a hobby, an area, a name) or with nothing for the most popular. Says how many members and whether they are in it already. Use it for 'is there a gardening group', 'what groups are near me'.",
       {"search": S("A word to look for (optional)")}, risk="read")
def find_communities(conn, me, args):
    r = comm_rules.explore(conn, me, str(args.get("search") or ""), 8)
    return {"communities": [{"name": c["name"], "area": c["area_name"], "about": (c["description"] or "")[:120], "members": c["member_count"], "already_in": c["joined"], "circle": c["circle"], "audience": c["audience"], "can_join": c["can_join"], "open": c["privacy"] == "open"}
                            for c in r["communities"]], "places_left_for_me": r["limits"]["left"]}


@skill("join_community", "Join a community", "Join an open community, by its name in words. Ask the person first. Private communities need an invitation code from the community, so say so.",
       {"name": S("The community, in words")}, ["name"])
def join_community(conn, me, args):
    rows = comm_rules.explore(conn, me, "", 100)["communities"]
    c = pick([r for r in rows if not r["joined"]], args.get("name"), lambda r: r["name"], "community")
    if c["privacy"] != "open":
        raise SkillError("invite_only", "That community needs an invitation code from the people who run it.")
    comm_rules.join_open(conn, me, c["id"])
    return {"joined": c["name"]}


@skill("leave_community", "Leave a community", "Leave one of the person's communities, by its name in words. Ask first.", {"name": S("The community, in words")}, ["name"])
def leave_community(conn, me, args):
    from ..communities import service as comm

    c = pick(comm.my_communities(conn, me), args.get("name"), lambda r: r["name"], "community")
    comm_rules.leave(conn, me, c["id"])
    return {"left": c["name"]}


# ---------- reminders ----------
def _mine(conn, me: str):
    return conn.execute(text("select id, title, kind, local_time, repeat from calendar_items where person_id = :u and status = 'active' and coalesce(channel, 'app') <> 'call' and agent_brief is null "
                             "order by local_time"), {"u": me}).all()


@skill("add_reminder", "Add a reminder", "Put a reminder on the person's plan: medicine, an appointment, exercise or anything else, at a time, once or repeating (daily, weekdays, weekly). The app shows it too. "
       "Use it for 'remind me to take my tablet at 8', 'I have a doctor visit on Friday at 3'.",
       {"title": S("What it is, for example 'blood pressure tablet'"), "time": S("Local time HH:MM, 24 hour"), "kind": S("medicine, appointment, exercise, event or other", enum=list(KINDS)),
        "repeat": S("none, daily, weekdays or weekly", enum=list(REPEATS)), "date": S("First date YYYY-MM-DD (optional; default the next time that hour comes)"), "note": S("A short note (optional)")},
       ["title", "time"])
def add_reminder(conn, me, args):
    try:
        hh, mm = (int(x) for x in str(args["time"]).strip().split(":")[:2])
        assert 0 <= hh < 24 and 0 <= mm < 60
    except (ValueError, AssertionError):
        raise SkillError("bad_time", "What time? For example 8 in the morning.") from None
    kind, repeat = args.get("kind") or "other", args.get("repeat") or "none"
    if kind not in KINDS:
        kind = "other"
    if repeat not in REPEATS:
        raise SkillError("bad_repeat", "Once, daily, on weekdays or weekly?")
    title = str(args["title"]).strip()[:120]
    same = [r for r in _mine(conn, me) if r.title.lower() == title.lower() and r.local_time.strftime("%H:%M") == f"{hh:02d}:{mm:02d}" and r.repeat == repeat]
    if same:
        return {"already_there": title, "at": f"{hh:02d}:{mm:02d}", "repeat": repeat}
    off = _tz(conn, me)
    local_now = datetime.now(UTC) + timedelta(minutes=off)
    if args.get("date"):
        try:
            day = datetime.fromisoformat(str(args["date"])).date()
        except ValueError:
            raise SkillError("bad_date", "Which date?") from None
    else:
        day = local_now.date() if (hh, mm) > (local_now.hour, local_now.minute) else (local_now + timedelta(days=1)).date()
    sign = "+" if off >= 0 else "-"
    starts = f"{day.isoformat()}T{hh:02d}:{mm:02d}:00{sign}{abs(off) // 60:02d}:{abs(off) % 60:02d}"
    made = cal.create_item(conn, me, kind=kind, title=title, starts_at=starts, repeat=repeat, note=args.get("note"))
    return {"added": title, "first": f"{day.strftime('%a %d %b')} at {hh:02d}:{mm:02d}", "repeat": repeat, "id": made["id"]}


@skill("my_reminders", "My reminders", "The person's reminders and appointments for the next few days (default 3, up to 14), with the time of each. Use it for 'what is on this week', 'what reminders do I have'.",
       {"days": S("How many days ahead (optional, 1 to 14)")}, risk="read")
def my_reminders(conn, me, args):
    try:
        days = max(1, min(14, int(args.get("days") or 3)))
    except (TypeError, ValueError):
        days = 3
    off = timedelta(minutes=_tz(conn, me))
    start = (datetime.now(UTC) + off).replace(hour=0, minute=0, second=0, microsecond=0) - off
    out = []
    for o in cal.occurrences(conn, me, None, start, start + timedelta(days=days), True)[:40]:
        out.append({"title": o["title"], "when": _local(conn, me, o["occurs_at"]), "kind": o["kind"], "done": o.get("status") == "done"})
    return {"days": days, "reminders": out}


@skill("cancel_reminder", "Cancel a reminder", "Cancel one of the person's reminders, by its name in words. Ask first if it looks important (medicine).", {"title": S("The reminder, in words")}, ["title"])
def cancel_reminder(conn, me, args):
    r = pick(_mine(conn, me), args.get("title"), lambda x: x.title, "reminder")
    cal.cancel_item(conn, me, str(r.id))
    return {"cancelled": r.title}


@skill("log_walk", "Log a walk", "Record a walk the person did (how many minutes, and distance or steps if they know). It grows their tree. Use it for 'I walked for half an hour'.",
       {"minutes": S("How long, in minutes"), "distance_km": S("Distance in kilometres (optional)"), "steps": S("Steps (optional)")}, ["minutes"])
def log_walk(conn, me, args):
    try:
        minutes = int(float(str(args["minutes"])))
        assert 1 <= minutes <= 600
        km = float(args.get("distance_km") or 0)
        steps = int(float(args.get("steps") or 0))
        assert 0 <= km <= 100 and 0 <= steps <= 100000
    except (ValueError, AssertionError):
        raise SkillError("bad_walk", "How many minutes did you walk?") from None
    seconds = minutes * 60
    r = health.save_walk(conn, me, {"started_at": datetime.now(UTC) - timedelta(seconds=seconds), "duration_s": seconds, "moving_s": seconds, "distance_m": int(km * 1000), "steps": steps})
    return {"logged": f"{minutes} minutes", "id": r["id"]}


@skill("suggest_for_me", "Suggest groups for me", "Groups that match what the person enjoys, and whether several people nearby like the same thing and no group exists yet (then suggest starting one). Use it for 'what should I join', 'is there something for me'.", risk="read")
def suggest_for_me(conn, me, args):
    from ..insights import service as insights

    r = insights.suggest_communities(conn, me)
    if not r["suggestions"]:
        return {"note": "I do not know what they enjoy yet. Ask them about their hobbies and save it with save_answer (section rhythm, field interests)."}
    return {"suggestions": [{"interest": s["interest"], "people_nearby": s["nearby_people"], "groups": s["groups"], "could_start_one": s["start_one"]} for s in r["suggestions"]]}


@skill("set_contact_preference", "How to reach me", "Save where the person likes Wisdom to message them first (for a nudge, an introduction or a reminder): telegram, whatsapp, sms or app only. Use it for 'message me on WhatsApp', 'only use the app'.",
       {"channel": S("telegram, whatsapp, sms, call or app", enum=["telegram", "whatsapp", "sms", "call", "app"])}, ["channel"])
def set_contact_preference(conn, me, args):
    from ..onboarding import service as onboarding
    from ..onboarding.rules import OnboardingError

    try:
        onboarding.answer(conn, me, "channels", {"preferred_channel": args["channel"]})
    except OnboardingError as e:
        raise SkillError(e.code, e.message) from None
    return {"preferred": str(args["channel"]).lower()}


@skill("my_notifications", "What did I miss", "What Wisdom told the person while they were away (nudges, someone asking for their guidance, reminders). Reading them marks them as seen. Use it for 'what did I miss', 'any news'.", risk="read")
def my_notifications(conn, me, args):
    from ..channels import outbox

    r = outbox.inbox(me, 10)
    unread = [n["body"] for n in r["notifications"] if not n["read"]][:6]
    outbox.mark_read(me)
    return {"unread": unread, "count": len(unread)}


@skill("my_standing", "How often I come", "How often the person comes to one of their communities: times this month, last month, the streak of days and weeks, their level (newcomer, regular, stalwart) and who the regulars are. "
       "Use it for 'how am I doing in the jogging group', 'my streak'. Without a name it uses their only community.", {"community": S("The community, in words (optional if they are in one)")}, risk="read")
def my_standing(conn, me, args):
    from ..communities import service as comm
    from ..communities import standing as st

    mine = comm.my_communities(conn, me)
    if not mine:
        raise SkillError("no_community", "They are not in a community yet.")
    c = pick(mine, args.get("community"), lambda r: r["name"], "community") if args.get("community") or len(mine) > 1 else mine[0]
    r = st.standing(conn, me, c["id"])
    return {"community": c["name"], **{k: r[k] for k in ("this_month", "last_month", "total", "day_streak", "week_streak", "level")}, "regulars": [x["name"] for x in r["regulars"]]}
