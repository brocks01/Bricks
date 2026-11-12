"""The app's API end to end: real routes, real Postgres, seeded demo world."""

from datetime import UTC, datetime, timedelta

import pytest
from psycopg import AsyncConnection, sql

from bricks_api.config import Settings
from bricks_api.main import create_app
from bricks_api.seed import _bishan_loop

from .conftest import Api

pytestmark = pytest.mark.asyncio(loop_scope="session")


def in_days(days: float) -> str:
    return (datetime.now(UTC) + timedelta(days=days)).isoformat()


# ---------- Health and sign-in ----------


async def test_health(api: Api) -> None:
    r = await api.client.get("/health")
    assert r.json() == {"status": "ok", "database": True}


async def test_demo_mode_acts_as_raj_without_a_sign_in(api: Api) -> None:
    me = (await api.client.get("/me")).json()
    assert me["id"] == "u_raj"
    assert me["interests"] == ["chess", "walking", "teaching"]


async def test_bad_tokens_are_refused(api: Api) -> None:
    r = await api.client.get("/me", headers={"Authorization": "Bearer not-a-token"})
    assert r.status_code == 401


async def test_without_demo_mode_a_sign_in_is_required(settings: Settings, seeded: None) -> None:
    import httpx

    app = create_app(settings.model_copy(update={"demo_mode": False}))
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            assert (await client.get("/me")).status_code == 401
            # The "they said yes" shortcut is demo-only too.
            assert (await client.post("/invites/inv_x/accept")).status_code == 401
            # So are the demo controls: they don't exist on a real server.
            assert (await client.post("/demo/reset")).status_code == 404
            assert (await client.get("/demo/accounts")).status_code == 404
            assert (await client.post("/demo/judges/1/reset")).status_code == 404
            assert (await client.get("/me", headers={"X-Demo-User": "u_priya"})).status_code == 401


async def test_demo_accounts_and_switching(api: Api) -> None:
    accounts = (await api.client.get("/demo/accounts")).json()
    assert [(a["id"], a["role"]) for a in accounts] == [
        ("u_raj", "senior"),
        ("u_priya", "family"),
        ("u_ahmad", "helper"),
        ("u_lim", "circle"),
        ("u_judge", "judge"),
    ]
    assert (await api.client.get("/me")).json()["name"] == "Raj Kumar"
    priya = await api.client.get("/me", headers={"X-Demo-User": "u_priya"})
    assert priya.json()["name"] == "Priya Kumar"
    judge = await api.client.get("/me", headers={"X-Demo-User": "u_judge"})
    assert judge.json()["name"] == "Guest Judge"
    # Only the listed accounts: anything else is the sample member.
    other = await api.client.get("/me", headers={"X-Demo-User": "u_tan"})
    assert other.json()["name"] == "Raj Kumar"


async def test_judge_link_lands_ready_and_resets_only_that_judge(api: Api) -> None:
    # Iteration 3.1: Judge 3's QR link. Ready to go: today's check-in waiting and
    # tomorrow's walk to join, so "No → join walk" works straight away.
    judge = {"X-Demo-User": "u_judge3"}
    r = await api.client.post("/demo/judges/3/reset")
    assert r.json() == {"id": "u_judge3", "name": "Judge 3", "role": "judge"}
    me = (await api.client.get("/me", headers=judge)).json()
    assert (me["name"], me["area_name"]) == ("Judge 3", "Bishan")
    today = (await api.client.get("/home/today", headers=judge)).json()
    assert today["checkin"]["pending"] is True
    no = (await api.client.post("/checkins", headers=judge, json={"answer": "no"})).json()
    walk = no["suggestion"]
    assert walk and walk["category"] == "walk"
    going = await api.client.post(f"/events/{walk['id']}/rsvp", headers=judge)
    assert going.status_code == 200

    # Judge 4 does something too; resetting Judge 3 leaves Judge 4 alone.
    other = {"X-Demo-User": "u_judge4"}
    await api.client.post("/checkins", headers=other, json={"answer": "yes"})
    await api.client.post("/demo/judges/3/reset")
    again = (await api.client.get("/home/today", headers=judge)).json()
    assert again["checkin"]["pending"] is True
    assert (await api.client.get("/home/today", headers=other)).json()["checkin"][
        "pending"
    ] is False
    event = (await api.client.get(f"/events/{walk['id']}", headers=judge)).json()
    assert event["my_rsvp"] is None

    for n in (0, 11):
        assert (await api.client.post(f"/demo/judges/{n}/reset")).status_code == 404
    # Judges aren't in the stage switcher (they come in through their links).
    ids = [a["id"] for a in (await api.client.get("/demo/accounts")).json()]
    assert not any(i.startswith("u_judge") and i != "u_judge" for i in ids)


