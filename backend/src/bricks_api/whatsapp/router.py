"""Where an incoming message goes (iteration 0.2 §2.2), in this order:

1. Voice notes become text (Gemini), then are handled like text.
2. SOS words, before anything else, member or not.
3. STOP / START.
4. Button and list taps (payload `<action>:<arg>…`), member or not: helpers and
   invited parents tap buttons before they're members.
5. A shared location (SOS).
6. Not a member yet: onboarding.
7. An open step (a confirmation) that's waiting for this answer.
8. Menu / Hi, then everything else through Gemini (find events, add a reminder…).
"""

import logging
from typing import Any

from ..db import Conn
from ..repo import user_row
from . import keywords
from .flows import checkin, events, family, menu, onboarding, reminders, sos
from .flows.base import Turn
from .models import Inbound
from .service import WhatsApp
from .speech import Speech

log = logging.getLogger("bricks.whatsapp")


async def handle(wa: WhatsApp, speech: Speech, conn: Conn, msg: Inbound) -> Turn:
    contact = await wa.touch(conn, msg.phone, msg.route, msg.profile_name)
    user = await user_row(conn, contact.user_id) if contact.user_id else None
    await wa.log(conn, msg.phone, "in", msg.route, msg.kind, user_id=contact.user_id)
    turn = Turn(
        wa=wa, speech=speech, conn=conn, msg=msg, contact=contact, user=user, now=wa.clock()
    )

    kind, text, payload = msg.kind, msg.text.strip(), msg.payload
    if kind == "text" and turn.twilio and contact.choices:
        chosen = WhatsApp.chosen(contact, text)
        if chosen:
            kind, payload = "button", chosen

    if kind == "audio":
        heard = await _transcribe(turn)
        if heard is None:
            await turn.reply("voice_failed")
            return turn
        text, turn.voice, kind = heard, True, "text"

    if kind == "text" and keywords.is_sos(text):
        await sos.start(turn)
        return turn
    if kind == "text" and keywords.is_stop(text):
        await wa.set_opt_out(conn, msg.phone, True)
        await turn.reply("stopped")
        return turn
    if kind == "text" and keywords.is_start(text):
        await wa.set_opt_out(conn, msg.phone, False)
        await turn.reply("started")
        return turn

    if kind in ("button", "list") and payload:
        await _payload(turn, payload)
        return turn

    if kind == "location":
        if not await sos.location(turn):
            await (menu.show(turn) if turn.user else onboarding.start(turn))
        return turn

    session = await wa.session(conn, msg.phone)
    if not turn.user:
        if session and session["flow"] == onboarding.FLOW and kind == "text":
            await onboarding.text(turn, session, text)
        else:
            await onboarding.start(turn)
        return turn

    if kind != "text" or not text:
        await menu.show(turn)
        return turn
    if keywords.is_menu(text):
        await menu.show(turn)
        return turn
    if keywords.is_greeting(text):
        await menu.show(turn, turn.t("welcome_back", name=turn.name))
        return turn
    await _understand(turn, text)
    return turn


async def _transcribe(turn: Turn) -> str | None:
    msg = turn.msg
    try:
        audio, mime = await turn.wa.provider(msg.route).download(msg.media_id)
    except Exception as error:
        log.warning("Voice note download failed: %s", type(error).__name__)
        return None
    # The audio is only held in memory and dropped after this (iteration 2.2 §3.5).
    return await turn.speech.transcribe(audio, msg.media_type or mime, turn.lang)


async def _understand(turn: Turn, text: str) -> None:
    intent = await turn.speech.understand(text, turn.lang, turn.now)
    if intent.kind == "help":
        await menu.ask_help(turn)
    elif intent.kind == "find_events":
        await events.find(turn, intent.when, intent.category)
    elif intent.kind == "add_reminder":
        await reminders.propose(turn, intent)
    elif intent.kind in ("checkin_yes", "checkin_no"):
        await checkin.answer(turn, intent.kind.removeprefix("checkin_"))
    elif intent.kind == "chat" and intent.reply:
        await turn.reply_text(intent.reply)
    elif intent.kind == "menu":
        await menu.show(turn)
    else:
        await menu.show(turn, turn.t("didnt_understand"))


