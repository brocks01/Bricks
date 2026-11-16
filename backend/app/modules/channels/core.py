"""The channel-neutral heart: a message arrives from some chat (Telegram now; WhatsApp or SMS later), is matched to a person, and is answered.
Commands (/today, /tree, /markets) are answered straight from the skills, so they work with no AI key at all. Everything else goes to the text agent.
Adapters (telegram.py) only carry text in and out."""
import os
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from ...core.db import engine
from ..skills import registry
from . import agent, guard

CODE_TTL = timedelta(minutes=15)
ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O/1/I/L: read aloud or typed by someone who is not used to it

HELP = ("I'm Ken. Ask me anything in your own words, for example “what's on today?”, “I walked this morning”, “I'm going to the kopi morning”.\n\n"
        "Quick words: /today · /tree · /markets · /help")
def not_linked(channel: str) -> str:
    return f"I don't know who you are yet. Open Interchange, go to Profile → Connect {channel.capitalize()}, and send me the code you see there."


# ---------- linking ----------
def new_link_code(user_id: str, channel: str = "telegram") -> dict:
    code = "".join(secrets.choice(ALPHABET) for _ in range(8))
    with engine().begin() as conn:
        conn.execute(text("delete from channel_link_codes where user_id = :u and channel = :c or expires_at < now()"), {"u": user_id, "c": channel})
        conn.execute(text("insert into channel_link_codes (code, user_id, channel, expires_at) values (:k, :u, :c, :e)"), {"k": code, "u": user_id, "c": channel, "e": datetime.now(timezone.utc) + CODE_TTL})
    return {"code": code, "expires_in_s": int(CODE_TTL.total_seconds())}


def link(channel: str, external_id: str, code: str) -> str | None:
    """Spends a one-time code and ties this chat to the person who made it. Returns the person's first name, or None if the code is wrong or old."""
    code = "".join(ch for ch in code.upper() if ch.isalnum())
    with engine().begin() as conn:
        row = conn.execute(text("delete from channel_link_codes where code = :k and channel = :c and expires_at > now() returning user_id"), {"k": code, "c": channel}).first()
        if row is None:
            return None
        conn.execute(text("insert into channel_links (channel, external_id, user_id) values (:c, :x, :u) on conflict (channel, external_id) do update set user_id = excluded.user_id, linked_at = now()"),
                     {"c": channel, "x": external_id, "u": row.user_id})
        name = conn.execute(text("select coalesce(nullif(split_part(display_name, ' ', 1), ''), '') from users where id = :u"), {"u": row.user_id}).scalar()
        return name or "friend"


def link_phone(user_id: str, number: str) -> bool:
    """Ties a phone number to a person so that calling Interchange from it reaches their account. Only for a number that is proven theirs (they messaged from it)
    or one the owner sets by hand. Returns False if it is not a valid international number."""
    from ..voice import logic as L

    n = L.normalize_number(number)
    if not L.is_e164(n):
        return False
    with engine().begin() as conn:
        conn.execute(text("insert into channel_links (channel, external_id, user_id) values ('phone', :x, :u) on conflict (channel, external_id) do update set user_id = excluded.user_id, linked_at = now()"), {"x": n, "u": user_id})
    return True


def unlink(user_id: str, channel: str = "telegram") -> int:
    with engine().begin() as conn:
        return conn.execute(text("delete from channel_links where user_id = :u and channel = :c"), {"u": user_id, "c": channel}).rowcount


def who(channel: str, external_id: str) -> str | None:
    with engine().connect() as conn:
        r = conn.execute(text("select user_id from channel_links where channel = :c and external_id = :x"), {"c": channel, "x": external_id}).first()
        return str(r.user_id) if r else None


def signup_open() -> bool:
    return (os.environ.get("WISDOM_OPEN_SIGNUP") or "true").strip().lower() not in ("0", "false", "no", "off")


def signup_cap() -> int:
    try:
        return int(os.environ.get("WISDOM_SIGNUPS_PER_HOUR") or 30)
    except ValueError:
        return 30


def resolve(channel: str, external_id: str) -> tuple[str | None, bool]:
    """Who is this sender? Returns (user id, newly made). An unknown sender gets a new account (the same one however they arrived: a call, a message, a chat),
    unless sign-up is closed (WISDOM_OPEN_SIGNUP=false) or too many were made this hour (WISDOM_SIGNUPS_PER_HOUR, so strangers cannot run up AI costs)."""
    from ..identity import service as identity

    uid = who(channel, external_id)
    if uid:
        return uid, False
    if channel in ("whatsapp", "sms"):  # a message from a number proves the number: if it already belongs to someone, it is them
        uid = who("phone", external_id)
        if uid:
            with engine().begin() as conn:
                conn.execute(text("insert into channel_links (channel, external_id, user_id) values (:c, :x, :u) on conflict do nothing"), {"c": channel, "x": external_id, "u": uid})
            return uid, False
    if not signup_open():
        return None, False
    number = external_id if channel in ("phone", "whatsapp", "sms") else None
    try:
        with engine().begin() as conn:
            recent = conn.execute(text("select count(*) from users where email is null and login_kind = 'own' and created_at > now() - interval '1 hour'")).scalar_one()
            if recent >= signup_cap():
                return None, False
            uid = identity.open_from_contact(conn, number)
            conn.execute(text("insert into channel_links (channel, external_id, user_id) values (:c, :x, :u)"), {"c": channel, "x": external_id, "u": uid})
    except IntegrityError:  # two messages from the same new sender at once: the other one made the account
        return who(channel, external_id), False
    if number and channel != "phone":
        link_phone(uid, number)
    return uid, True