async def test_an_account_missing_from_an_older_seed_is_left_out(
    api: Api, settings: Settings
) -> None:
    # A database seeded before Guest Judge existed: not offered, and asking for it
    # acts as the sample member instead of failing (it used to be a 500).
    rename = "update {}.users set id = %s where id = %s"
    query = sql.SQL(rename).format(sql.Identifier(settings.db_schema))
    async with await AsyncConnection.connect(
        settings.database_url.get_secret_value(), prepare_threshold=None
    ) as conn:
        await conn.execute(query, ("u_judge_gone", "u_judge"))
        await conn.commit()
        try:
            ids = [a["id"] for a in (await api.client.get("/demo/accounts")).json()]
            assert "u_judge" not in ids and "u_priya" in ids
            me = await api.client.get("/me", headers={"X-Demo-User": "u_judge"})
            assert me.json()["name"] == "Raj Kumar"
        finally:
            await conn.execute(query, ("u_judge", "u_judge_gone"))
            await conn.commit()


async def test_a_real_sign_in_wins_over_the_demo_header(api: Api) -> None:
    h = await api.as_new_member("Real Person")
    me = await api.client.get("/me", headers={**h, "X-Demo-User": "u_priya"})
    assert me.json()["name"] == "Real Person"


async def test_first_google_sign_in_makes_the_account(api: Api) -> None:
    headers = {"Authorization": f"Bearer {api.token('Siti Nurhaliza Binte Ali')}"}
    r = await api.client.post("/auth/google", headers=headers, json={})
    assert r.json() == {
        "prefill": {"name": "Siti Nurhaliza Binte Ali", "area_name": None},
        "singpass_verified": False,
    }
    me = (await api.client.get("/me", headers=headers)).json()
    assert me["id"].startswith("u_") and me["id"] != "u_raj"
    assert me["phone"] is None and me["status"] == "active"
    # Same token, same account.
    again = (await api.client.get("/me", headers=headers)).json()
    assert again["id"] == me["id"]


async def test_onboarding_answers_are_saved(api: Api) -> None:
    h = await api.as_new_member()
    r = await api.client.patch(
        "/me",
        headers=h,
        json={
            "name": "Tan Ah Huat",
            "preferred_name": "Ah Huat",
            "area_name": "Toa Payoh",
            "interests": ["taichi", "music"],
            "channel_pref": "whatsapp",
            "language": "zh",
            "push_token": "ExponentPushToken[abc]",
        },
    )
    assert r.status_code == 200
    me = r.json()
    assert (me["name"], me["preferred_name"], me["language"]) == ("Tan Ah Huat", "Ah Huat", "zh")
    assert me["interests"] == ["taichi", "music"] and me["channel_pref"] == "whatsapp"
    profile = (await api.client.get("/users/me/profile", headers=h)).json()
    assert profile["languages"] == ["en", "zh"]
    bad = await api.client.patch("/me", headers=h, json={"language": "fr"})
    assert bad.status_code == 422


# ---------- Events and Circles ----------


async def test_events_soonest_first_with_filters(api: Api) -> None:
    events = (await api.client.get("/events")).json()
    starts = [e["start_at"] for e in events]
    assert starts == sorted(starts) and len(events) == 8
    walks = (await api.client.get("/events?category=walk")).json()
    assert {e["id"] for e in walks} == {"e_walk_bishan", "e_walk_toapayoh"}
    classes = (await api.client.get("/events?category=class")).json()
    assert {e["category"] for e in classes} == {"class", "exercise"}
    week = (await api.client.get("/events?when=week")).json()
    assert len(week) == 8


