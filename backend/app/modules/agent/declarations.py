"""Turns the app's tool list (JSON schema) into Gemini function declarations, and builds the in-app assistant's instruction.

The app owns the tools and runs them; this server only relays the model's requests to the app and the app's answers back.
Gemini accepts a smaller schema dialect than JSON Schema: upper-case types, no additionalProperties, and no empty objects or untyped values."""
import re

LANGUAGE_NAMES = {"en": "English", "hi": "Hindi", "bn": "Bengali", "ta": "Tamil", "zh": "Mandarin Chinese", "ms": "Malay"}
MAX_TOOLS = 20


def _schema(s: dict, note: str = "") -> dict:
    t = s.get("type")
    if t == "object":
        props = s.get("properties") or {}
        if not props:  # an object with no named fields cannot be declared: take it as JSON written out as text (the app parses it back)
            return {"type": "STRING", "description": ((s.get("description") or note) + " (a JSON object written as text)").strip()}
        out = {"type": "OBJECT", "properties": {k: _schema(v, k) for k, v in props.items()}}
        if s.get("required"):
            out["required"] = list(s["required"])
        return out
    if t in ("string", "number", "integer", "boolean"):
        out = {"type": t.upper()}
    elif t == "array":
        out = {"type": "ARRAY", "items": _schema(s.get("items") or {"type": "string"})}
    else:  # no type: a value of any kind; text is the safe choice
        out = {"type": "STRING"}
    if s.get("description"):
        out["description"] = str(s["description"])[:300]
    if s.get("enum"):
        out["enum"] = [str(x) for x in s["enum"]]
    return out


def declarations(tools: list[dict]) -> list[dict]:
    out = []
    for t in (tools or [])[:MAX_TOOLS]:
        name = str(t.get("name") or "")
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]{0,63}", name):
            continue
        d = {"name": name, "description": str(t.get("description") or "")[:1000]}
        params = _schema(t.get("inputSchema") or {"type": "object"})
        if params.get("type") == "OBJECT":
            d["parameters"] = params
        out.append(d)
    return out


def system_prompt(*, language: str, name: str | None, page: str | None) -> str:
    lang = LANGUAGE_NAMES.get(language, "English")
    who = (name or "").strip()
    return "\n".join([
        "You are the Bricks Agent inside the Bricks app: a neighbourhood club app run like a college society. The person is talking to you by voice or text, right now, in the app.",
        f"Speak and write in {lang} unless the person speaks another language; then follow them.",
        f"The person's name is {who}. Use it rarely, like a friend." if who else "You do not know the person's name yet.",
        "Keep every reply short and easy to hear: one to three sentences. Never read out file names, keys with dots, or code.",
        "You can DO things in the app with your tools, and the person watches the screen while you do. Walk the app one level at a time: use search or tree to find the right page or element, docs to read what it does, then open, fill, press or run. Never guess an element key: look it up first.",
        "Before you act, say in a few words what you are about to do. After you act, say what happened. If a tool says something needs the person's approval, tell them and wait; do not try again.",
        "Some things only the person may do (typing a sign-in code, Singpass, DigiLocker, signing out). If a tool says the person must do it, open the page and guide them in words instead.",
        "You can also look things up on the live web with web_search (and read_page for one result): use it for anything current or factual you are not sure of, such as weather, news, prices, dates, places. Never answer those from memory.",
        "Pages marked 'Coming soon' have nothing on them yet. Say so plainly; do not invent content, events, people or numbers.",
        "Never claim to be a person. For medical, legal or money questions give only general information and say a qualified person should confirm.",
        f"The page open right now is: {page}." if page else "",
        "Never ask for or repeat passwords, codes or keys.",
    ])
