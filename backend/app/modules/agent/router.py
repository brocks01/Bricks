"""The in-app agent: one WebSocket per talk, from the signed-in app to Gemini Live (the same engine the phone call uses).

  WS /v1/agent/live
    app -> server   {type:"auth", token, page, tools:[{name,description,inputSchema}]}   (first message, within 10 s)
                    {type:"audio", data:<base64 PCM16 16 kHz mono>} | {type:"text", text} | {type:"toolResult", id, name, response} | {type:"end"}
    server -> app   {type:"ready"} | {type:"audio", data:<base64 PCM16 24 kHz mono>} | {type:"text", role:"agent"|"person", text}
                    {type:"toolCall", id, name, args} | {type:"interrupted"} | {type:"turn"} | {type:"error", message} | {type:"done"}

The app owns the tools and runs them (so the person sees the glow and gives approvals on their own screen); this server only relays.
The model's key stays here. A talk is capped in length, one at a time per person, and counted per hour."""
import asyncio
import json
import logging
import time

from fastapi import APIRouter, WebSocket
from sqlalchemy import text

from ...core import auth_state
from ...core.db import engine
from ..voice.config import config
from ..voice import tools as web
from ..voice.live import LiveSession
from .declarations import LANGUAGE_NAMES, declarations, guest_system_prompt, system_prompt

log = logging.getLogger("agent")
router = APIRouter()

MAX_TALK_SECONDS = 15 * 60
MAX_TALKS_PER_HOUR = 30
MAX_WEB_CALLS_PER_TALK = 20  # the search key is ours: a talk cannot spend it without limit
SERVER_TOOLS = [n for n in web.names() if n not in web.CALL_ONLY]  # web_search and read_page run HERE (the key stays on the server); every other tool runs in the app. calendar_outcome is call-only: it only makes sense on a phone reminder call.
GUEST_TOOLS = {"read", "tree", "search", "docs", "end"}  # before sign-in the agent may only LOOK: no opening, filling, pressing or running
_active: dict[str, WebSocket] = {}  # one talk per person: a new one replaces the old (a reload or a second screen must never lock the person out)
_recent: dict[str, list[float]] = {}


def _person(user_id: str):
    with engine().connect() as conn:
        return conn.execute(text("select display_name, language from users where id = :u and status = 'active'"), {"u": user_id}).first()


async def _send(ws: WebSocket, obj: dict) -> bool:
    try:
        await ws.send_text(json.dumps(obj))
        return True
    except Exception:  # noqa: BLE001 - the app went away
        return False