async def test_event_detail_lists_the_host_first(api: Api) -> None:
    e = (await api.client.get("/events/e_walk_bishan")).json()
    assert e["host"]["name"] == "Lim Ah Kow"
    assert [p["id"] for p in e["attendees"]] == ["u_lim", "u_ahmad"]
    assert e["going_count"] == 12 and e["my_rsvp"] is None
    assert e["circle"] == {"id": "c_walkers", "name": "Bishan Walkers"}
    assert (await api.client.get("/events/nope")).status_code == 404


async def test_join_and_undo(api: Api) -> None:
    h = await api.as_new_member()
    joined = (await api.client.post("/events/e_taichi/rsvp", headers=h)).json()
    assert joined["my_rsvp"] == "going" and joined["going_count"] == 10
    undone = (await api.client.delete("/events/e_taichi/rsvp", headers=h)).json()
    assert undone["my_rsvp"] is None and undone["going_count"] == 9


async def test_start_something(api: Api) -> None:
    h = await api.as_new_member()
    past = await api.client.post(
        "/events",
        headers=h,
        json={
            "title": "Kopi chat",
            "category": "meetup",
            "start_at": in_days(-1),
            "end_at": None,
            "place_name": "Block 5 void deck",
            "whatsapp_link": None,
        },
    )
    assert past.status_code == 422
    r = await api.client.post(
        "/events",
        headers=h,
        json={
            "title": "Kopi chat",
            "category": "meetup",
            "start_at": in_days(2),
            "end_at": None,
            "place_name": "Block 5 void deck",
            "whatsapp_link": None,
        },
    )
    assert r.status_code == 201
    e = r.json()
    assert e["my_rsvp"] == "going" and e["going_count"] == 1
    # The host can't un-join their own event.
    still = (await api.client.delete(f"/events/{e['id']}/rsvp", headers=h)).json()
    assert still["my_rsvp"] == "going"


async def test_circles_mine_near_join_leave(api: Api) -> None:
    raj = (await api.client.get("/circles")).json()
    assert [c["id"] for c in raj["mine"]] == ["c_walkers", "c_block123"]
    assert [c["id"] for c in raj["near"]] == ["c_gardeners"]
    assert raj["mine"][0]["next_event"]["id"] == "e_walk_bishan"

    h = await api.as_new_member()
    joined = (await api.client.post("/circles/c_gardeners/join", headers=h)).json()
    assert joined["is_member"] and joined["member_count"] == 18
    detail = (await api.client.get("/circles/c_gardeners", headers=h)).json()
    assert detail["captain"]["id"] == "u_chen" and detail["members"][0]["id"] == "u_chen"
    assert [e["id"] for e in detail["upcoming"]] == ["e_garden"]
    left = (await api.client.delete("/circles/c_gardeners/join", headers=h)).json()
    assert not left["is_member"] and left["member_count"] == 17


# ---------- Today, check-ins, reminders ----------


async def test_today_suggests_a_walk_to_join(api: Api) -> None:
    today = (await api.client.get("/home/today")).json()
    assert today["next_event"]["category"] == "walk"
    assert today["next_event"]["my_rsvp"] is None
    assert today["next_reminder"]["text"] in ("Take medicine", "Blood pressure tablet")


async def test_checkin_no_offers_a_walk_and_keeps_the_week(api: Api) -> None:
    h = await api.as_new_member()
    assert (await api.client.get("/home/today", headers=h)).json()["checkin"]["pending"]
    r = (await api.client.post("/checkins", headers=h, json={"answer": "no"})).json()
    assert r["streak"] == 0 and r["suggestion"]["category"] == "walk"
    week = (await api.client.get("/checkins/week", headers=h)).json()
    assert len(week["days"]) == 7 and "no" in [d["answer"] for d in week["days"]]
    assert not (await api.client.get("/home/today", headers=h)).json()["checkin"]["pending"]
    # Changing their mind to yes starts a streak.
    yes = (await api.client.post("/checkins", headers=h, json={"answer": "yes"})).json()
    assert yes["streak"] == 1 and yes["suggestion"] is None


