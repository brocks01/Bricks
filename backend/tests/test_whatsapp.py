"""The WhatsApp channel end to end (docs/06 §7, iterations/whatsapp 0.2–2.3).

Webhooks go through the real app and database; Meta, Twilio and Gemini are
fakes (conftest), so we can read exactly what would have been sent. Every test
uses fresh phone numbers, so it doesn't touch the seeded members.
"""

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

import pytest

from bricks_api.whatsapp.models import (
    Buttons,
    ListMenu,
    LocationRequest,
    Outbound,
    Template,
    Text,
)
from bricks_api.whatsapp.speech import Intent

from .conftest import Api

pytestmark = pytest.mark.asyncio(loop_scope="session")


# ---------- Helpers ----------


def new_phone() -> str:
    return "+659" + "".join(secrets.choice("0123456789") for _ in range(7))


def text(body: str) -> dict[str, Any]:
    return {"type": "text", "text": {"body": body}}


def tap(payload: str, title: str = "") -> dict[str, Any]:
    return {
        "type": "interactive",
        "interactive": {"type": "button_reply", "button_reply": {"id": payload, "title": title}},
    }


def pick(payload: str) -> dict[str, Any]:
    return {
        "type": "interactive",
        "interactive": {"type": "list_reply", "list_reply": {"id": payload, "title": ""}},
    }


def meta_body(phone: str, message: dict[str, Any], name: str = "", msg_id: str = "") -> bytes:
    msg = {
        "from": phone.removeprefix("+"),
        "id": msg_id or f"wamid.in.{secrets.token_hex(8)}",
        "timestamp": "1700000000",
        **message,
    }
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "1",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "contacts": [
                                {"wa_id": phone.removeprefix("+"), "profile": {"name": name}}
                            ],
                            "messages": [msg],
                        },
                    }
                ],
            }
        ],
    }
    return json.dumps(payload).encode()


def sign(body: bytes) -> str:
    return "sha256=" + hmac.new(b"test-app-secret", body, hashlib.sha256).hexdigest()


async def send(
    api: Api, phone: str, message: dict[str, Any], name: str = "", msg_id: str = ""
) -> Outbound | None:
    """One message from `phone`. Returns the last thing sent back to them."""
    body = meta_body(phone, message, name, msg_id)
    r = await api.client.post(
        "/wa/webhook",
        content=body,
        headers={"content-type": "application/json", "x-hub-signature-256": sign(body)},
    )
    assert r.status_code == 200, r.text
    replies = api.outbox.to(phone)
    return replies[-1] if replies else None


def ids(msg: Outbound | None) -> list[str]:
    if isinstance(msg, Template):
        msg = msg.fallback
    assert isinstance(msg, Buttons | ListMenu), msg
    return [c.id for c in msg.choices]


def body(msg: Outbound | None) -> str:
    if isinstance(msg, Template):
        msg = msg.fallback
    assert isinstance(msg, Text | Buttons | ListMenu | LocationRequest), msg
    return msg.body


async def rows(api: Api, query: str, *params: Any) -> list[dict[str, Any]]:
    async with api.app.state.wa.connection() as conn:
        return list(await (await conn.execute(query, params)).fetchall())


async def onboard(api: Api, phone: str, name: str = "Uncle Test", area: str = "Bishan") -> str:
    """Hi -> English -> name from their WhatsApp profile -> area -> walking."""
    assert ids(await send(api, phone, text("Hi"), name=name)) == ["lang:en", "lang:ms", "lang:more"]
    assert ids(await send(api, phone, tap("lang:en"))) == ["ob:name_yes", "ob:name_other"]
    assert "Which area" in body(await send(api, phone, tap("ob:name_yes")))
    assert "int:walking" in ids(await send(api, phone, text(area)))
    await send(api, phone, pick("int:walking"))
    user = await rows(api, "select * from users where phone = %s", phone)
    assert len(user) == 1
    return str(user[0]["id"])


# ---------- Webhook (0.2) ----------


