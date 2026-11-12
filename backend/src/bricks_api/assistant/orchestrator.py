"""One turn of Buddy (voice 2.1): words in → the right tools → a short answer + app actions.

    1. What they said: the text, or the recording transcribed by Gemini.
    2. Help words (distress.json) → SOS at once, before any model. Deterministic.
    3. The second turn of a "yes / no" → run the tool (yes) or let it go (no).
    4. The everyday requests straight from keywords (prerouter.py): today, a reminder with
       a time, join the next walk, open a screen, start / finish a walk. Instant.
    5. Gemini with the member's tools. A tool that changes their data is never run here:
       it comes back as a confirm action ("Every day at 8 am: take medicine. Is that
       right?"). Screen tools become app actions; data tools run and the model talks
       about the result. At most a few rounds.
    6. Gemini down, slow or unset → the keyword fallback (prerouter.py again, less strict).

Replies are at most two sentences, in the member's language. The health card is never in
the context, and nothing the member says is logged.
"""

import asyncio
import base64
import json
import logging
import re
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types

from ..calls.intents import say_time
from ..calls.replies import as_heard
from ..deps import Ctx
from ..repo import event_row, user_row
from ..schemas import Language
from . import prerouter
from .contract import ConfirmAction, OpenSosAction, TurnIn, TurnOut, UiAction
from .distress import match_distress
from .executor import ToolError, run
from .prompt import render_system_prompt
from .tools import gemini_tool, is_mutating

log = logging.getLogger("bricks.assistant")

MAX_ROUNDS = 4
REPLIES_FILE = Path(__file__).with_name("replies.json")
_REPLIES = json.loads(REPLIES_FILE.read_text(encoding="utf-8"))
SAY: dict[str, dict[Language, str]] = _REPLIES["say"]
# What a change will do, said back before it happens (filled from the tool's arguments).
CONFIRM_WHAT: dict[str, dict[Language, str]] = _REPLIES["confirm_what"]


# Sentence ends, including the Chinese full stop, exclamation and question marks.
_SENTENCE = re.compile("(?<=[.!?" + chr(0x3002) + chr(0xFF01) + chr(0xFF1F) + r"])\s*")


def short(text: str, limit: int = 2) -> str:
    """At most `limit` sentences (the reply rule)."""
    parts = [p for p in _SENTENCE.split(text.strip()) if p]
    if not parts:
        return text.strip()
    # Chinese sentences run on without a space.
    joiner = "" if any(ord(ch) > 0x2E80 for ch in parts[0][:3]) else " "
    return joiner.join(parts[:limit])


def _client(ctx: Ctx) -> genai.Client | None:
    key = ctx.settings.gemini_api_key
    return genai.Client(api_key=key.get_secret_value()) if key and key.get_secret_value() else None


async def transcribe(ctx: Ctx, body: TurnIn) -> str:
    """The recording as text, in the member's language (Gemini listens)."""
    client = _client(ctx)
    if client is None or not body.audio:
        return ""
    audio = base64.b64decode(body.audio)
    resp = await client.aio.models.generate_content(
        model=ctx.settings.gemini_model,
        contents=[
            types.Part.from_bytes(data=audio, mime_type=body.audio_mime or "audio/mp4"),
            "Write down exactly what this person said, in the language they spoke. "
            "Only the words, nothing else.",
        ],
    )
    return (resp.text or "").strip()


def understood(out: TurnOut, lang: Language) -> bool:
    """False when Buddy could only say "Sorry, I didn't catch that"."""
    return out.reply_text != SAY["not_understood"][lang]


async def turn(ctx: Ctx, body: TurnIn, *, timeout_s: float | None = None) -> TurnOut:
    lang: Language = body.language
    said = (body.text or "").strip() or await transcribe(ctx, body)

    # 1. Help first, always.
    if said and match_distress(said):
        await run("trigger_sos", {"reason": said[:200]}, ctx, body)
        return _out(said, SAY["sos"][lang], [OpenSosAction(reason=said[:200])], done=True)

    # 2. The answer to "Is that right?".
    if body.confirm is not None:
        c = body.confirm
        if c.answer == "no" or not is_mutating(c.tool):
            return _out(said, SAY["cancelled"][lang], [], done=True)
        try:
            await run(c.tool, c.args, ctx, body)
        except ToolError as error:
            log.info("assistant.confirm_failed tool=%s %s", c.tool, error)
            return _out(said, SAY["not_understood"][lang], [], done=True)
        return _out(said, SAY["done"][lang], [], done=True)

    if not said:
        return _out(said, SAY["not_understood"][lang], [], done=False)

    # 3. The everyday requests, without waiting for the model.
    routed = await _routed(ctx, body, said, sure_only=True)
    if routed is not None:
        return routed

    # 4. The model, with a time limit; the keywords if it fails.
    try:
        return await asyncio.wait_for(
            _with_model(ctx, body, said), timeout_s or ctx.settings.assistant_timeout_s
        )
    except Exception as error:
        log.warning("assistant.fallback reason=%s", type(error).__name__)
        return await fallback(ctx, body, said)