async def test_raj_has_a_five_day_streak(api: Api) -> None:
    assert (await api.client.get("/checkins/week")).json()["streak"] >= 5


async def test_reminders_add_done_delete(api: Api) -> None:
    h = await api.as_new_member()
    no_date = await api.client.post(
        "/reminders",
        headers=h,
        json={"kind": "doctor", "text": "Clinic", "time": "09:30", "repeat": "once", "date": None},
    )
    assert no_date.status_code == 422
    bad_time = await api.client.post(
        "/reminders",
        headers=h,
        json={"kind": "other", "text": "x", "time": "25:00", "repeat": "daily", "date": None},
    )
    assert bad_time.status_code == 422
    r = await api.client.post(
        "/reminders",
        headers=h,
        json={
            "kind": "medicine",
            "text": "Vitamins",
            "time": "07:30",
            "repeat": "daily",
            "date": None,
        },
    )
    assert r.status_code == 201
    rid = r.json()["id"]
    assert (await api.client.post(f"/reminders/{rid}/done", headers=h)).status_code == 204
    [listed] = (await api.client.get("/reminders", headers=h)).json()
    assert listed["done_today"] and listed["created_by"] == "self"
    assert (await api.client.delete(f"/reminders/{rid}", headers=h)).status_code == 204
    assert (await api.client.get("/reminders", headers=h)).json() == []


# ---------- Family ----------


async def test_family_invite_yes_then_reminders_for_dad(api: Api) -> None:
    daughter = await api.as_new_member("Priya Raman")
    invite = await api.client.post(
        "/family/invite",
        headers=daughter,
        json={
            "senior_name": "Raman S",
            "senior_phone": f"+659{datetime.now(UTC).strftime('%H%M%S%f')[:7]}",
            "relation": "father",
            "language": "ta",
            "interests": ["walking"],
            "add_me_to_safe_circle": True,
        },
    )
    assert invite.status_code == 201
    inv = invite.json()
    assert inv["status"] == "invited" and inv["senior_id"] is None

    stranger = await api.as_new_member()
    assert (
        await api.client.post(f"/invites/{inv['id']}/accept", headers=stranger)
    ).status_code == 404
    reminder = {
        "kind": "medicine",
        "text": "Eye drops",
        "time": "09:00",
        "repeat": "daily",
        "date": None,
    }
    early = await api.client.post(
        "/reminders", headers=daughter, json={**reminder, "for_senior_id": "u_raj"}
    )
    assert early.status_code == 403

    accepted = (await api.client.post(f"/invites/{inv['id']}/accept", headers=daughter)).json()
    assert accepted["status"] == "accepted" and accepted["senior_id"]
    [listed] = (await api.client.get("/family/invites", headers=daughter)).json()
    assert listed["status"] == "accepted"

    r = await api.client.post(
        "/reminders",
        headers=daughter,
        json={**reminder, "for_senior_id": accepted["senior_id"]},
    )
    assert r.status_code == 201 and r.json()["created_by"] == "family"
    # It rings on Dad's phone, not hers.
    assert (await api.client.get("/reminders", headers=daughter)).json() == []
    stranger_try = await api.client.post(
        "/reminders", headers=stranger, json={**reminder, "for_senior_id": accepted["senior_id"]}
    )
    assert stranger_try.status_code == 403


# ---------- Walks ----------


async def test_upload_a_walk_and_see_its_summary(api: Api) -> None:
    h = await api.as_new_member()
    start = datetime.now(UTC) - timedelta(hours=1)
    points = _bishan_loop(start, 0.5)
    r = await api.client.post(
        "/walks",
        headers=h,
        json={
            "segments": [[p.model_dump() for p in points]],
            "steps": 1700,
            "started_at": start.isoformat(),
            "ended_at": (start + timedelta(minutes=16)).isoformat(),
            "event_id": None,
        },
    )
    assert r.status_code == 201, r.text
    walk = r.json()
    assert 1100 < walk["distance_m"] < 1300 and walk["praise"] == {"kind": "first_walk"}
    assert walk["route_polyline"] and walk["route_public_polyline"] != walk["route_polyline"]

    # Someone else sees only the public route.
    other = await api.as_new_member()
    seen = (await api.client.get(f"/walks/{walk['id']}", headers=other)).json()
    assert seen["route_polyline"] is None
    stats = (await api.client.get("/walks/stats?period=week", headers=h)).json()
    assert stats["walks"] == 1 and stats["last_walk"]["id"] == walk["id"]


