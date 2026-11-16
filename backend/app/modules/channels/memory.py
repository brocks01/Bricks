"""One memory for one person, whatever the channel: what they said recently (a call, Telegram, WhatsApp) and the short facts they told Interchange about themselves.
Every interface asks this module for its context, so a person can start on the phone and carry on in a chat and Interchange still knows them."""
from sqlalchemy import text

from ...core.db import engine

KEEP = 60
FACTS = 15


def remember(user_id: str, channel: str, role: str, body: str) -> None:
    body = (body or "").strip()
    if not body:
        return
    with engine().begin() as conn:
        conn.execute(text("insert into channel_messages (user_id, channel, role, body) values (:u, :c, :r, :b)"), {"u": user_id, "c": channel, "r": role, "b": body[:4000]})
        conn.execute(text("delete from channel_messages where user_id = :u and id not in (select id from channel_messages where user_id = :u order by id desc limit :k)"), {"u": user_id, "k": KEEP})


def recent(user_id: str, limit: int = 10) -> list[dict]:
    with engine().connect() as conn:
        rows = conn.execute(text("select channel, role, body from channel_messages where user_id = :u order by id desc limit :n"), {"u": user_id, "n": limit}).all()
    return [{"channel": r.channel, "role": r.role, "body": r.body} for r in reversed(rows)]


def facts(user_id: str, limit: int = FACTS) -> list[str]:
    with engine().connect() as conn:
        return [r.note for r in conn.execute(text("select note from person_notes where user_id = :u order by id desc limit :n"), {"u": user_id, "n": limit})][::-1]


def add_fact(conn, user_id: str, note: str) -> None:
    conn.execute(text("insert into person_notes (user_id, note) select :u, :n where not exists (select 1 from person_notes where user_id = :u and lower(note) = lower(:n))"), {"u": user_id, "n": note.strip()[:300]})
    conn.execute(text("delete from person_notes where user_id = :u and id not in (select id from person_notes where user_id = :u order by id desc limit 100)"), {"u": user_id})


def context(user_id: str, max_chars: int = 1200) -> str:
    """A short text for the start of a conversation: who they are to Interchange, and what was said lately. Empty for someone new."""
    out = []
    with engine().connect() as conn:
        name = conn.execute(text("select coalesce(nullif(split_part(display_name, ' ', 1), ''), '') from users where id = :u"), {"u": user_id}).scalar()
    if name:
        out.append(f"Their name is {name}.")
    from ..onboarding import service as onboarding

    with engine().begin() as conn:
        hint = onboarding.hint(conn, user_id)
    f = facts(user_id)
    if f:
        out.append("What you know about them (they told you): " + "; ".join(f) + ".")
    r = recent(user_id, 8)
    if r:
        out.append("What was said lately, on any channel (oldest first): " + " | ".join(f"{'they' if m['role'] == 'person' else 'you'} ({m['channel']}): {m['body'][:140]}" for m in r))
    hint = hint[:380]  # the setup hint always fits; what is cut, if anything, is the oldest part of the memory
    return (" ".join(out)[: max(0, max_chars - len(hint) - 1)] + " " + hint).strip()
