"""One live voice session with Gemini Live (a WebSocket the model speaks and listens on).

  up   16 kHz mono PCM16 (the person's voice)        down 24 kHz mono PCM16 (the model's voice)

Frames this session yields, as dicts (the call session reads them):
  ready | audio{data b64} | text{text} | inputText{text} | toolCall{id,name,args} | interrupted | turn | error{message} | done{reason,usage}
Frames the call session sends in with push(): {audio b64} | {text} | {toolResponse:{id,name,response}}.
The key is sent in a header, never in a URL or a log line."""
import asyncio
import base64
import json
import logging

import websockets

from .config import VoiceConfig

log = logging.getLogger("voice")
URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"


class LiveSession:
    def __init__(self, cfg: VoiceConfig, *, voice: str, system_prompt: str, tools: list[dict]):
        self.cfg, self.voice, self.system_prompt, self.tools = cfg, voice, system_prompt, tools
        self.frames: asyncio.Queue = asyncio.Queue()
        self._out: asyncio.Queue = asyncio.Queue()
        self._ws = None
        self._tasks: list[asyncio.Task] = []
        self._closed = False
        self._ready = False
        self._usage = None
        self.tokens = {"prompt_tokens": 0, "completion_tokens": 0}

    async def open(self) -> None:
        if not self.cfg.gemini_key:
            raise RuntimeError("GEMINI_API_KEY is not set")
        self._ws = await websockets.connect(URL, additional_headers={"x-goog-api-key": self.cfg.gemini_key}, max_size=None, open_timeout=15)
        setup = {
            "model": "models/" + self.cfg.gemini_model,
            "generationConfig": {"responseModalities": ["AUDIO"], **({"speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": self.voice}}}} if self.voice else {})},
            "outputAudioTranscription": {},
            "inputAudioTranscription": {},
            **({"tools": [{"functionDeclarations": self.tools}]} if self.tools else {}),
            **({"systemInstruction": {"parts": [{"text": self.system_prompt[:8000]}]}} if self.system_prompt else {}),
        }
        await self._ws.send(json.dumps({"setup": setup}))
        self._tasks = [asyncio.create_task(self._reader()), asyncio.create_task(self._writer())]

    # ---- in ----
    def push(self, frame: dict) -> None:
        if not self._closed:
            self._out.put_nowait(frame)

    async def _writer(self) -> None:
        """Sends one thing at a time, in order."""
        try:
            while True:
                f = await self._out.get()
                if f.get("audio"):
                    msg = {"realtimeInput": {"audio": {"data": f["audio"], "mimeType": "audio/pcm;codec=pcm;rate=16000"}}}
                elif f.get("text"):
                    msg = {"clientContent": {"turns": [{"role": "user", "parts": [{"text": str(f["text"])[:4000]}]}], "turnComplete": True}}
                elif f.get("toolResponse"):
                    t = f["toolResponse"]
                    resp = t.get("response")
                    msg = {"toolResponse": {"functionResponses": [{**({"id": t["id"]} if t.get("id") else {}), "name": t["name"], "response": resp if isinstance(resp, dict) else {"result": resp}}]}}
                else:
                    continue
                await self._ws.send(json.dumps(msg))
        except (asyncio.CancelledError, websockets.ConnectionClosed):
            pass
        except Exception as e:  # noqa: BLE001
            log.warning("[voice] live writer stopped: %s", type(e).__name__)

    # ---- out ----
    async def _reader(self) -> None:
        reason = "provider-closed"
        try:
            async for raw in self._ws:
                msg = json.loads(raw if isinstance(raw, str) else raw.decode("utf-8", "ignore"))
                self._handle(msg)
        except asyncio.CancelledError:
            return
        except websockets.ConnectionClosed as e:
            code = getattr(getattr(e, "rcvd", None), "code", None)
            text = getattr(getattr(e, "rcvd", None), "reason", "") or ""
            log.warning("[voice] live ws closed code=%s ready=%s reason=%s", code, self._ready, text[:200] or "(none)")
            if not self._ready and not self._closed:
                self.frames.put_nowait({"type": "error", "message": f"The voice session closed before it was ready{': ' + text[:300] if text else ''}"})
        except Exception as e:  # noqa: BLE001
            log.warning("[voice] live reader failed: %s", type(e).__name__)
            if not self._closed:
                self.frames.put_nowait({"type": "error", "message": "The live voice connection failed."})
        await self.close(reason)

    def _handle(self, msg: dict) -> None:
        put = self.frames.put_nowait
        if msg.get("usageMetadata"):
            self._usage = msg["usageMetadata"]
        if "setupComplete" in msg:
            self._ready = True
            put({"type": "ready"})
            return
        for fc in (msg.get("toolCall") or {}).get("functionCalls") or []:
            put({"type": "toolCall", "id": fc.get("id") or fc.get("name"), "name": fc.get("name"), "args": fc.get("args") or {}})
        content = msg.get("serverContent") or {}
        for part in (content.get("modelTurn") or {}).get("parts") or []:
            inline = part.get("inlineData")
            if inline and inline.get("data"):
                put({"type": "audio", "data": inline["data"]})
            if part.get("text"):
                put({"type": "text", "text": part["text"]})
            fc = part.get("functionCall")
            if fc:
                put({"type": "toolCall", "id": fc.get("id") or fc.get("name"), "name": fc.get("name"), "args": fc.get("args") or {}})
        if content.get("interrupted"):
            put({"type": "interrupted"})
        if (content.get("outputTranscription") or {}).get("text"):
            put({"type": "text", "text": content["outputTranscription"]["text"]})
        if (content.get("inputTranscription") or {}).get("text"):
            put({"type": "inputText", "text": content["inputTranscription"]["text"]})
        if content.get("usageMetadata"):
            self._usage = content["usageMetadata"]
        if content.get("turnComplete"):
            self._count()
            put({"type": "turn"})
        if msg.get("error"):
            put({"type": "error", "message": json.dumps(msg["error"])[:400]})

    def _count(self) -> None:
        u = self._usage or {}
        self.tokens["prompt_tokens"] = int(u.get("promptTokenCount") or u.get("inputTokenCount") or 0) or self.tokens["prompt_tokens"]
        self.tokens["completion_tokens"] = int(u.get("responseTokenCount") or u.get("candidatesTokenCount") or u.get("outputTokenCount") or 0) or self.tokens["completion_tokens"]

    async def close(self, reason: str = "closed") -> None:
        if self._closed:
            return
        self._closed = True
        self._count()
        for t in self._tasks:
            if t is not asyncio.current_task():
                t.cancel()
        try:
            if self._ws:
                await self._ws.close()
        except Exception:  # noqa: BLE001
            pass
        self.frames.put_nowait({"type": "done", "reason": reason, "usage": dict(self.tokens)})

    async def __aiter__(self):
        while True:
            f = await self.frames.get()
            yield f
            if f.get("type") == "done":
                return