def chat_ids(user_id: str, channel: str = "telegram") -> list[str]:
    with engine().connect() as conn:
        return [r.external_id for r in conn.execute(text("select external_id from channel_links where user_id = :u and channel = :c"), {"u": user_id, "c": channel})]


def linked(user_id: str, channel: str = "telegram") -> bool:
    return bool(chat_ids(user_id, channel))


# ---------- saying things back in plain words ----------
def _say_day(d: dict) -> str:
    out = [f"{d['today']}"]
    if d["things_today"]:
        out += [f"{'✓' if t['done'] else '•'} {t['at']}  {t['title']}" for t in d["things_today"]]
    else:
        out.append("Nothing planned for today.")
    g = d.get("next_gathering")
    if g:
        out.append(f"\nNext: {g['title']} with {g['community']}, {g['when']}" + (f" at {g['where']}" if g.get("where") else "") + (" — you're going 👍" if g["i_am_going"] else f" — {g['going']} going. Reply “I'm going to {g['title']}” to join."))
    out.append("\nDid you move today? Tell me and I'll note it." if not d["moved_today_answered"] else f"\nYou've moved {d['days_in_a_row']} day{'s' if d['days_in_a_row'] != 1 else ''} in a row." if d["days_in_a_row"] else "")
    return "\n".join(x for x in out if x is not None)


def _say_tree(t: dict) -> str:
    out = [f"🌳 Level {t['level']} · {t['leaves']} leaves · {t['still_growing']} still growing"]
    if t.get("vision"):
        out.append(f"Your vision: {t['vision']}")
    out += [f"🌱 {h['habit']} — {h['streak']} in a row" + (" ✓ today" if h["done_today"] else "") for h in t["habits"]]
    out += [f"🎯 {g['goal']} — {g['percent']}%" for g in t["goals"]]
    return "\n".join(out)


def _say_markets(m: dict) -> str:
    if not m["events"]:
        return "No market events coming up yet."
    return "\n\n".join(f"🛍 {e['title']}\n{e['venue']} · {e['when']}\n{e['going']} going" + (f" · with {', '.join(e['my_communities_going'])}" if e["my_communities_going"] else "") + (" · you're going 👍" if e["i_am_going"] else "") for e in m["events"][:4])


COMMANDS = {"/today": ("my_day", _say_day), "/tree": ("my_tree", _say_tree), "/markets": ("market_events", _say_markets)}
ALIASES = {"today": "/today", "my day": "/today", "my tree": "/tree", "tree": "/tree", "markets": "/markets", "market": "/markets", "help": "/help"}


# ---------- one incoming message ----------
def handle(channel: str, external_id: str, body: str) -> list[str]:
    """Always answers with one or more short texts. Never raises."""
    body = (body or "").strip()
    if not body:
        return []
    verdict = guard.check(channel, external_id)  # a stranger or a script cannot flood a chat: blocklist, bursts, an hourly limit
    if verdict is not None:
        return verdict
    body = guard.clip(body)
    low = body.lower()
    try:
        if low.startswith("/start"):
            arg = body[6:].strip()
            if arg:
                return [_linked_reply(channel, external_id, arg)]
            uid, new = resolve(channel, external_id)
            return [not_linked(channel)] if uid is None else [_welcome(uid, channel)] if new else [HELP]
        uid = who(channel, external_id)
        if uid is None:
            # a person may simply paste the code
            compact = "".join(ch for ch in body.upper() if ch.isalnum())
            if len(compact) == 8 and all(ch in ALPHABET for ch in compact):
                return [_linked_reply(channel, external_id, compact)]
            uid, new = resolve(channel, external_id)
            if uid is None:
                return [not_linked(channel)]
            if new:
                return [_welcome(uid, channel)]
        from . import checkins

        checkins.reply_seen(uid)  # any word from the person on any channel: they are not silent (the daily check-in counts)
        cmd = ALIASES.get(low.strip("/ .!"), low.split("@")[0])
        if cmd == "/help":
            return [HELP]
        if cmd == "/unlink":
            unlink(uid, channel)
            return ["Disconnected. You can connect again any time from the app."]
        if cmd in COMMANDS:
            skill_name, say = COMMANDS[cmd]
            r = registry.run_for_user(uid, skill_name, {})
            return [say(r) if "error" not in r else "That did not work just now."]
        if guard.too_many_replies_today(uid):
            return [guard.TOO_MUCH_TODAY]
        return [agent.reply(uid, channel, body)]
    except Exception:  # noqa: BLE001 - a chat must never see a stack trace
        return ["Something went wrong on my side. Please try again in a moment."]


WELCOME = ("Hello, I'm Ken. I'm a friend who can help you stay active and connected, and help you pass on what you know. "
           "You can talk to me here any time, in your own words. First, what should I call you?")


def _welcome(uid: str, channel: str) -> str:
    from . import memory

    memory.remember(uid, channel, "agent", WELCOME)
    return WELCOME


def _linked_reply(channel: str, external_id: str, code: str) -> str:
    name = link(channel, external_id, code)
    if name is not None and channel in ("whatsapp", "sms"):  # a message came from this number, so the number is theirs: they may phone Interchange from it too
        uid = who(channel, external_id)
        if uid:
            link_phone(uid, external_id)
    if name is None:
        return f"That code did not work. It lasts 15 minutes. Open Interchange → Profile → Connect {channel.capitalize()} for a new one."
    return f"Connected, {name}! 🎉\n\n{HELP}"


def notify(user_id: str, body: str, urgent: bool = False, kind: str = "info") -> dict:
    """Tell a person something outside a conversation. It goes through the outbox: their preferred channel, quiet hours, retries, and the in-app inbox."""
    from . import outbox

    return outbox.send(user_id, body, kind=kind, urgent=urgent)