async def test_meta_verification_handshake(api: Api) -> None:
    params = {"hub.mode": "subscribe", "hub.verify_token": "test-verify", "hub.challenge": "42"}
    r = await api.client.get("/wa/webhook", params=params)
    assert r.status_code == 200 and r.text == "42"
    r = await api.client.get("/wa/webhook", params={**params, "hub.verify_token": "wrong"})
    assert r.status_code == 403


async def test_bad_signatures_are_refused(api: Api) -> None:
    body = meta_body(new_phone(), text("hello"))
    r = await api.client.post(
        "/wa/webhook", content=body, headers={"x-hub-signature-256": "sha256=" + "0" * 64}
    )
    assert r.status_code == 403
    r = await api.client.post("/wa/twilio", data={"From": "whatsapp:+6590001111", "Body": "hi"})
    assert r.status_code == 403


async def test_a_retried_webhook_is_handled_once(api: Api) -> None:
    phone, msg_id = new_phone(), f"wamid.dup.{secrets.token_hex(6)}"
    await send(api, phone, text("Hi"), msg_id=msg_id)
    await send(api, phone, text("Hi"), msg_id=msg_id)
    assert len(api.outbox.to(phone)) == 1


# ---------- Onboarding and invites (1.3) ----------


async def test_onboarding_makes_a_whatsapp_member_and_tries_the_check_in(api: Api) -> None:
    phone = new_phone()
    user_id = await onboard(api, phone, name="Uncle Lim", area="toa payoh")
    user = (await rows(api, "select * from users where id = %s", user_id))[0]
    assert user["preferred_name"] == "Uncle Lim"
    assert user["area_name"] == "Toa Payoh"
    assert user["channel_pref"] == "whatsapp" and user["status"] == "active"
    assert user["interests"] == ["walking"] and user["language"] == "en"
    contact = (await rows(api, "select * from wa_contacts where phone = %s", phone))[0]
    assert contact["user_id"] == user_id and contact["opted_in_at"] is not None
    # Demo mode: the check-in comes straight away (judge path, 3.1).
    last = api.outbox.to(phone)[-1]
    assert "Did you move yesterday?" in body(last)
    assert ids(last)[0].startswith("checkin:yes:")


async def test_onboarding_in_tamil_with_a_typed_name(api: Api) -> None:
    phone = new_phone()
    await send(api, phone, text("வணக்கம்"))
    langs = await send(api, phone, tap("lang:more"))
    assert ids(langs) == ["lang:en", "lang:ms", "lang:zh", "lang:ta"]
    ask = await send(api, phone, pick("lang:ta"))
    assert "உங்களை எப்படி அழைக்கலாம்" in body(ask)
    area = await send(api, phone, text("என் பெயர் முருகன்"))
    assert "முருகன்" in body(area) and "பகுதியில்" in body(area)
    interests = await send(api, phone, text("Ang Mo Kio"))
    assert isinstance(interests, ListMenu) and interests.choices[0].title == "நடைப்பயிற்சி"


async def test_onboarding_picks_up_where_it_left_off(api: Api) -> None:
    phone = new_phone()
    await send(api, phone, text("Hi"), name="Madam Lee")
    await send(api, phone, tap("lang:en"))
    await send(api, phone, tap("ob:name_yes"))
    api.clock.advance(10 * 60)
    try:
        # A near miss gets "did you mean…?", then the interests.
        assert ids(await send(api, phone, text("Toa Payo"))) == ["ob:area_yes", "ob:area_no"]
        assert "int:chess" in ids(await send(api, phone, tap("ob:area_yes")))
    finally:
        api.clock.reset()