async def test_raj_has_three_weeks_of_walks(api: Api) -> None:
    stats = (await api.client.get("/walks/stats")).json()
    assert stats["last_walk"] is not None and len(stats["days"]) == 7
    month = (await api.client.get("/walks?period=month")).json()
    assert len(month) >= 10


async def test_walk_history_week_and_month(api: Api) -> None:
    # S24 (iteration 3.2): totals match the walks, bars add up, bests are right.
    week = (await api.client.get("/walks/stats?period=week")).json()
    month = (await api.client.get("/walks/stats?period=month")).json()
    for s in (week, month):
        assert s["distance_m"] == sum(d["distance_m"] for d in s["days"])
        assert s["walks"] == len(s["items"])
        assert s["distance_m"] == sum(w["distance_m"] for w in s["items"])
        dates = [w["started_at"] for w in s["items"]]
        assert dates == sorted(dates, reverse=True)
        assert all(w["route_public_polyline"] for w in s["items"])
    assert week["period"] == "week" and len(week["days"]) == 7
    assert month["period"] == "month" and len(month["days"]) == 4
    # Four weeks hold every seeded walk from the last 20 days (and the week's).
    assert month["walks"] >= week["walks"] and month["walks"] >= 9
    assert month["bests"] == week["bests"]
    bests = week["bests"]
    longest = (await api.client.get(f"/walks/{bests['longest_walk_id']}")).json()
    assert (
        longest["distance_m"] == bests["longest_m"] >= max(w["distance_m"] for w in month["items"])
    )
    assert bests["most_steps_day"] >= max(w["steps"] for w in month["items"])
    assert bests["walks_this_month"] >= 1


# ---------- SOS ----------


async def test_sos_tells_the_safe_circle_and_shows_who_is_coming(api: Api) -> None:
    api.clock.freeze()
    try:
        await _sos_story(api)
    finally:
        api.clock.reset()


async def _sos_story(api: Api) -> None:
    r = await api.client.post("/sos", json={"trigger": "button", "lat": None, "lng": None})
    assert r.status_code == 201
    alert = r.json()
    assert alert["status"] == "open"
    assert [(h["name"], h["distance_m"]) for h in alert["helpers"]] == [
        ("Priya Kumar", None),
        ("Ahmad Rahman", 300),
        ("Lim Ah Kow", 650),
    ]
    api.clock.advance(4)  # Priya sets off after 3 s, Ahmad after 6 s (demo story)
    later = (await api.client.get(f"/sos/{alert['id']}")).json()
    assert later["status"] == "helper_coming"
    assert [h["status"] for h in later["helpers"]] == ["on_way", "notified", "notified"]
    # The app finds it however it was started (app, WhatsApp, a call).
    active = (await api.client.get("/sos/active")).json()
    assert active["id"] == alert["id"] and active["status"] == "helper_coming"

    done = await api.client.patch(f"/sos/{alert['id']}", json={"status": "resolved"})
    assert done.status_code == 204
    assert (await api.client.get(f"/sos/{alert['id']}")).json()["status"] == "resolved"
    assert (await api.client.get("/sos/active")).json() is None
    # Nobody else can see it.
    other = await api.as_new_member()
    assert (await api.client.get(f"/sos/{alert['id']}", headers=other)).status_code == 404


async def test_safe_circle_keeps_ids_and_caps_at_five(api: Api) -> None:
    h = await api.as_new_member()
    one = {"name": "Mei", "phone": "+6591111111", "is_family": True}
    first = (await api.client.put("/safe-circle", headers=h, json={"members": [one]})).json()
    two = {"name": "Ali", "phone": "+6592222222", "is_family": False}
    second = (await api.client.put("/safe-circle", headers=h, json={"members": [two, one]})).json()
    assert second[1]["id"] == first[0]["id"] and second[0]["name"] == "Ali"
    six = await api.client.put("/safe-circle", headers=h, json={"members": [two] * 6})
    assert six.status_code == 422