async def _routed(ctx: Ctx, body: TurnIn, said: str, *, sure_only: bool) -> TurnOut | None:
    routed = await prerouter.route(ctx, body, said, sure_only=sure_only)
    if isinstance(routed, tuple):
        tool, args = routed
        return await _confirm(ctx, body, said, tool, args, [])
    return routed


async def _with_model(ctx: Ctx, body: TurnIn, said: str) -> TurnOut:
    client = _client(ctx)
    if client is None:
        raise RuntimeError("no Gemini key")
    me = await user_row(ctx.conn, ctx.user_id)
    name = str((me or {}).get("preferred_name") or (me or {}).get("name") or "").split(" ")[0]
    system = render_system_prompt(
        language=body.language,
        member_name=name,
        channel=body.channel,
        now=ctx.now,
        screen_name=body.screen,
        screen_script=body.screen_script,
    )
    config = types.GenerateContentConfig(
        system_instruction=system,
        tools=[gemini_tool(body.channel, body.platform, include_p1=False)],
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        temperature=0.2,
    )
    contents: list[types.Content] = [types.Content(role="user", parts=[types.Part(text=said)])]
    actions: list[UiAction] = []
    for _ in range(MAX_ROUNDS):
        resp = await _generate(client, ctx, contents, config)
        calls = resp.function_calls or []
        if not calls:
            return _out(
                said, short(resp.text or SAY["not_understood"][body.language]), actions, done=True
            )
        assert resp.candidates and resp.candidates[0].content
        contents.append(resp.candidates[0].content)
        replies: list[types.Part] = []
        for call in calls:
            name_ = call.name or ""
            args: dict[str, Any] = dict(call.args or {})
            if is_mutating(name_):
                return await _confirm(ctx, body, said, name_, args, actions)
            try:
                result, ui = await run(name_, args, ctx, body)
                actions.extend(ui)
            except ToolError as error:
                result = {"error": str(error)}
            replies.append(types.Part.from_function_response(name=name_, response=result))
        contents.append(types.Content(role="user", parts=replies))
    return _out(said, SAY["not_understood"][body.language], actions, done=True)


async def _generate(
    client: genai.Client,
    ctx: Ctx,
    contents: list[types.Content],
    config: types.GenerateContentConfig,
) -> types.GenerateContentResponse:
    try:
        return await client.aio.models.generate_content(
            model=ctx.settings.gemini_model, contents=contents, config=config
        )
    except Exception:
        return await client.aio.models.generate_content(
            model=ctx.settings.gemini_fallback_model, contents=contents, config=config
        )


async def _confirm(
    ctx: Ctx, body: TurnIn, said: str, tool: str, args: dict[str, Any], actions: list[UiAction]
) -> TurnOut:
    lang = body.language
    fill: dict[str, str] = {k: str(v) for k, v in args.items()}
    if tool in ("join_event", "cancel_event") and "event_id" in args:
        row = await event_row(ctx.conn, ctx.user_id, str(args["event_id"]))
        fill["title"] = str(row["title"]) if row else ""
    key = tool
    if tool == "set_reminder":
        if args.get("repeat") in ("daily", "weekdays"):
            key = f"set_reminder_{args['repeat']}"
        if lang == "en" and re.fullmatch(r"\d{1,2}:\d{2}", str(args.get("time", ""))):
            hour, minute = (int(x) for x in str(args["time"]).split(":"))
            fill["time"] = say_time(hour, minute)
        if lang == "en" and args.get("text"):
            # Said back to them: "take my medicine" → "Take your medicine".
            heard = as_heard(str(args["text"]))
            fill["text"] = heard[:1].upper() + heard[1:]
    template = CONFIRM_WHAT.get(key, {}).get(lang)
    try:
        what = template.format(**fill) if template else tool.replace("_", " ")
    except KeyError:
        what = tool.replace("_", " ")
    summary = SAY["confirm"][lang].format(what=what)
    return _out(
        said, summary, [*actions, ConfirmAction(tool=tool, args=args, summary=summary)], done=False
    )


async def fallback(ctx: Ctx, body: TurnIn, said: str) -> TurnOut:
    """No model: whatever the keywords can do, or open the screen that does it."""
    routed = await _routed(ctx, body, said, sure_only=False)
    return routed or _out(said, SAY["not_understood"][body.language], [], done=False)


def _out(said: str, reply: str, actions: list[UiAction], *, done: bool) -> TurnOut:
    return TurnOut(
        transcript=said, reply_text=reply, reply_audio_url=None, ui_actions=actions, done=done
    )