async def _payload(turn: Turn, payload: str) -> None:
    action, _, rest = payload.partition(":")
    args = rest.split(":") if rest else []
    arg = args[0] if args else ""
    session = await turn.wa.session(turn.conn, turn.phone)
    onboarding_session = session if session and session["flow"] == onboarding.FLOW else None

    # Anyone (not yet a member, a helper, a family member).
    if action == "invite":
        await (family.accept if arg == "yes" else family.decline)(turn, args[1])
        return
    if action == "sos" and arg in ("onway", "callme"):
        await (sos.helper_on_way if arg == "onway" else sos.helper_call)(turn, args[1])
        return
    if action == "fam":
        await (family.call_senior if arg == "call" else family.will_check)(turn, args[1])
        return
    if action == "lang":
        if arg == "more":
            await onboarding.more_languages(turn)
        elif onboarding_session:
            await onboarding.language(turn, onboarding_session, arg)
        elif turn.user:
            await menu.set_language(turn, arg)
        else:
            await onboarding.start(turn)
        return
    if action in ("ob", "int"):
        await _onboarding_payload(turn, onboarding_session, action, arg)
        return

    if not turn.user:
        await onboarding.start(turn)
        return

    # Members.
    if action == "checkin":
        await checkin.answer(turn, arg, args[1] if len(args) > 1 else None)
    elif action == "join":
        await events.join(turn, arg)
    elif action == "more":
        await events.more(turn, arg)
    elif action == "skip":
        await turn.reply("no_problem")
    elif action == "later":
        await turn.reply("later_ok")
    elif action == "evr":
        if arg == "onway":
            await turn.reply("see_you")
        else:
            await events.cant_make_it(turn, args[1])
    elif action == "rem":
        if arg == "done":
            await reminders.done(turn, args[1])
        else:
            await reminders.snooze(turn, args[1], args[2] if len(args) > 2 else turn.today)
    elif action == "nudge":
        await checkin.stop_ladder(turn.conn, turn.user["id"], turn.today, turn.now)
        if arg == "help":
            await sos.start(turn)
        else:
            await turn.reply("nudge_ok")
    elif action == "sos":
        if arg == "ok":
            await sos.im_ok(turn, args[1])
        elif arg == "call":
            await sos.call_family(turn, args[1])
    elif action == "help":
        await (sos.start(turn) if arg == "yes" else turn.reply("nudge_ok"))
    elif action == "confirm":
        await _confirm(turn, session, arg == "yes")
    elif action == "menu":
        await _menu_item(turn, arg)
    else:
        await menu.show(turn)


async def _onboarding_payload(
    turn: Turn, session: dict[str, Any] | None, action: str, arg: str
) -> None:
    if turn.user and arg == "walks":
        await events.find(turn, None, "walk")
        return
    if turn.user and arg == "later":
        await turn.reply("say_menu")
        return
    if not session:
        await (menu.show(turn) if turn.user else onboarding.start(turn))
        return
    if action == "int":
        await onboarding.finish(turn, session, arg)
    elif arg in ("name_yes", "name_other"):
        await onboarding.name_choice(turn, session, arg == "name_yes")
    elif arg in ("area_yes", "area_no"):
        await onboarding.area_answer(turn, session, arg == "area_yes")
    elif arg == "area_skip":
        await onboarding.area_chosen(turn, session, None)


async def _confirm(turn: Turn, session: dict[str, Any] | None, yes: bool) -> None:
    if not session or session["flow"] != "confirm":
        await turn.reply("expired")
        return
    await turn.wa.clear_session(turn.conn, turn.phone)
    if not yes:
        await turn.reply("okay_wont")
    elif session["step"] == "reminder":
        await reminders.confirm(turn, session["data"])


async def _menu_item(turn: Turn, item: str) -> None:
    if item == "today":
        await menu.show_today(turn)
    elif item == "events":
        await events.find(turn)
    elif item == "reminders":
        await reminders.show(turn)
    elif item == "progress":
        await menu.show_progress(turn)
    elif item == "help":
        await menu.ask_help(turn)
    elif item == "language":
        await menu.pick_language(turn)
    else:
        await menu.show(turn)