async def test_family_invite_yes_activates_the_parent_once(api: Api) -> None:
    parent = new_phone()
    r = await api.client.post(
        "/family/invite",
        json={
            "senior_name": "Ah Kow Tan",
            "senior_phone": parent,
            "relation": "father",
            "language": "zh",
            "interests": ["chess"],
            "add_me_to_safe_circle": True,
        },
    )
    assert r.status_code == 201
    invite_id = r.json()["id"]
    invite = api.outbox.to(parent)[-1]
    # Never messaged us: an approved template, in the language the family chose.
    assert isinstance(invite, Template) and invite.name == "welcome_invite_family"
    assert invite.language == "zh" and invite.params == ["Ah Kow Tan", "Raj Kumar"]
    assert invite.payloads == [f"invite:yes:{invite_id}", f"invite:no:{invite_id}"]

    reply = await send(api, parent, tap(f"invite:yes:{invite_id}"))
    assert body(reply).startswith("*欢迎您，")
    await send(api, parent, tap(f"invite:yes:{invite_id}"))
    users = await rows(api, "select * from users where phone = %s", parent)
    assert len(users) == 1 and users[0]["status"] == "active"
    assert users[0]["channel_pref"] == "whatsapp" and users[0]["onboarded_by"] == "family"
    links = await rows(api, "select * from family_links where senior_id = %s", users[0]["id"])
    assert [(x["family_id"], x["status"]) for x in links] == [("u_raj", "accepted")]
    assert (await api.client.get("/family/invites")).json()[0]["status"] == "accepted"


async def test_saying_no_to_an_invite_keeps_it_waiting(api: Api) -> None:
    parent = new_phone()
    r = await api.client.post(
        "/family/invite",
        json={
            "senior_name": "Siti",
            "senior_phone": parent,
            "relation": "mother",
            "language": "ms",
            "interests": [],
            "add_me_to_safe_circle": False,
        },
    )
    invite_id = r.json()["id"]
    reply = await send(api, parent, tap(f"invite:no:{invite_id}"))
    assert "ubah fikiran" in body(reply)
    assert not await rows(api, "select 1 from users where phone = %s", parent)
    # Someone else's number can't say yes for them.
    stranger = new_phone()
    assert "isn't open" in body(await send(api, stranger, tap(f"invite:yes:{invite_id}")))


# ---------- Check-in and events (2.1) ----------


async def test_check_in_no_becomes_a_walk_with_the_group_link(api: Api) -> None:
    phone = new_phone()
    user_id = await onboard(api, phone)
    checkin = api.outbox.to(phone)[-1]
    no = await send(api, phone, tap(ids(checkin)[1]))
    assert body(no).startswith("*No worries!* Walk with")
    join, later = ids(no)
    assert join.startswith("join:") and later.startswith("later:")
    going = await send(api, phone, tap(join))
    event_id = join.removeprefix("join:")
    assert body(going).startswith("*You're going!*")
    assert "chat.whatsapp.com" in body(going)
    rsvp = await rows(
        api, "select status from rsvps where event_id = %s and user_id = %s", event_id, user_id
    )
    assert rsvp == [{"status": "going"}]
    answer = await rows(api, "select answer, channel from checkins where user_id = %s", user_id)
    assert answer == [{"answer": "no", "channel": "whatsapp"}]
    again = await send(api, phone, tap(join))
    assert body(again).startswith("You're already going")


async def test_yes_and_stale_check_in_buttons(api: Api) -> None:
    phone = new_phone()
    await onboard(api, phone)
    assert body(await send(api, phone, tap("checkin:yes:2020-01-01"))).startswith(
        "That was an earlier question"
    )
    today = ids(api.outbox.to(phone)[-2])[0]
    assert body(await send(api, phone, tap(today))) == "*Wonderful!* See you tomorrow!"


async def test_event_invite_tell_me_more_then_join(api: Api) -> None:
    phone = new_phone()
    user_id = await onboard(api, phone)
    events = await rows(
        api,
        "select id from events where status = 'active' and start_at > now()"
        " order by start_at limit 1",
    )
    event_id = events[0]["id"]
    r = await api.client.post(
        "/wa/admin/event-invite", json={"user_id": user_id, "event_id": event_id}
    )
    assert r.json() == {"sent": True}
    invite = api.outbox.to(phone)[-1]
    assert ids(invite) == [f"join:{event_id}", f"skip:{event_id}", f"more:{event_id}"]
    more = await send(api, phone, tap(f"more:{event_id}"))
    assert "Hosted by" in body(more) and ids(more) == [f"join:{event_id}", f"skip:{event_id}"]
    assert body(await send(api, phone, tap(f"skip:{event_id}"))) == "No problem."


# ---------- The 24-hour window, STOP / START (2.3) ----------


