"""Joining on WhatsApp (docs/06 §3.1, iteration 1.3): language -> name -> area ->
interests -> "You're in!". Buttons for everything except the name (and area).

The member lands in the same `users` table as the app (channel_pref 'whatsapp').
A number someone has already invited gets the invite question instead, and a
number that's already a member is never onboarded twice (ON-6).
"""

import re
from typing import Any

from ...ids import new_id
from .. import templates
from ..i18n import INTERESTS, LANGS, LANGUAGE_NAMES, interest, t
from ..keywords import match_area
from ..models import Buttons, Choice, ListMenu, Outbound, Text
from . import checkin
from .base import Turn
from .family import pending_invite

FLOW = "onboarding"


async def start(turn: Turn) -> None:
    invite = await pending_invite(turn.conn, turn.phone)
    if invite:
        msg = templates.build(
            "welcome_invite_family",
            invite["language"],
            [invite["senior_name"], await _family_name(turn, invite)],
            [f"invite:yes:{invite['id']}", f"invite:no:{invite['id']}"],
        )
        await turn.say(msg.fallback)
        return
    await turn.wa.set_session(turn.conn, turn.phone, FLOW, "language", {})
    await turn.say(
        Buttons(
            t("en", "pick_language"),
            [
                Choice("lang:en", "English"),
                Choice("lang:ms", "Bahasa Melayu"),
                Choice("lang:more", t("en", "lang_more")),
            ],
        )
    )


async def _family_name(turn: Turn, invite: dict[str, Any]) -> str:
    row = await (
        await turn.conn.execute("select name from users where id = %s", (invite["family_id"],))
    ).fetchone()
    return str(row["name"]) if row else ""


async def more_languages(turn: Turn) -> None:
    await turn.say(
        ListMenu(
            t("en", "lang_more_body"),
            "Language / 语言",
            [Choice(f"lang:{code}", LANGUAGE_NAMES[code]) for code in LANGS],
        )
    )


async def language(turn: Turn, session: dict[str, Any], lang: str) -> None:
    data = {**session["data"], "lang": lang}
    suggested = _clean_name(turn.contact.profile_name or "")
    if suggested:
        data["suggested"] = suggested
        await turn.wa.set_session(turn.conn, turn.phone, FLOW, "name_confirm", data)
        await _say(
            turn,
            lang,
            Buttons(
                t(lang, "ask_name_suggest", name=suggested),
                [
                    Choice("ob:name_yes", t(lang, "yes")),
                    Choice("ob:name_other", t(lang, "other_name")),
                ],
            ),
        )
        return
    await turn.wa.set_session(turn.conn, turn.phone, FLOW, "name", data)
    await _say_text(turn, lang, t(lang, "ask_name"))


async def name_choice(turn: Turn, session: dict[str, Any], use_suggested: bool) -> None:
    data, lang = session["data"], session["data"].get("lang", "en")
    if use_suggested and data.get("suggested"):
        await _got_name(turn, data, data["suggested"])
        return
    await turn.wa.set_session(turn.conn, turn.phone, FLOW, "name", data)
    await _say_text(turn, lang, t(lang, "ask_name_type"))


async def text(turn: Turn, session: dict[str, Any], body: str) -> None:
    """Typed (or spoken) answers to the step they're on."""
    data, step = session["data"], session["step"]
    lang = data.get("lang", "en")
    if step == "language":
        chosen = _language_from_text(body)
        if chosen:
            await language(turn, session, chosen)
        else:
            await start(turn)
        return
    if step in ("name", "name_confirm"):
        name = _clean_name(body)
        if not name:
            await _say_text(turn, lang, t(lang, "ask_name_type"))
            return
        await _got_name(turn, data, name)
        return
    if step in ("area", "area_confirm"):
        area, exact = match_area(body)
        if area and exact:
            await area_chosen(turn, session, area)
        elif area:
            await turn.wa.set_session(
                turn.conn, turn.phone, FLOW, "area_confirm", {**data, "maybe": area}
            )
            await _say(
                turn,
                lang,
                Buttons(
                    t(lang, "area_confirm", area=area),
                    [Choice("ob:area_yes", t(lang, "yes")), Choice("ob:area_no", t(lang, "no"))],
                ),
            )
        else:
            await _ask_area_again(turn, lang)
        return
    # Interests are picked from the list; anything typed shows it again.
    await _ask_interests(turn, lang)


async def _got_name(turn: Turn, data: dict[str, Any], name: str) -> None:
    lang = data.get("lang", "en")
    data = {**data, "name": name}
    await turn.wa.set_session(turn.conn, turn.phone, FLOW, "area", data)
    await _say(
        turn,
        lang,
        Buttons(t(lang, "ask_area", name=name), [Choice("ob:area_skip", t(lang, "later"))]),
    )


