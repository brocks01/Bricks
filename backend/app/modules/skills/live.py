"""The agent and the open screen. During a call or a chat Ken can see whether the person has the app open, and put a screen in front of them ("I have opened your calendar").
It only opens a page the app knows, only because the person asked to see it, and the app checks the move again. It never presses or fills anything on its own."""
from ..live import hub
from .registry import S, SkillError, skill

# What a person might say, and the app page it means. Pages that need an id, a secret or a sign-in step are not here on purpose.
SCREENS = {
    "home": ("home.index", "home"), "today": ("calendar.today", "today's plan"), "my day": ("calendar.today", "today's plan"), "calendar": ("calendar.today", "calendar"),
    "communities": ("connect.index", "communities"), "wisdom": ("wisdom.index", "Wisdom"), "stories": ("wisdom.story", "stories"), "market": ("market.index", "the market"),
    "health": ("health.index", "health"), "progress": ("grow.progress", "progress"), "my tree": ("grow.progress", "progress"), "profile": ("me.index", "profile"),
    "family": ("family.home", "family"), "my services": ("wisdom.myServices", "my services"), "wisdom history": ("wisdom.history", "my Wisdom sessions"),
    "teaching profile": ("wisdom.teachProfile", "my teaching profile"), "host": ("host.home", "my host page"), "messages": ("channels.notices", "messages"), "explore": ("explore.home", "Explore"),
}


@skill("is_app_open", "Is the app open", "Whether the person has the app or the website open right now, and which page. Use it before offering to show something on their screen, or when they ask 'can you see my screen'.", risk="read")
def is_app_open(conn, me, args):
    d = hub.devices(me)
    return {"app_open": bool(d), "screens": [{"page": x["page"], "device": x["device"]} for x in d]}


@skill("show_on_screen", "Show on my screen",
       "Open a page on the person's own screen, which they have open now: home, today, calendar, communities, wisdom, stories, market, health, progress, profile, family, messages, explore, my services, wisdom history, teaching profile, host. "
       "Use it only when they ask to see something, or you offered and they said yes. It opens the page; it does not press anything.",
       {"screen": S("Which one, in the person's words: home, today, calendar, communities, wisdom, stories, market, health, progress, profile, family, messages or explore")}, ["screen"])
def show_on_screen(conn, me, args):
    want = str(args.get("screen") or "").strip().lower()
    hit = SCREENS.get(want) or next((v for k, v in SCREENS.items() if k in want or want in k), None)
    if hit is None:
        raise SkillError("unknown_screen", "I do not have a screen by that name. I can show: " + ", ".join(sorted({v[1] for v in SCREENS.values()})) + ".", sorted({v[1] for v in SCREENS.values()}))
    reached = hub.open_page(me, hit[0])
    if not reached:
        return {"opened": False, "message": "Their app is not open right now, so I cannot show it. Offer to tell them in words instead, or to send a message."}
    return {"opened": True, "screen": hit[1], "screens_reached": reached}