async def test_outside_the_window_meta_sends_the_template(api: Api) -> None:
    phone = new_phone()
    user_id = await onboard(api, phone)
    api.clock.advance(25 * 3600)
    try:
        await api.client.post("/wa/admin/checkin", json={"user_id": user_id})
        msg = api.outbox.to(phone)[-1]
        assert isinstance(msg, Template) and msg.name == "daily_checkin"
        assert msg.params == ["Uncle Test"]
        assert msg.payloads[0].startswith("checkin:yes:")
    finally:
        api.clock.reset()


async def test_stop_pauses_and_start_resumes(api: Api) -> None:
    phone = new_phone()
    user_id = await onboard(api, phone)
    assert body(await send(api, phone, text("STOP"))).startswith("Okay, messages are paused")
    r = await api.client.post("/wa/admin/checkin", json={"user_id": user_id})
    assert r.json() == {"sent": False}
    assert body(await send(api, phone, text("Start"))).startswith("*Welcome back.*")
    r = await api.client.post("/wa/admin/checkin", json={"user_id": user_id})
    assert r.json() == {"sent": True}


# ---------- SOS (2.2) ----------


async def test_help_alerts_the_safe_circle_and_shows_who_is_coming(api: Api) -> None:
    senior, helper = new_phone(), new_phone()
    senior_id = await onboard(api, senior, name="Mdm Tan")
    await send(api, helper, text("Hi"), name="Priya")  # helpers we may message (demo mode)
    await rows(
        api,
        "insert into safe_circle (id, user_id, name, phone, is_family, order_no)"
        " values (%s, %s, 'Priya Tan', %s, true, 0) returning id",
        f"sc_{secrets.token_hex(4)}",
        senior_id,
        helper,
    )
    started = time.monotonic()
    reply = await send(api, senior, text("tolong"))
    assert time.monotonic() - started < 10
    sent = api.outbox.to(senior)
    alert, location = sent[-2], sent[-1]
    assert body(alert).startswith("*Help is coming.* If you can, call 995 now. I'm telling Priya")
    assert isinstance(location, LocationRequest) and reply is location
    sos_id = ids(alert)[0].removeprefix("sos:ok:")

    to_helper = api.outbox.to(helper)[-1]
    assert "Urgent: Mdm Tan needs help." in body(to_helper)
    assert ids(to_helper) == [f"sos:onway:{sos_id}", f"sos:callme:{sos_id}"]

    thanks = await send(api, helper, tap(f"sos:onway:{sos_id}"))
    assert body(thanks).startswith("*Thank you.*")
    assert body(api.outbox.to(senior)[-1]) == "*Priya is on the way.*"
    status = await rows(api, "select status from sos_responses where sos_id = %s", sos_id)
    assert status == [{"status": "on_way"}]

    shared = await send(
        api, senior, {"type": "location", "location": {"latitude": 1.35, "longitude": 103.85}}
    )
    assert body(shared).startswith("Thank you. Your helpers")
    where = await rows(api, "select lat, lng, status from sos_events where id = %s", sos_id)
    assert where == [{"lat": 1.35, "lng": 103.85, "status": "helper_coming"}]

    await send(api, senior, tap(f"sos:ok:{sos_id}"))
    assert body(api.outbox.to(helper)[-1]).startswith("*Mdm Tan says they're okay now.*")
    closed = await send(api, helper, tap(f"sos:onway:{sos_id}"))
    assert "alert is closed" in body(closed)


async def test_a_voice_note_saying_i_fell_starts_an_sos(api: Api) -> None:
    phone = new_phone()
    await onboard(api, phone)
    api.speech.heard = "Help, I fell down in the kitchen"
    try:
        reply = await send(
            api,
            phone,
            {"type": "audio", "audio": {"id": "m1", "mime_type": "audio/ogg; codecs=opus"}},
        )
    finally:
        api.speech.heard = None
    # No Safe Circle yet: straight to 995.
    assert body(reply).startswith("*Please call 995 now.*")
    sos = await rows(
        api,
        "select trigger from sos_events where user_id = (select id from users where phone = %s)",
        phone,
    )
    assert sos == [{"trigger": "voice"}]