async def area_answer(turn: Turn, session: dict[str, Any], yes: bool) -> None:
    data = session["data"]
    if yes and data.get("maybe"):
        await area_chosen(turn, session, data["maybe"])
    else:
        await _ask_area_again(turn, data.get("lang", "en"))


async def area_chosen(turn: Turn, session: dict[str, Any], area: str | None) -> None:
    data = {**session["data"], "area": area}
    await turn.wa.set_session(turn.conn, turn.phone, FLOW, "interests", data)
    await _ask_interests(turn, data.get("lang", "en"))


async def _ask_area_again(turn: Turn, lang: str) -> None:
    await _say(
        turn, lang, Buttons(t(lang, "area_retry"), [Choice("ob:area_skip", t(lang, "later"))])
    )


async def _ask_interests(turn: Turn, lang: str) -> None:
    await _say(
        turn,
        lang,
        ListMenu(
            t(lang, "ask_interests"),
            t(lang, "choose"),
            [Choice(f"int:{key}", interest(lang, key)) for key in INTERESTS],
        ),
    )


async def finish(turn: Turn, session: dict[str, Any], picked: str | None) -> None:
    """Interest picked: the account is made, consent recorded, and they're in."""
    data = session["data"]
    lang = data.get("lang", "en")
    name = data.get("name") or _clean_name(turn.contact.profile_name or "") or "Friend"
    existing = await (
        await turn.conn.execute("select id from users where phone = %s", (turn.phone,))
    ).fetchone()
    interests = [picked] if picked in INTERESTS else []
    if existing:
        user_id = existing["id"]
        await turn.conn.execute(
            "update users set channel_pref = 'whatsapp', status = 'active' where id = %s",
            (user_id,),
        )
    else:
        user_id = new_id("u")
        await turn.conn.execute(
            "insert into users (id, name, preferred_name, phone, language, languages, area_name,"
            " channel_pref, onboarded_by, status, interests, created_at)"
            " values (%s, %s, %s, %s, %s, %s, %s, 'whatsapp', 'self', 'active', %s, %s)",
            (user_id, name, name, turn.phone, lang, [lang], data.get("area"), interests, turn.now),
        )
    await turn.wa.link_user(turn.conn, turn.phone, user_id)
    await turn.wa.opt_in(turn.conn, turn.phone)
    await turn.wa.clear_session(turn.conn, turn.phone)
    turn.contact.user_id = user_id
    await turn.reload_user()

    if turn.wa.settings.demo_mode:
        # Judges (and the stage demo) try the check-in straight away (iteration 3.1).
        await turn.say(Text(t(lang, "onboard_done", name=turn.name).split("\n\n")[0]))
        await checkin.ask_now(turn)
        return
    await turn.say(
        Buttons(
            t(lang, "onboard_done", name=turn.name),
            [Choice("ob:walks", t(lang, "yes_please")), Choice("ob:later", t(lang, "later"))],
        )
    )


async def _say(turn: Turn, lang: str, out: Outbound) -> None:
    await turn.wa.send(turn.conn, turn.phone, out, lang=lang, urgent=True)


async def _say_text(turn: Turn, lang: str, body: str) -> None:
    await _say(turn, lang, Text(body))


_NAME_LEADS = re.compile(
    r"^(hi|hello)?[\s,]*"
    r"(my name is|i am|i'm|this is|call me|nama saya|saya|我叫|我是|叫我|என் பெயர்)\s*",
    re.IGNORECASE,
)


def _clean_name(raw: str) -> str:
    """ "My name is Lim Ah Kow, call me Uncle Lim." -> "Uncle Lim"."""
    text = raw.strip().strip(".!。")
    if re.search(r"call me", text, re.IGNORECASE):
        text = re.split(r"call me", text, flags=re.IGNORECASE)[-1]
    text = _NAME_LEADS.sub("", text).strip(" ,.!。")
    text = re.sub(r"\s+", " ", text)
    if not text or len(text) > 40 or any(c.isdigit() for c in text):
        return ""
    return text[:1].upper() + text[1:]


def _language_from_text(body: str) -> str | None:
    b = body.strip().casefold()
    names = {
        "english": "en",
        "en": "en",
        "malay": "ms",
        "melayu": "ms",
        "bahasa melayu": "ms",
        "bahasa": "ms",
        "chinese": "zh",
        "mandarin": "zh",
        "中文": "zh",
        "华语": "zh",
        "tamil": "ta",
        "தமிழ்": "ta",
    }
    return names.get(b)
