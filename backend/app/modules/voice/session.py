"""One phone call: its audio socket on one side, one live AI session on the other.

  phone (8 kHz mu-law) --from_phone--> 16 kHz PCM --push--> Gemini Live
  phone <--to_phone-- 24 kHz PCM <-- frames <-- Gemini Live

How a call ends (never under someone who still wants to talk): the person hangs up or says goodbye (the model then says goodbye and calls end_call)
| the model decides it is finished (end_call) | an administrator hangs up | the long SAFETY limit, after warnings.
The planned time is soft: the model is told when it runs low, tells the person, and asks; extend_call adds more."""
import asyncio
import base64
import hmac
import logging
import time

from fastapi import WebSocket

from . import controls, store, tools, twilio as proto
from .audio import PhoneAudio
from .config import config
from .live import LiveSession
from .logic import LANGUAGES, build_system_prompt, mask

log = logging.getLogger("voice")

_live: dict[str, "CallSession"] = {}  # call_id -> session, so an admin can hang a call up
MAX_BUFFERED_UPLINK = 160000  # bytes of 16 kHz audio held before the AI session is ready (about 5 s)
MS_HINT = 60.0


def _spoken_left(seconds: float) -> str:
    return "a minute" if seconds >= 60 else f"{max(1, round(seconds))} seconds"