# ---------- Reminders, voice, the ladder (2.2) ----------


async def test_a_voice_note_reminder_is_confirmed_before_it_is_saved(api: Api) -> None:
    phone = new_phone()
    user_id = await onboard(api, phone)
    api.speech.heard = "remind me to take my medicine at 8 pm every day"
    api.speech.intent = Intent(
        "add_reminder",
        reminder_text="Take your medicine",
        reminder_time="20:00",
        reminder_repeat="daily",
        reminder_kind="medicine",
    )
    try:
        confirm = await send(api, phone, {"type": "audio", "audio": {"id": "m2"}})
    finally:
        api.speech.heard, api.speech.intent = None, Intent("unknown")
    assert body(confirm) == "*Shall I remind you?*\nTake your medicine, 8 pm, every day."
    assert not await rows(api, "select 1 from reminders where user_id = %s", user_id)
    done = await send(api, phone, tap("confirm:yes"))
    assert body(done).startswith("*Done.* I'll remind you")
    saved = await rows(
        api, "select text, time, repeat, created_by from reminders where user_id = %s", user_id
    )
    assert saved == [
        {"text": "Take your medicine", "time": "20:00", "repeat": "daily", "created_by": "whatsapp"}
    ]
    assert body(await send(api, phone, tap("confirm:yes"))).startswith("That question has expired")


async def test_reminder_snooze_rings_again_then_done(api: Api) -> None:
    phone = new_phone()
    user_id = await onboard(api, phone)
    reminder_id = f"r_{secrets.token_hex(5)}"
    await rows(
        api,
        "insert into reminders (id, user_id, kind, text, time, repeat) values"
        " (%s, %s, 'medicine', 'Take your medicine', '08:00', 'daily') returning id",
        reminder_id,
        user_id,
    )
    await api.client.post("/wa/admin/reminder", json={"reminder_id": reminder_id})
    rem = api.outbox.to(phone)[-1]
    done, snooze = ids(rem)
    assert body(rem).startswith("*Reminder for Uncle")
    assert body(await send(api, phone, tap(snooze))).startswith("Okay, I'll remind you again")
    api.clock.advance(61)
    try:
        before = len(api.outbox.to(phone))
        await api.client.post("/wa/admin/tick")
        again = api.outbox.to(phone)[before:]
        assert any(
            ids(m) == [done, snooze] for m in again if not isinstance(m, Text | LocationRequest)
        )
    finally:
        api.clock.reset()
    assert body(await send(api, phone, tap(done))) == "*Well done.*"
    row = await rows(api, "select done_on from reminders where id = %s", reminder_id)
    assert row[0]["done_on"] is not None


async def test_missed_check_in_nudges_then_tells_family(api: Api) -> None:
    senior, daughter = new_phone(), new_phone()
    senior_id = await onboard(api, senior, name="Mdm Kaur")
    daughter_id = await onboard(api, daughter, name="Harpreet")
    await rows(
        api,
        "insert into family_links (senior_id, family_id, relation) values (%s, %s, 'mother')"
        " returning senior_id",
        senior_id,
        daughter_id,
    )
    # Onboarding asked "now" without a ladder; the morning one starts it.
    await api.client.post("/wa/admin/checkin", json={"user_id": senior_id})
    api.clock.advance(121)
    try:
        await api.client.post("/wa/admin/tick")
        nudge = api.outbox.to(senior)[-1]
        assert body(nudge) == "*Just checking in, Mdm Kaur.* Are you okay?"
        api.clock.advance(60)
        assert (await api.client.post("/wa/admin/tick")).json()["calls"] >= 1
        api.clock.advance(60)
        await api.client.post("/wa/admin/tick")
        alert = api.outbox.to(daughter)[-1]
        assert body(alert).startswith("*Check-in missed:* Mdm Kaur hasn't answered")
        assert ids(alert) == [f"fam:call:{senior_id}", f"fam:check:{senior_id}"]
        call = await send(api, daughter, tap(f"fam:call:{senior_id}"))
        assert body(call) == f"Tap to call Mdm Kaur: {senior}"
        # Only family get the number.
        stranger = new_phone()
        before = len(api.outbox.to(stranger))
        await send(api, stranger, tap(f"fam:call:{senior_id}"))
        assert all(senior not in body(m) for m in api.outbox.to(stranger)[before:])
    finally:
        api.clock.reset()


