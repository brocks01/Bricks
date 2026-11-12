"""Phone call webhooks (Tier 1: TwiML). Voice 1.3: the inbound call loop, in English.

    POST /voice/incoming   a call comes in: known member → greeting + question;
                           unknown number → language menu (keypad 1 to 4)
    POST /voice/language   the language menu's answer
    POST /voice/turn       every answer after that (speech or keypad), and silence
    POST /voice/hello      voice 0.1's four-language greeting (kept for testing a number)

Every turn: (1) distress words or 9 → SOS first, always; (2) a pending "Is that right?"
gets its yes / no (or 1 / 2); (3) otherwise what they asked for: what's on today, join,
a reminder, or goodbye. The work itself is done by the same functions the app uses, so
a reminder set on the phone shows in the app. Every turn is logged (its kind, never what
was said, never audio).
"""

import logging
from collections.abc import Callable
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request, Response
from twilio.twiml.voice_response import Gather, VoiceResponse

from ..assistant.distress import match_distress
from ..calls import session
from ..calls.audio import LANGS, VOICES, audio_url, has_audio
from ..calls.intents import (
    ReminderAsk,
    keywords,
    match_intent,
    parse_reminder,
    parse_time,
    reminder_date,
    say_time,
)
from ..calls.intents import yes_or_no as heard_yes_or_no
from ..calls.prompts import segment
from ..calls.replies import EN, as_heard, reminder_when, when_spoken
from ..calls.security import TwilioForm
from ..config import Settings
from ..db import Conn
from ..deps import Ctx, get_conn
from ..schemas import Language, NewReminder, SosIn
from ..timeutil import local, local_date, parse_iso
from .events import rsvp
from .sos import trigger_sos
from .thrive import create_reminder, today

log = logging.getLogger("bricks.calls")
router = APIRouter(prefix="/voice", tags=["calls"])

ConnDep = Annotated[Conn, Depends(get_conn)]

# Keypad on the welcome question (prompt menu_keys) and on "Is that right?".
KEY_TODAY, KEY_REMIND, KEY_HELP = "1", "2", "9"
KEY_YES, KEY_NO = "1", "2"
MAX_SILENCES = 2
MAX_MISSES = 2


class Reply:
    """Builds one TwiML answer."""

    def __init__(self, settings: Settings, lang: Language = "en") -> None:
        self.r = VoiceResponse()
        self.settings = settings
        self.lang = lang

    def url(self, path: str) -> str:
        return self.settings.public_base_url.rstrip("/") + path

    def fixed(
        self, prompt_id: str, into: Gather | None = None, lang: Language | None = None, **slots: str
    ) -> None:
        """A prompt file segment: its MP3 if there is one, otherwise <Say>."""
        lang = lang or self.lang
        seg = segment(prompt_id, lang)
        text = seg.fill(**slots)
        target = into or self.r
        if seg.fixed and has_audio(prompt_id, lang):
            target.play(audio_url(self.settings.public_base_url, prompt_id, lang))
        else:
            target.say(text, voice=VOICES[lang].say_voice, language=VOICES[lang].say_language)

    def live(self, text: str, into: Gather | None = None) -> None:
        (into or self.r).say(
            text, voice=VOICES[self.lang].say_voice, language=VOICES[self.lang].say_language
        )

    def listen(self, fill: Callable[[Gather], None]) -> None:
        """Ask, then wait for speech or one key; silence goes to /voice/turn?step=silence."""
        kw = keywords(self.lang)
        hints = ", ".join(kw["today"][:3] + kw["remind"][:2] + kw["yes"][:3] + kw["no"][:2])
        g = self.r.gather(
            input="speech dtmf",
            action=self.url("/voice/turn"),
            method="POST",
            language=self.settings.call_speech_language,
            speech_timeout="auto",
            timeout=5,
            num_digits=1,
            hints=hints,
        )
        fill(g)
        self.r.redirect(self.url("/voice/turn?step=silence"), method="POST")

    def hangup(self) -> None:
        self.r.pause(length=1)
        self.r.hangup()

    def twiml(self) -> Response:
        return Response(content=str(self.r), media_type="application/xml")


async def _log(
    conn: Conn, phone: str, user_id: str | None, call_sid: str, kind: str, now: datetime
) -> None:
    """One row per turn in the shared messages_log (002_whatsapp.sql): what kind of turn
    it was, never what was said (no personal free text in logs, same rule as WhatsApp)."""
    await conn.execute(
        "insert into messages_log (phone, user_id, direction, route, kind, provider_id, at)"
        " values (%s, %s, 'in', 'call', %s, %s, %s)",
        (phone, user_id, kind, call_sid, now),
    )