class CallSession:
    def __init__(self, ws: WebSocket):
        self.ws = ws
        self.cfg = config()
        self.audio = PhoneAudio()
        self.memo: dict = {}
        self.soft = self.cfg.soft_limit_s
        self.hard = max(self.cfg.hard_limit_s, self.soft)
        self.extend = self.cfg.extend_s
        self.stream_sid: str | None = None
        self.record: dict | None = None
        self.live: LiveSession | None = None
        self.ready = False
        self.ended = False
        self.closing = False  # the model asked to end the call: let its goodbye finish playing, then hang up
        self.drained = False
        self.soft_at = 0.0
        self.hard_at = 0.0
        self.timers: list[asyncio.TimerHandle] = []
        self.drain_timer: asyncio.TimerHandle | None = None
        self.close_timer: asyncio.TimerHandle | None = None
        self.uplink = bytearray()
        self.held = bytearray()  # phone audio that arrived before the AI session said ready
        self.pump_task: asyncio.Task | None = None

    def tag(self) -> str:
        return f"call {self.record['call_id'][:8]} ({mask(self.record['to'])})" if self.record else "call ?"

    async def send(self, data: str) -> None:
        try:
            await self.ws.send_text(data)
        except Exception:  # noqa: BLE001 - the socket is gone
            pass

    def push(self, frame: dict) -> None:
        if self.live:
            self.live.push(frame)

    def note(self, text: str) -> None:
        """A message from the call system to the model, as a typed turn. The model is told never to read these aloud."""
        self.push({"text": f"[Call system note, not the person speaking. Never read this aloud.] {text}"})

    # ---- time: a planned (soft) time that can be extended, and a long safety (hard) limit; the model hears about both before anything happens
    def clear_timers(self) -> None:
        for t in self.timers:
            t.cancel()
        self.timers = []

    def at(self, when: float, fn) -> None:
        if when < time.monotonic() - 1:
            return  # already past: not worth saying now
        loop = asyncio.get_running_loop()
        self.timers.append(loop.call_later(max(0.0, when - time.monotonic()), lambda: None if (self.ended or self.closing) else fn()))

    def arm_limits(self) -> None:
        self.clear_timers()
        soft_lead = min(MS_HINT, self.soft / 3)
        hard_lead = min(MS_HINT, self.hard / 3)
        self.at(self.soft_at - soft_lead, lambda: self.note(
            f"About {_spoken_left(soft_lead)} of this call's planned time is left. Mention it gently in the person's language and ask whether they would like to keep going. "
            "If they do, call extend_call. If they are done, say a warm goodbye and call end_call."))
        self.at(self.soft_at, lambda: self.note(
            "The planned time is up. If the person is still talking, let them finish; then ask whether they want to continue. "
            "If yes, call extend_call. If they are done, say goodbye and call end_call. Never cut someone off mid-sentence."))
        self.at(self.hard_at - hard_lead, lambda: self.note(
            f"This is the longest the call may run, and it ends in about {_spoken_left(hard_lead)}. Tell the person kindly, wrap up, say a warm goodbye, then call end_call."))

        def hard_over() -> None:
            if self.ended or self.closing:
                return
            self.note("The maximum time is over. Say a short goodbye now, then call end_call.")
            self.timers.append(asyncio.get_running_loop().call_later(min(20.0, self.hard / 3), lambda: asyncio.create_task(self.finish("max-duration"))))

        self.timers.append(asyncio.get_running_loop().call_later(max(0.0, self.hard_at - time.monotonic()), hard_over))

    def extend_call(self) -> dict:
        now = time.monotonic()
        if self.hard_at - now < min(15.0, self.hard / 10):
            return {"extended": False, "note": "The maximum time is reached. Tell the person kindly, say goodbye, then call end_call."}
        base = max(self.soft_at, now)
        nxt = min(base + self.extend, self.hard_at)
        self.soft_at = nxt
        self.arm_limits()
        return {"extended": True, "minutesAdded": round((nxt - base) / 60, 1), "note": "More time was added. Carry on with the conversation."}

    # ---- ending on the model's request: let the goodbye finish playing first
    async def begin_drain(self) -> None:
        if self.drained or self.ended:
            return
        self.drained = True
        if self.close_timer:
            self.close_timer.cancel()
        await self.send(proto.build_mark(self.stream_sid, "bye"))  # the provider answers when everything before it has been played
        self.drain_timer = asyncio.get_running_loop().call_later(self.cfg.end_grace_ms / 1000, lambda: asyncio.create_task(self.finish("ended-by-agent")))

    def request_end(self) -> None:
        if self.closing:
            return
        self.closing = True
        self.clear_timers()
        # Normally the model's turn ends right after it says goodbye; if that never arrives, drain anyway.
        self.close_timer = asyncio.get_running_loop().call_later(self.cfg.end_grace_ms * 2 / 1000, lambda: asyncio.create_task(self.begin_drain()))

    def flush_uplink(self) -> None:
        if not self.uplink:
            return
        chunk = bytes(self.uplink)
        self.uplink.clear()
        if not self.ready:
            if len(self.held) + len(chunk) <= MAX_BUFFERED_UPLINK:
                self.held += chunk
            return
        self.push({"audio": base64.b64encode(chunk).decode()})

    # ---- what the model sends us
    async def on_model_frame(self, frame: dict) -> None:
        rec = self.record
        if not frame or not rec:
            return
        cid, kind = rec["call_id"], frame.get("type")
        if kind == "ready":
            self.ready = True
            language = "the language the person seems to speak (English if unsure)" if rec["language"] == "auto" else LANGUAGES.get(rec["language"], LANGUAGES["en-IN"])
            hii = f"Hii {rec['name']}!" if rec["name"] else "Hii!"
            # The agent speaks first: an outbound call is answered with "hello?" and then silence unless someone starts.
            self.push({"text": f'The phone call has just connected. Open in {language}. Say "{hii}" like a friend would, say in a few words that you are an AI voice assistant, and then just chat naturally. From then on follow whatever language the person speaks.'})
            if self.held:
                self.push({"audio": base64.b64encode(bytes(self.held)).decode()})
                self.held.clear()
        elif kind == "audio":
            mulaw = self.audio.to_phone(base64.b64decode(frame["data"]))
            for f in PhoneAudio.frames(mulaw):
                await self.send(proto.build_media(self.stream_sid, f))
        elif kind == "interrupted":
            await self.send(proto.build_clear(self.stream_sid))  # the person spoke over the agent: drop what is still queued on the line
        elif kind == "toolCall":
            asyncio.create_task(self.run_tool_call(frame))
        elif kind == "text":
            store.append_transcript(cid, "agent", frame["text"])
        elif kind == "inputText":
            store.append_transcript(cid, "person", frame["text"])
        elif kind == "turn":
            store.close_turn(cid)
            if self.closing:
                await self.begin_drain()  # the goodbye is spoken: now let it play out and hang up
        elif kind == "error":
            log.warning("[voice] %s model error: %s", self.tag(), frame.get("message"))
            store.update(cid, error=str(frame.get("message") or "model error")[:300])
            await self.finish("model-error")
        elif kind == "done":
            store.update(cid, usage={"prompt_tokens": frame["usage"]["prompt_tokens"], "completion_tokens": frame["usage"]["completion_tokens"]})

    async def run_tool_call(self, frame: dict) -> None:
        """Call controls are always allowed; the rest only if this call allowed them. The answer goes back to the model."""
        rec = self.record
        if not rec or self.ended:
            return
        name, args = frame["name"], frame.get("args") or {}
        if name in controls.NAMES:
            log.info("[voice] %s control %s", self.tag(), name)
            if name == "end_call":
                self.request_end()
                response = {"ok": True, "note": "The call will end now. Say nothing more."}
                reason = str(args.get("reason") or "")[:100]
                store.add_line(rec["call_id"], "tool", f"end_call{': ' + reason if reason else ''}")
            else:
                response = self.extend_call()
                store.add_line(rec["call_id"], "tool", f"extend_call → +{response['minutesAdded']} min" if response["extended"] else "extend_call → not possible, maximum time reached")
            store.close_role(rec["call_id"], "agent")
        elif name == "calendar_outcome" and "calendar_outcome" in (rec["tools"] or []):
            from ..modules.calendar import calls as reminder_calls  # late import: calendar imports voice.service above it

            answer = str(args.get("answer") or "")
            log.info("[voice] %s calendar_outcome: %s", self.tag(), answer[:40])
            response = await reminder_calls.call_outcome(rec, answer)
            store.add_line(rec["call_id"], "tool", f"calendar_outcome: {answer[:60]}")
            store.close_role(rec["call_id"], "agent")
        elif name not in (rec["tools"] or []):
            response = {"error": "That tool is not available on this call."}
        else:
            what = f"{name}: {str(args['query'])[:120]}" if args.get("query") else name
            log.info("[voice] %s tool %s", self.tag(), name)
            response = await tools.run(name, args, self.memo)
            n = len(response["results"]) if isinstance(response.get("results"), list) else None
            outcome = "failed" if response.get("error") else "done" if n is None else f"{n} result{'' if n == 1 else 's'}"
            # The tool line goes in when the tool is DONE, so the words spoken before it ("one sec, let me check") are already above it.
            store.add_line(rec["call_id"], "tool", f"{what} → {outcome}")
            store.close_role(rec["call_id"], "agent")
        if not self.ended:
            self.push({"toolResponse": {"id": frame.get("id"), "name": name, "response": response}})

    async def pump(self) -> None:
        try:
            async for frame in self.live:
                await self.on_model_frame(frame)
                if frame.get("type") == "done":
                    break
        except Exception as e:  # noqa: BLE001
            log.warning("[voice] %s model stream failed: %s", self.tag(), type(e).__name__)
            if self.record:
                store.update(self.record["call_id"], error=f"{type(e).__name__}"[:300])
            await self.finish("model-error")
            return
        await self.finish("model-ended")

    # ---- the phone's start message: check the call and its one-time token, then open the voice session
    async def on_start(self, ev: dict) -> None:
        rec = store.get_live(ev["params"].get("callId"))
        token = str(ev["params"].get("token") or "")
        if not rec or not token or not hmac.compare_digest(rec["_token"], token) or self.stream_sid:
            log.warning("[voice] refused a media stream: unknown call or wrong token")
            try:
                await self.ws.close()
            except Exception:  # noqa: BLE001
                pass
            return
        self.record = rec
        self.stream_sid = ev["stream_sid"]
        store.update(rec["call_id"], status="in-progress", started_at=store._now(), provider_sid=ev.get("call_sid") or rec["provider_sid"])
        _live[rec["call_id"]] = self
        now = time.monotonic()
        self.soft_at, self.hard_at = now + self.soft, now + self.hard
        self.arm_limits()
        log.info("[voice] %s answered, opening the voice session", self.tag())
        try:
            self.live = LiveSession(
                self.cfg,
                voice=rec["voice"] or self.cfg.voice,
                system_prompt=build_system_prompt(rec["language"], rec["brief"], rec["name"], [*controls.hints, *tools.hints(rec["tools"])]),
                tools=[*controls.declarations, *tools.declarations(rec["tools"])],
            )
            await self.live.open()
        except Exception as e:  # noqa: BLE001
            log.warning("[voice] %s could not open the voice session: %s", self.tag(), type(e).__name__)
            store.update(rec["call_id"], error=f"Could not open the voice session ({type(e).__name__}).")
            await self.finish("ai-unavailable")
            return
        self.pump_task = asyncio.create_task(self.pump())

    async def finish(self, reason: str) -> None:
        if self.ended:
            return
        self.ended = True
        self.clear_timers()
        for t in (self.drain_timer, self.close_timer):
            if t:
                t.cancel()
        if self.live:
            await self.live.close(reason)
        try:
            await self.ws.close()
        except Exception:  # noqa: BLE001
            pass
        rec = self.record
        if not rec:
            return
        _live.pop(rec["call_id"], None)
        ended_at = store._now()
        duration = round((ended_at - rec["started_at"]).total_seconds()) if rec["started_at"] else 0
        store.update(rec["call_id"], status="failed" if rec["error"] and rec["status"] != "completed" else "completed", ended_at=ended_at, duration_s=duration, end_reason=reason)
        store.close_turn(rec["call_id"])
        # We ended it (the phone side is still up): tell the provider.
        if reason in ("max-duration", "admin-hangup", "model-error", "model-gone", "ai-unavailable", "model-ended", "ended-by-agent"):
            from .twilio import provider_for

            p = provider_for(self.cfg)
            if p and rec["provider_sid"]:
                asyncio.create_task(p.hangup(rec["provider_sid"]))
        log.info("[voice] %s ended: %s, %ss", self.tag(), reason, duration)

    # ---- the phone's messages
    async def run(self) -> None:
        await self.ws.accept()
        try:
            while not self.ended:
                data = await self.ws.receive_text()
                ev = proto.parse_incoming(data)
                if not ev or self.ended:
                    continue
                if ev["type"] == "start":
                    await self.on_start(ev)
                    continue
                if not self.record:
                    continue  # nothing is accepted before a valid start
                if ev["type"] == "media":
                    self.uplink += self.audio.from_phone(ev["payload"])
                    if len(self.uplink) >= self.cfg.uplink_ms * 32:
                        self.flush_uplink()
                elif ev["type"] == "mark":
                    if ev["name"] == "bye" and self.drained:
                        await self.finish("ended-by-agent")  # everything the model said has now been played to the person
                elif ev["type"] == "stop":
                    await self.finish("hangup")
        except Exception:  # noqa: BLE001 - the socket closed
            pass
        finally:
            await self.finish("socket-closed")


def hangup_live(call_id: str, reason: str = "admin-hangup") -> bool:
    s = _live.get(call_id)
    if not s:
        return False
    asyncio.create_task(s.finish(reason))
    return True


def live_count() -> int:
    return len(_live)
