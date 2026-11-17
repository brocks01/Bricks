"""The live link between the open app or website and the server: "is this person here right now" and "something changed, refresh". See hub.py.

  WebSocket /v1/live        first message {"type":"auth","token":"<access token>","device":"<id this tab keeps>","page":"home.index"}; then {"type":"ping"} about every 25 s,
                            {"type":"page","page":"..."} whenever the screen changes. The server answers {"type":"ready"}, {"type":"pong"}, and sends "changed" and "open" messages.
  GET /v1/live/presence     the signed-in person's own live screens (for the app's own use and for tests).
The token is sent in the first message, not in the address, so it never lands in a log."""
import asyncio
import json
import logging
import threading
import time
import uuid

from fastapi import APIRouter, Depends, Request, WebSocket

from ...core import auth_state, security
from ..identity.router import current_user_id
from . import hub, topics

log = logging.getLogger("live")
router = APIRouter()
WRITES = {"POST", "PUT", "PATCH", "DELETE"}
SETTLE_SECONDS = 0.25  # the request's database change is saved a moment after the response starts; tell the screens just after that
COALESCE_SECONDS = 0.12  # several changes in a burst reach a screen as one message


def _clean(v, n: int) -> str:
    return "".join(ch for ch in str(v or "") if ch.isprintable())[:n]


async def _writer(ws: WebSocket, c: hub.Conn) -> None:
    """Sends what the hub hands to this screen. Messages about changes that arrive together are merged into one."""
    while True:
        msg = await c.queue.get()
        if msg.get("type") == "changed":
            merged = set(msg["topics"])
            rev = msg["rev"]
            await asyncio.sleep(COALESCE_SECONDS)
            while not c.queue.empty():
                nxt = c.queue.get_nowait()
                if nxt.get("type") == "changed":
                    merged |= set(nxt["topics"])
                    rev = max(rev, nxt["rev"])
                else:
                    await ws.send_text(json.dumps(nxt))
            msg = {"type": "changed", "topics": sorted(merged), "rev": rev}
        await ws.send_text(json.dumps(msg))


async def _reader(ws: WebSocket, c: hub.Conn) -> None:
    while True:
        try:
            frame = json.loads(await asyncio.wait_for(ws.receive_text(), hub.IDLE_SECONDS))
        except asyncio.TimeoutError:
            return  # not a word for too long: the screen is gone
        c.seen = time.time()
        kind = frame.get("type") if isinstance(frame, dict) else None
        if kind == "ping":
            await ws.send_text('{"type":"pong"}')
        elif kind == "page":
            c.page = _clean(frame.get("page"), 80)
        elif kind == "bye":
            return


@router.websocket("/v1/live")
async def live(ws: WebSocket):
    await ws.accept()
    c: hub.Conn | None = None
    try:
        first = json.loads(await asyncio.wait_for(ws.receive_text(), 10))
        try:
            claims, _why = (await asyncio.to_thread(auth_state.verify, str(first.get("token") or ""))) if first.get("type") == "auth" else (None, "invalid")
        except auth_state.Unavailable:
            claims = None
        if not claims:
            await ws.send_text('{"type":"error","message":"unauthorized"}')
            return await ws.close()
        user_id = str(claims["sub"])
        c = hub.Conn(user_id=user_id, device=_clean(first.get("device"), 40) or uuid.uuid4().hex[:8], loop=asyncio.get_running_loop(), queue=asyncio.Queue(), page=_clean(first.get("page"), 80))
        if not hub.register(c):
            await ws.send_text('{"type":"error","message":"too_many_screens"}')
            return await ws.close()
        await ws.send_text(json.dumps({"type": "ready", "rev": hub.current_rev(user_id), "ping_every_s": 25}))
        tasks = [asyncio.create_task(_reader(ws, c)), asyncio.create_task(_writer(ws, c))]
        await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for t in tasks:
            t.cancel()
    except Exception:  # noqa: BLE001 - a dropped socket, a bad first message: the screen simply reconnects
        pass
    finally:
        if c:
            hub.unregister(c)
        try:
            await ws.close()
        except Exception:  # noqa: BLE001
            pass


@router.get("/v1/live/presence")
def presence(me: str = Depends(current_user_id)):
    d = hub.devices(me)
    return {"live": bool(d), "devices": d}


def _user_of(request: Request) -> str | None:
    token = (request.headers.get("authorization") or "").removeprefix("Bearer ").strip()
    claims = security.read_claims(token) if token else None
    return str(claims["sub"]) if claims else None


async def after_write(request: Request, call_next):
    """Middleware: after any successful write by a signed-in person, tell their live screens what it touched (any device, including the one that wrote)."""
    response = await call_next(request)
    try:
        if request.method in WRITES and response.status_code < 400:
            path = request.url.path
            who = _user_of(request)
            if who:
                names = topics.for_path(path)
                if path.startswith("/v1/skills/"):
                    names = topics.for_skill(path.rsplit("/", 1)[-1])
                if names:
                    targets = {who}
                    behalf = (request.headers.get("x-bricks-on-behalf") or "").strip()
                    if behalf:  # a helper changed a family member's data: that person's own screens refresh too
                        targets.add(behalf)
                    for u in targets:
                        t = threading.Timer(SETTLE_SECONDS, hub.changed, args=(u, names))
                        t.daemon = True
                        t.start()
    except Exception:  # noqa: BLE001 - never let a notification problem break the real request
        log.exception("live: could not announce a change")
    return response