# ---------- Pass It On ----------


async def test_rajs_profile(api: Api) -> None:
    p = (await api.client.get("/users/me/profile")).json()
    assert p["given"] == {"sessions_taught": 14, "people_helped": 23, "thank_yous": 13}
    assert [b["key"] for b in p["badges"]] == [
        "first_session",
        "kind_neighbour",
        "ten_thanks",
        "storyteller",
    ]
    chess = next(s for s in p["skills"] if s["id"] == "s_chess")
    assert chess["endorsement_count"] == 10 and chess["event_id"] == "e_chess"
    assert p["thank_yous"][0]["from"]["name"] == "David Ong"
    assert p["thank_yous"][0]["kind"] == "voice"
    other = (await api.client.get("/users/u_tan/profile")).json()
    assert other["name"] == "Tan Mei Ling" and other["skills"][0]["title"] == "Nyonya kueh"


async def test_thanks_only_after_going(api: Api) -> None:
    h = await api.as_new_member()
    r = await api.client.post(
        "/endorsements", headers=h, data={"event_id": "e_past_kueh", "kind": "thumb"}
    )
    assert r.status_code == 403


async def test_thank_mdm_tan_once(api: Api) -> None:
    [prompt] = (await api.client.get("/endorsements/pending")).json()
    assert prompt["event_id"] == "e_past_kueh" and prompt["host"]["name"] == "Tan Mei Ling"
    r = await api.client.post(
        "/endorsements",
        data={"event_id": "e_past_kueh", "kind": "voice", "duration_s": "6"},
        files={"audio": ("thanks.m4a", b"\x00" * 2048, "audio/m4a")},
    )
    assert r.status_code == 201, r.text
    thanks = r.json()
    assert thanks["from"]["id"] == "u_raj" and thanks["skill"]["title"] == "Nyonya kueh"
    assert thanks["voice"]["audio_url"].startswith("https://storage.test/thanks/u_raj/")
    assert (await api.client.get("/endorsements/pending")).json() == []
    again = await api.client.post(
        "/endorsements", data={"event_id": "e_past_kueh", "kind": "thumb"}
    )
    assert again.status_code == 409
    tan = (await api.client.get("/users/u_tan/profile")).json()
    assert tan["given"]["thank_yous"] == 1


async def test_skill_with_a_date_becomes_an_event(api: Api) -> None:
    h = await api.as_new_member()
    r = await api.client.post(
        "/skills",
        headers=h,
        json={
            "title": "Erhu for beginners",
            "tags": ["music"],
            "start_at": in_days(3),
            "place_name": "Bishan CC",
            "is_paid": False,
        },
    )
    assert r.status_code == 201
    skill = r.json()
    event = (await api.client.get(f"/events/{skill['event_id']}", headers=h)).json()
    assert event["category"] == "music" and event["title"] == "Erhu for beginners"
    assert (await api.client.delete(f"/skills/{skill['id']}", headers=h)).status_code == 204
    gone = await api.client.get(f"/events/{skill['event_id']}", headers=h)
    assert gone.status_code == 404


async def test_voice_intro_upload(api: Api) -> None:
    h = await api.as_new_member()
    r = await api.client.put(
        "/me/intro",
        headers=h,
        data={"duration_s": "9.5"},
        files={"audio": ("intro.m4a", b"\x00" * 4096, "audio/m4a")},
    )
    assert r.status_code == 200, r.text
    assert r.json()["duration_s"] == 9.5
    profile = (await api.client.get("/users/me/profile", headers=h)).json()
    assert profile["intro"]["audio_url"] == r.json()["audio_url"]
    assert [b["key"] for b in profile["badges"]] == ["storyteller"]
    not_audio = await api.client.put(
        "/me/intro",
        headers=h,
        data={"duration_s": "1"},
        files={"audio": ("x.txt", b"hello", "text/plain")},
    )
    assert not_audio.status_code == 415


async def test_speech_says_it_is_not_available_yet(api: Api) -> None:
    r = await api.client.post("/tts", json={"text": "Hello", "language": "ta"})
    assert r.status_code == 503