async def _member(conn: Conn, phone: str) -> dict[str, Any] | None:
    if not phone:
        return None
    return await (
        await conn.execute(
            "select id, name, preferred_name, language from users where phone = %s", (phone,)
        )
    ).fetchone()


def _member_phone(form: dict[str, str]) -> str:
    """The member's number: who called us, or who we called (Direction outbound-api)."""
    outbound = form.get("Direction", "").startswith("outbound")
    return form.get("To" if outbound else "From", "")


def _first_name(row: dict[str, Any]) -> str:
    return str(row["preferred_name"] or row["name"]).split()[0]


def _ctx(request: Request, conn: Conn, user_id: str) -> Ctx:
    return Ctx(
        conn=conn,
        user_id=user_id,
        now=request.app.state.clock(),
        settings=request.app.state.settings,
    )


def _ask_menu(reply: Reply, greet_name: str | None = None) -> None:
    def fill(g: Gather) -> None:
        if greet_name:
            reply.fixed("inbound_welcome_known.greet", g, name=greet_name)
        reply.fixed("inbound_welcome_known.ask", g)
        reply.fixed("menu_keys.say", g)

    reply.listen(fill)


def _anything_else(reply: Reply) -> None:
    reply.listen(lambda g: reply.fixed("anything_else.ask", g))


def _confirm(reply: Reply, question: str) -> None:
    reply.listen(lambda g: reply.live(question, g))


@router.post("/hello")
async def hello(request: Request, form: TwilioForm) -> Response:
    """Voice 0.1: "Hello, this is Bricks" in four languages, then hang up."""
    log.info("calls.hello call_sid=%s", form.get("CallSid"))
    reply = Reply(request.app.state.settings)
    for lang in LANGS:
        reply.fixed("hello.say", lang=lang)
        reply.r.pause(length=1)
    reply.r.hangup()
    return reply.twiml()


@router.post("/incoming")
async def incoming(request: Request, form: TwilioForm, conn: ConnDep) -> Response:
    settings: Settings = request.app.state.settings
    call_sid = form.get("CallSid", "")
    member = await _member(conn, _member_phone(form))
    log.info("calls.incoming call_sid=%s known=%s", call_sid, bool(member))
    # English only in voice 1.3; the member's own language comes with 2.2.
    reply = Reply(settings, "en")
    if member:
        session.put(call_sid, session.CallState(user_id=member["id"]))
        _ask_menu(reply, greet_name=_first_name(member))
        kind = "welcome"
    else:
        session.put(call_sid, session.CallState(user_id=None))
        g = reply.r.gather(
            input="dtmf",
            num_digits=1,
            timeout=6,
            action=reply.url("/voice/language"),
            method="POST",
        )
        reply.fixed("inbound_welcome_unknown.welcome", g)
        for lang in LANGS:
            reply.fixed("inbound_welcome_unknown.option", g, lang=lang)
        # No key pressed: carry on in English.
        reply.r.redirect(reply.url("/voice/language"), method="POST")
        kind = "language_menu"
    phone = _member_phone(form)
    await _log(
        conn, phone, member["id"] if member else None, call_sid, kind, request.app.state.clock()
    )
    return reply.twiml()


@router.post("/language")
async def language(request: Request, form: TwilioForm, conn: ConnDep) -> Response:
    settings: Settings = request.app.state.settings
    call_sid = form.get("CallSid", "")
    digits = form.get("Digits", "")
    reply = Reply(settings, "en")
    if digits in ("2", "3", "4"):
        reply.live(EN["english_only"])
    if settings.demo_mode:
        # Demo: an unknown phone tries Bricks as the sample member.
        member = await (
            await conn.execute(
                "select id, name, preferred_name, language from users where id = %s",
                (settings.demo_user_id,),
            )
        ).fetchone()
    else:
        member = None
    if member:
        session.put(call_sid, session.CallState(user_id=member["id"]))
        _ask_menu(reply, greet_name=_first_name(member))
        kind = "welcome"
    else:
        reply.fixed("not_linked.say")
        reply.hangup()
        session.end(call_sid)
        kind = "not_linked"
    phone = _member_phone(form)
    await _log(
        conn, phone, member["id"] if member else None, call_sid, kind, request.app.state.clock()
    )
    return reply.twiml()