@router.websocket("/v1/agent/live")
async def live(ws: WebSocket):
    await ws.accept()
    cfg = config()
    live_session: LiveSession | None = None
    user_id = ""
    try:
        first = json.loads(await asyncio.wait_for(ws.receive_text(), 10))
        # A guest talk: no token, before sign-in (an elderly person who cannot follow the sign-in asks the agent for help).
        # The agent may only look at the open page and explain; it gets none of the acting tools and no web search.
        guest = first.get("type") == "auth" and not first.get("token") and bool(first.get("guest"))
        claims, _why = (None, "guest") if guest else (auth_state.verify(str(first.get("token") or "")) if first.get("type") == "auth" else (None, "invalid"))
        peer = ws.scope.get("client") if hasattr(ws, "scope") else None
        host = peer[0] if isinstance(peer, (tuple, list)) and peer else "unknown"
        user_id = str(claims["sub"]) if claims else (f"ip:{host}" if guest else None)
        row = _person(user_id) if claims else None
        if not row and not guest:
            await _send(ws, {"type": "error", "message": "unauthorized"})
            return await ws.close()
        if not cfg.gemini_key:
            await _send(ws, {"type": "error", "message": "unavailable"})
            return await ws.close()
        now = time.time()
        _recent[user_id] = [t for t in _recent.get(user_id, []) if now - t < 3600]
        if len(_recent[user_id]) >= MAX_TALKS_PER_HOUR:
            await _send(ws, {"type": "error", "message": "busy"})
            return await ws.close()
        old = _active.get(user_id)
        if old is not None:  # the newest talk wins; the old screen's talk is closed
            try:
                await old.close()
            except Exception:  # noqa: BLE001
                pass
        _active[user_id] = ws
        _recent[user_id].append(now)

        if guest:
            language = str(first.get("language") or "en")
            live_session = LiveSession(
                cfg,
                voice=cfg.voice,
                system_prompt=guest_system_prompt(language=language if language in LANGUAGE_NAMES else "en", page=str(first.get("page") or "")[:60] or None),
                tools=declarations([t for t in (first.get("tools") or []) if isinstance(t, dict) and t.get("name") in GUEST_TOOLS]),
            )
        else:
            live_session = LiveSession(
                cfg,
                voice=cfg.voice,
                system_prompt="\n\n".join([system_prompt(language=row.language, name=row.display_name, page=str(first.get("page") or "")[:60] or None), *web.hints(SERVER_TOOLS)]),
                tools=[*declarations(first.get("tools") or []), *web.declarations(SERVER_TOOLS)],
            )
        await live_session.open()
        deadline = time.monotonic() + MAX_TALK_SECONDS
        memo: dict = {}  # lives as long as the talk: what the last search found, so read_page can open a result by its id
        web_calls = 0

        async def run_server_tool(f: dict) -> None:
            nonlocal web_calls
            web_calls += 1
            args = f.get("args") or {}
            if web_calls > MAX_WEB_CALLS_PER_TALK:
                response = {"error": "Too many lookups in this talk. Say so briefly and carry on without searching."}
            else:
                # The person sees a plain phrase the app writes in their language; `name` lets the app localise it and `text` keeps an older build working.
                await _send(ws, {"type": "tool", "name": f["name"], "text": f"{f['name']}{': ' + str(args['query'])[:80] if args.get('query') else ''}"})
                response = await web.run(f["name"], args, memo)
            live_session.push({"toolResponse": {"id": f.get("id"), "name": f["name"], "response": response}})

        async def from_app() -> None:
            while True:
                m = json.loads(await ws.receive_text())
                kind = m.get("type")
                if kind == "audio" and m.get("data"):
                    live_session.push({"audio": m["data"]})
                elif kind == "text" and m.get("text"):
                    live_session.push({"text": str(m["text"])[:2000]})
                elif kind == "toolResult":
                    live_session.push({"toolResponse": {"id": m.get("id"), "name": m.get("name"), "response": m.get("response")}})
                elif kind == "end":
                    return

        async def from_model() -> None:
            async for f in live_session:
                t = f.get("type")
                if t == "audio":
                    ok = await _send(ws, {"type": "audio", "data": f["data"]})
                elif t == "text":
                    ok = await _send(ws, {"type": "text", "role": "agent", "text": f["text"]})
                elif t == "inputText":
                    ok = await _send(ws, {"type": "text", "role": "person", "text": f["text"]})
                elif t == "toolCall" and f["name"] in SERVER_TOOLS:
                    asyncio.create_task(run_server_tool(f))
                    ok = True
                elif t == "toolCall":
                    ok = await _send(ws, {"type": "toolCall", "id": f["id"], "name": f["name"], "args": f["args"]})
                elif t in ("ready", "interrupted", "turn", "done"):
                    ok = await _send(ws, {"type": t})
                elif t == "error":
                    log.warning("[agent] model error")
                    ok = await _send(ws, {"type": "error", "message": "model"})
                else:
                    ok = True
                if not ok or t == "done" or time.monotonic() > deadline:
                    return

        tasks = [asyncio.create_task(from_app()), asyncio.create_task(from_model())]
        await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED, timeout=MAX_TALK_SECONDS)
        for t in tasks:
            t.cancel()
    except Exception as e:  # noqa: BLE001 - a closed socket or a bad message ends the talk
        log.info("[agent] talk ended: %s", type(e).__name__)
    finally:
        if live_session:
            await live_session.close("app-ended")
        if user_id and _active.get(user_id) is ws:
            _active.pop(user_id, None)
        try:
            await ws.close()
        except Exception:  # noqa: BLE001
            pass