async def test_im_ok_on_the_nudge_stops_the_ladder(api: Api) -> None:
    phone = new_phone()
    user_id = await onboard(api, phone)
    await api.client.post("/wa/admin/checkin", json={"user_id": user_id})
    api.clock.advance(121)
    try:
        await api.client.post("/wa/admin/tick")
        ok = ids(api.outbox.to(phone)[-1])[0]
        assert body(await send(api, phone, tap(ok))) == "*Thank you.* Glad you're okay."
        run = await rows(api, "select stopped_at from checkin_runs where user_id = %s", user_id)
        assert run[0]["stopped_at"] is not None
    finally:
        api.clock.reset()


# ---------- Menu and language (3.2) ----------


async def test_menu_and_switching_language(api: Api) -> None:
    phone = new_phone()
    await onboard(api, phone)
    menu = await send(api, phone, text("Menu"))
    assert ids(menu) == [
        "menu:today",
        "menu:events",
        "menu:reminders",
        "menu:progress",
        "menu:help",
        "menu:language",
    ]
    assert "lang:zh" in ids(await send(api, phone, pick("menu:language")))
    assert body(await send(api, phone, pick("lang:zh"))) == "好的，从现在起我会用中文。"
    progress = await send(api, phone, pick("menu:progress"))
    assert body(progress).startswith("*您的本周：*")
    help_ = await send(api, phone, pick("menu:help"))
    assert ids(help_) == ["help:yes", "help:no"]


# ---------- Twilio sandbox ----------


def twilio_signature(url: str, form: dict[str, str]) -> str:
    data = url + "".join(k + form[k] for k in sorted(form))
    digest = hmac.new(b"test-twilio-token", data.encode(), hashlib.sha1).digest()
    return base64.b64encode(digest).decode()


async def twilio_send(api: Api, phone: str, body_text: str) -> Outbound:
    form = {
        "MessageSid": f"SM{secrets.token_hex(16)}",
        "From": f"whatsapp:{phone}",
        "To": "whatsapp:+14155238886",
        "Body": body_text,
        "ProfileName": "Auntie Rose",
        "NumMedia": "0",
    }
    sig = twilio_signature("https://bricks.test/wa/twilio", form)
    r = await api.client.post("/wa/twilio", data=form, headers={"x-twilio-signature": sig})
    assert r.status_code == 200 and "<Response>" in r.text
    return api.outbox.to(phone)[-1]


async def test_twilio_sandbox_uses_numbered_choices(api: Api) -> None:
    phone = new_phone()
    first = await twilio_send(api, phone, "join quiet-tiger")
    assert isinstance(first, Text)
    assert "*1.* English\n*2.* Bahasa Melayu\n*3.* More languages" in first.body
    second = await twilio_send(api, phone, "1")
    assert isinstance(second, Text) and "Shall we call you *Auntie Rose*?" in second.body
    assert [r for r, p, _ in api.outbox.sent if p == phone] == ["twilio", "twilio"]
    third = await twilio_send(api, phone, "yes")
    assert isinstance(third, Text) and "Which area" in third.body


async def test_a_walk_recorded_in_the_app_gets_a_well_done(api: Api) -> None:
    from bricks_api.schemas import WalkSummary
    from bricks_api.whatsapp.flows.walks import send_walk_summary

    phone = new_phone()
    user_id = await onboard(api, phone, name="Raj")
    walk = WalkSummary.model_construct(  # type: ignore[call-arg]
        time_of_day="morning", distance_m=2400, moving_s=1920
    )
    async with api.app.state.wa.connection() as conn:
        assert await send_walk_summary(api.app.state.wa, conn, user_id, walk)
        assert not await send_walk_summary(api.app.state.wa, conn, "u_raj", walk)  # app member
    assert body(api.outbox.to(phone)[-1]) == "*Raj, well done.* Morning walk: 2.4 km in 32 min."