@router.post("/turn")
async def turn(request: Request, form: TwilioForm, conn: ConnDep, step: str = "answer") -> Response:
    settings: Settings = request.app.state.settings
    call_sid = form.get("CallSid", "")
    said = form.get("SpeechResult", "").strip()
    digits = form.get("Digits", "").strip()

    state = session.get(call_sid)
    if state is None or state.user_id is None:
        # The server restarted mid-call, or a stray request: start again.
        member = await _member(conn, _member_phone(form))
        if member is None and settings.demo_mode:
            member = {"id": settings.demo_user_id}
        if member is None:
            reply = Reply(settings)
            reply.fixed("not_linked.say")
            reply.hangup()
            return reply.twiml()
        state = session.put(call_sid, session.CallState(user_id=member["id"]))
    assert state.user_id is not None
    ctx = _ctx(request, conn, state.user_id)
    reply = Reply(settings, state.lang)

    kind = await _handle(reply, state, ctx, call_sid, step, said, digits)
    await _log(conn, _member_phone(form), state.user_id, call_sid, kind, ctx.now)
    return reply.twiml()


async def _handle(
    reply: Reply,
    state: session.CallState,
    ctx: Ctx,
    call_sid: str,
    step: str,
    said: str,
    digits: str,
) -> str:
    """One turn of the call. Returns what kind of turn it was, for the log."""
    # 1. Help comes first, whatever else is going on.
    # 9 is always help, even in the middle of a question.
    if match_distress(said) or digits == KEY_HELP:
        await trigger_sos(SosIn(trigger="voice"), ctx)
        reply.fixed("sos_confirm.say")
        reply.live(EN["sos_told"])
        reply.hangup()
        session.end(call_sid)
        return "sos"

    # Silence: ask once more, then say goodbye.
    if step == "silence" and not said and not digits:
        state.silences += 1
        if state.silences >= MAX_SILENCES:
            reply.fixed("goodbye.later")
            reply.hangup()
            session.end(call_sid)
            return "silence_end"

        def still_there(g: Gather) -> None:
            reply.fixed("still_there.ask", g)
            if state.pending:
                reply.fixed("dtmf_hint.say", g)

        reply.listen(still_there)
        return "silence"
    state.silences = 0

    # 2. An answer to something we asked.
    if state.pending is not None:
        return await _answer_pending(reply, state, ctx, said, digits)

    # 3. What they asked for.
    if digits == KEY_TODAY:
        intent: str | None = "today"
    elif digits == KEY_REMIND:
        state.pending = session.Pending("remind_what")
        reply.listen(lambda g: reply.live(EN["remind_ask_what"], g))
        return "remind_ask"
    else:
        intent = match_intent(said, state.lang)

    if intent == "today":
        await _today(reply, state, ctx)
        return "today"
    if intent == "join":
        await _offer_join(reply, state, ctx)
        return "join"
    if intent == "remind":
        _start_reminder(reply, state, ctx, said)
        return "remind"
    if intent in ("walk_start", "walk_stop", "profile"):
        reply.live(EN["in_app"])
        _anything_else(reply)
        return intent
    if intent == "goodbye":
        await _goodbye(reply, ctx)
        session.end(call_sid)
        return "goodbye"

    state.misses += 1
    reply.fixed("not_understood.say")
    _ask_menu(reply)
    return "not_understood"


async def _answer_pending(
    reply: Reply, state: session.CallState, ctx: Ctx, said: str, digits: str
) -> str:
    pending = state.pending
    assert pending is not None

    if pending.kind == "remind_what":
        state.pending = None
        _start_reminder(reply, state, ctx, said)
        return "remind"

    if pending.kind == "remind_time":
        time = parse_time(said)
        if time is None:
            return _missed(reply, state, EN["remind_ask_time"])
        pending.data["time"] = time
        _confirm_reminder(reply, state, ctx)
        return "remind"

    answer = heard_yes_or_no(said, state.lang)
    if digits == KEY_YES:
        answer = "yes"
    elif digits == KEY_NO:
        answer = "no"
    if answer is None:
        return _missed(reply, state, None)
    state.pending, state.misses = None, 0

    if answer == "no":
        reply.live(EN["cancelled"])
        _anything_else(reply)
        return f"{pending.kind}_no"

    if pending.kind == "join":
        joined = await rsvp(pending.data["event_id"], ctx)
        reply.live(EN["joined"].format(title=joined.title))
    else:  # remind
        d = pending.data
        hour, minute = d["time"]
        created = NewReminder(
            kind=d["kind"],
            text=d["text"],
            time=f"{hour:02d}:{minute:02d}",
            repeat=d["repeat"],
            date=d["date"] if d["repeat"] == "once" else None,
        )
        made = await create_reminder(created, ctx)
        await ctx.conn.execute("update reminders set created_by = 'call' where id = %s", (made.id,))
        reply.live(EN["remind_done"])
    _anything_else(reply)
    return f"{pending.kind}_yes"


