"""python backend/run.py call you@example.com [+6591234567] [--lang en] [--brief "..."]   place ONE phone call to this person, who can then talk to Interchange and change their data by voice.
The call is placed through the running API (it owns the live call), using VOICE_ADMIN_KEY from backend/.env. Without a number, the first one in VOICE_ALLOWED_NUMBERS is used.
Run it only when the person knows the call is coming."""
import os
import sys

import httpx
from sqlalchemy import text

import app.core.config  # noqa: F401  (loads backend/.env)

from .core.db import engine
from .modules.skills import registry

BRIEF = ("You are Ken from Interchange, a friendly helper calling {who}. Greet them by name, say your name is Ken, and ask how they are. Then offer: what is on today, how their tree is growing, "
         "or to note something for them (they moved today, took medicine, are going to a gathering or a market). Do what they ask with your tools, then say in one sentence what you did. "
         "Keep it warm, short and slow. Never give medical advice. If they sound unwell or in danger, ask if you should tell their family and tell them to call 995 (Singapore) or 112 (India) for an emergency.")


def main(argv: list[str]) -> None:
    args = list(argv)
    lang, brief = "auto", None
    for flag in ("--lang", "--brief"):
        if flag in args:
            i = args.index(flag)
            val = args[i + 1] if i + 1 < len(args) else ""
            del args[i:i + 2]
            lang, brief = (val, brief) if flag == "--lang" else (lang, val)
    if not args:
        print(__doc__)
        return
    email = args[0].strip().lower()
    number = args[1] if len(args) > 1 else (os.environ.get("VOICE_ALLOWED_NUMBERS", "").split(",")[0].strip())
    key = (os.environ.get("VOICE_ADMIN_KEY") or "").strip()
    if not number or not key:
        print("Needs a number (argument or VOICE_ALLOWED_NUMBERS) and VOICE_ADMIN_KEY in backend/.env.")
        return
    with engine().connect() as conn:
        u = conn.execute(text("select id, display_name from users where lower(email) = :e"), {"e": email}).first()
    if u is None:
        print("No account with that email.")
        return
    first = (u.display_name or "").split(" ")[0] or "the person"
    body = {"to": number, "consent": True, "language": lang, "name": first if first != "the person" else "", "user_id": str(u.id),
            "brief": brief or BRIEF.format(who=first), "tools": ["web_search", *[s["name"] for s in registry.listing(voice_only=True)]]}
    r = httpx.post(f"http://localhost:{os.environ.get('PORT', '8000')}/v1/voice/calls", json=body, headers={"X-Voice-Admin-Key": key}, timeout=30)
    d = r.json()
    print("Calling…" if d.get("success") else f"Refused: {d.get('error')} — {d.get('message')}")
    if d.get("success"):
        print("call id:", d["data"]["call_id"], "| status:", d["data"]["status"])


if __name__ == "__main__":
    main(sys.argv[1:])