def _missed(reply: Reply, state: session.CallState, again: str | None) -> str:
    """We didn't understand the answer: ask again once, then let it go."""
    state.misses += 1
    if state.misses >= MAX_MISSES:
        state.pending, state.misses = None, 0
        reply.live(EN["cancelled"])
        _anything_else(reply)
        return "gave_up"

    def fill(g: Gather) -> None:
        reply.fixed("not_understood.say", g)
        if again:
            reply.live(again, g)
        else:
            reply.fixed("dtmf_hint.say", g)

    reply.listen(fill)
    return "missed"


async def _today(reply: Reply, state: session.CallState, ctx: Ctx) -> None:
    t = await today(ctx)
    lines: list[str] = []
    if t.next_reminder:
        hour, minute = (int(x) for x in t.next_reminder.time.split(":"))
        lines.append(
            EN["next_reminder"].format(time=_say(hour, minute), text=as_heard(t.next_reminder.text))
        )
    event = t.next_event
    if event and event.my_rsvp != "going":
        when = when_spoken(parse_iso(event.start_at), ctx.now)
        state.pending = session.Pending("join", {"event_id": event.id})
        question = EN["event_to_join"].format(title=event.title, place=event.place_name, when=when)

        def fill(g: Gather) -> None:
            for line in [*lines, question]:
                reply.live(line, g)

        reply.listen(fill)
        return
    if event:
        when = when_spoken(parse_iso(event.start_at), ctx.now)
        lines.append(EN["event_mine"].format(title=event.title, place=event.place_name, when=when))
    if not lines:
        lines.append(EN["nothing_planned"])
    for line in lines:
        reply.live(line)
    _anything_else(reply)


async def _offer_join(reply: Reply, state: session.CallState, ctx: Ctx) -> None:
    t = await today(ctx)
    event = t.next_event
    if event and event.my_rsvp != "going":
        when = when_spoken(parse_iso(event.start_at), ctx.now)
        state.pending = session.Pending("join", {"event_id": event.id})
        _confirm(
            reply, EN["event_to_join"].format(title=event.title, place=event.place_name, when=when)
        )
        return
    reply.live(EN["nothing_to_join"])
    _anything_else(reply)


def _start_reminder(reply: Reply, state: session.CallState, ctx: Ctx, said: str) -> None:
    ask = parse_reminder(said)
    state.pending = session.Pending(
        "remind_time",
        {
            "text": ask.text,
            "kind": ask.kind,
            "repeat": ask.repeat,
            "day": ask.day,
            "time": ask.time,
        },
    )
    if ask.time is None:
        reply.listen(lambda g: reply.live(EN["remind_ask_time"], g))
        return
    _confirm_reminder(reply, state, ctx)


def _confirm_reminder(reply: Reply, state: session.CallState, ctx: Ctx) -> None:
    pending = state.pending
    assert pending is not None
    d = pending.data
    hour, minute = d["time"]
    ask = ReminderAsk(
        text=d["text"], kind=d["kind"], time=(hour, minute), repeat=d["repeat"], day=d["day"]
    )
    day = reminder_date(ask, ctx.now)
    d["date"] = day.isoformat()
    day_word = "today" if day == local_date(ctx.now) else "tomorrow"
    pending.kind = "remind"
    question = EN["remind_confirm"].format(
        when=reminder_when(d["repeat"], hour, minute, day_word), text=as_heard(d["text"])
    )
    _confirm(reply, question)


async def _goodbye(reply: Reply, ctx: Ctx) -> None:
    t = await today(ctx)
    event = t.next_event
    if event and event.my_rsvp == "going":
        s = local(parse_iso(event.start_at))
        reply.fixed("goodbye.event", title=event.title, time=_say(s.hour, s.minute))
    else:
        reply.live(EN["goodbye_plain"])
    reply.hangup()


def _say(hour: int, minute: int) -> str:
    return say_time(hour, minute)
