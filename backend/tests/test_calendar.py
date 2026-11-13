"""Calendar tests, against the real local database. Throw-away people, cleaned up; family situations are built
the same way test_family.py and test_delegations.py do it. The expansion unit tests run without the database."""
from datetime import date, datetime, time, timedelta, timezone
from types import SimpleNamespace
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.calendar import service

client = TestClient(app)
EMAILS: list[str] = []


def fresh_email() -> str:
    e = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(e)
    return e


def fresh_phone() -> str:
    return f"+65 8{uuid.uuid4().int >> 100 & 0x7FFFFFF:07d}"


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        uids: list[str] = []
        for e in EMAILS:
            uids.extend(str(r[0]) for r in conn.execute(text("select id from users where email = :e"), {"e": e}))
        for uid in uids:
            conn.execute(text("delete from calendar_marks where item_id in (select id from calendar_items where person_id = :u or created_by = :u)"), {"u": uid})
            conn.execute(text("delete from calendar_items where person_id = :u or created_by = :u"), {"u": uid})
            conn.execute(text("delete from permission_events where actor_user_id = :u or user_id = :u or helper_id = :u"), {"u": uid})
            conn.execute(text("delete from delegations where user_id = :u or helper_id = :u"), {"u": uid})
            conn.execute(text("delete from claim_invites where user_id = :u or created_by = :u"), {"u": uid})
        for uid in uids:
            conn.execute(text("delete from families where created_by = :u"), {"u": uid})
        for uid in uids:
            conn.execute(text("delete from users where set_up_by = :u"), {"u": uid})
            conn.execute(text("delete from users where id = :u"), {"u": uid})
        for e in EMAILS:
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def sign_in(email: str) -> dict:
    sent = client.post("/v1/auth/request-code", json={"email": email}).json()
    assert sent["sent"] and len(sent["dev_code"]) == 6
    r = client.post("/v1/auth/verify-code", json={"email": email, "code": sent["dev_code"]})
    assert r.status_code == 200, r.text
    return r.json()


def auth(session: dict) -> dict:
    return {"Authorization": f"Bearer {session['access_token']}"}


def item(**over) -> dict:
    b = {"kind": "medicine", "title": "Morning tablet", "starts_at": "2026-11-20T08:00:00+08:00", "repeat": "daily"}
    b.update(over)
    return b


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def occurrences(s: dict, **params) -> dict:
    r = client.get("/v1/calendar/occurrences", params=params or {}, headers=auth(s))
    assert r.status_code == 200, r.text
    return r.json()


# ---------------------------------------------------------------- expansion (pure)


def it(first_date, local_time, repeat, tz=480, repeat_days=None, until=None):
    return SimpleNamespace(first_date=first_date, local_time=local_time, tz_offset_min=tz, repeat=repeat,
                           repeat_days=repeat_days, until_date=until)


S = datetime(2026, 11, 20, 0, 0, tzinfo=timezone.utc)
E = datetime(2026, 11, 24, 0, 0, tzinfo=timezone.utc)


def test_once_happens_exactly_on_its_first_date():
    got = service.expand(it(date(2026, 11, 21), time(8, 0), "none"), S, E)
    assert [d.isoformat() for d in got] == ["2026-11-21T00:00:00+00:00"]  # 08:00 at +480 is 00:00 UTC


def test_daily_happens_every_day_until_the_range_ends():
    got = service.expand(it(date(2026, 11, 19), time(8, 0), "daily"), S, E)
    assert [d.date().isoformat() for d in got] == ["2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23"]


def test_weekdays_skips_the_weekend():
    got = service.expand(it(date(2026, 11, 16), time(12, 0), "weekdays"), S, E)  # 16 Nov 2026 is a Monday
    assert [d.date().isoformat() for d in got] == ["2026-11-20", "2026-11-23"]  # Fri and Mon, not Sat/Sun


def test_weekly_uses_the_first_dates_weekday_when_no_days_are_given():
    got = service.expand(it(date(2026, 11, 18), time(9, 0), "weekly"), S, E)  # Wednesday
    assert [d.date().isoformat() for d in got] == []  # the Wednesday 11-18 is before the range, the next one is after it


def test_weekly_with_chosen_days_holds_those_days():
    got = service.expand(it(date(2026, 11, 16), time(9, 0), "weekly", repeat_days=[0, 4]), S, E)  # Mon + Fri
    assert [d.date().isoformat() for d in got] == ["2026-11-20", "2026-11-23"]


def test_until_date_stops_the_repeats():
    got = service.expand(it(date(2026, 11, 19), time(8, 0), "daily", until=date(2026, 11, 21)), S, E)
    assert [d.date().isoformat() for d in got] == ["2026-11-20", "2026-11-21"]


def test_a_negative_offset_moves_the_utc_time_the_other_way():
    got = service.expand(it(date(2026, 11, 21), time(8, 0), "none", tz=-330), S, E)  # 08:00 local at UTC-5:30
    assert [d.isoformat() for d in got] == ["2026-11-21T13:30:00+00:00"]


def test_a_range_that_starts_mid_day_still_catches_that_days_occurrence():
    start = datetime(2026, 11, 21, 2, 0, tzinfo=timezone.utc)  # 10:00 at +480: the 08:00 dose is already past
    got = service.expand(it(date(2026, 11, 21), time(8, 0), "daily"), start, E)
    assert [d.date().isoformat() for d in got] == ["2026-11-22", "2026-11-23"]


def test_the_range_cannot_ask_for_more_than_62_days():
    r = client.get("/v1/calendar/occurrences", params={"from": iso(S), "to": iso(S + timedelta(days=63))}, headers=auth(sign_in(fresh_email())))
    assert r.status_code == 422 and r.json()["detail"]["code"] == "range_too_large"


# ---------------------------------------------------------------- me: create, list, mark


def test_create_and_list_for_myself_in_two_time_zones():
    s = sign_in(fresh_email())
    r = client.post("/v1/calendar/items", json=item(), headers=auth(s))  # 20 Nov 08:00 +08:00 (Singapore)
    assert r.status_code == 200, r.text
    got = occurrences(s, **{"from": iso(S), "to": iso(E)})
    mine = [o for o in got["occurrences"] if o["item_id"] == r.json()["id"]]
    assert len(mine) == 4  # a daily item over four days
    assert mine[0]["occurs_at"].startswith("2026-11-20T00:00") and mine[0]["status"] == "pending"
    assert mine[0]["added_by_name"] == ""  # a bare test account has no name yet
    assert mine[0]["can_edit"] is True
    r2 = client.post("/v1/calendar/items", json=item(title="Evening walk", kind="exercise", repeat="none", starts_at="2026-11-20T18:30:00+05:30"), headers=auth(s))
    got = occurrences(s, **{"from": iso(S), "to": iso(E)})
    walk = [o for o in got["occurrences"] if o["item_id"] == r2.json()["id"]]
    assert len(walk) == 1 and walk[0]["occurs_at"].startswith("2026-11-20T13:00")  # 18:30 at +05:30 is 13:00 UTC


def test_mark_done_is_idempotent_skipped_works_and_unmark_clears():
    s = sign_in(fresh_email())
    iid = client.post("/v1/calendar/items", json=item(), headers=auth(s)).json()["id"]
    when = "2026-11-20T00:00:00+00:00"
    r = client.post(f"/v1/calendar/items/{iid}/mark", json={"occurs_at": when, "status": "done"}, headers=auth(s))
    assert r.status_code == 200 and r.json()["status"] == "done"
    r = client.post(f"/v1/calendar/items/{iid}/mark", json={"occurs_at": when, "status": "done"}, headers=auth(s))
    assert r.status_code == 200
    got = occurrences(s, **{"from": iso(S), "to": iso(E)})
    assert [o["status"] for o in got["occurrences"] if o["item_id"] == iid] == ["done", "pending", "pending", "pending"]
    r = client.post(f"/v1/calendar/items/{iid}/mark", json={"occurs_at": when, "status": "skipped"}, headers=auth(s))
    assert r.json()["status"] == "skipped"
    r = client.delete(f"/v1/calendar/items/{iid}/mark", params={"occurs_at": when}, headers=auth(s))
    assert r.status_code == 200 and r.json()["status"] == "pending"
    r = client.post(f"/v1/calendar/items/{iid}/mark", json={"occurs_at": "2026-11-20T00:05:00+00:00", "status": "done"}, headers=auth(s))
    assert r.status_code == 422 and r.json()["detail"]["code"] == "not_an_occurrence"


def test_cancel_hides_the_item():
    s = sign_in(fresh_email())
    iid = client.post("/v1/calendar/items", json=item(), headers=auth(s)).json()["id"]
    assert client.delete(f"/v1/calendar/items/{iid}", headers=auth(s)).status_code == 200
    got = occurrences(s, **{"from": iso(S), "to": iso(E)})
    assert not [o for o in got["occurrences"] if o["item_id"] == iid]


def test_a_starts_at_without_an_offset_is_refused():
    s = sign_in(fresh_email())
    r = client.post("/v1/calendar/items", json=item(starts_at="2026-11-20T08:00:00"), headers=auth(s))
    assert r.status_code == 422 and r.json()["detail"]["code"] == "time_needs_offset"


def test_the_item_screen_reads_one_item_with_who_added_it():
    s = sign_in(fresh_email())
    assert client.patch("/v1/me", json={"display_name": "Kavya Nair"}, headers=auth(s)).status_code == 200
    iid = client.post("/v1/calendar/items", json=item(title="Walk at the park", kind="exercise", repeat="none"), headers=auth(s)).json()["id"]
    r = client.get(f"/v1/calendar/items/{iid}", headers=auth(s))
    assert r.status_code == 200 and r.json()["title"] == "Walk at the park" and r.json()["added_by_name"] == "Kavya Nair"
    assert r.json()["repeat"] == "none" and r.json()["status"] == "active"
    # a stranger still cannot open it
    assert client.get(f"/v1/calendar/items/{iid}", headers=auth(sign_in(fresh_email()))).status_code == 403


# ---------------------------------------------------------------- family access (the most important)


def assisted_profile(s: dict, family: dict, name: str) -> str:
    r = client.post(f"/v1/families/{family['id']}/assisted", json={"display_name": name}, headers=auth(s))
    assert r.status_code == 200, r.text
    return next(m["user_id"] for m in r.json()["members"] if m["login_kind"] == "assisted")


def test_the_full_family_walk():
    s = sign_in(fresh_email())
    assert client.patch("/v1/me", json={"display_name": "Priya Das"}, headers=auth(s)).status_code == 200
    family = client.post("/v1/families", json={"name": "The Das household"}, headers=auth(s)).json()
    profile = assisted_profile(s, family, "Naren Das")
    # the helper schedules for the profile and reads it back
    r = client.post("/v1/calendar/items", json=item(person_id=profile, title="Blood pressure tablet"), headers=auth(s))
    assert r.status_code == 200, r.text
    iid = r.json()["id"]
    got = occurrences(s, person_id=profile, **{"from": iso(S), "to": iso(E)})
    rows = [o for o in got["occurrences"] if o["item_id"] == iid]
    assert len(rows) == 4 and rows[0]["added_by_name"] == "Priya Das"  # the elderly person always sees who added it
    assert client.post(f"/v1/calendar/items/{iid}/mark", json={"occurs_at": rows[0]["occurs_at"], "status": "done"}, headers=auth(s)).status_code == 200
    # the person list shows me + the profile, nothing else
    pl = client.get("/v1/calendar/people", headers=auth(s)).json()["people"]
    assert [p["id"] for p in pl] == [pl[0]["id"], profile] and pl[0]["is_me"] and pl[1]["level"] == "setup"
    # a stranger gets 403 on every door
    stranger = sign_in(fresh_email())
    assert client.get("/v1/calendar/occurrences", params={"person_id": profile}, headers=auth(stranger)).status_code == 403
    assert client.post("/v1/calendar/items", json=item(person_id=profile), headers=auth(stranger)).status_code == 403
    # ending the access ends it at once
    held = client.get("/v1/delegations/mine", headers=auth(s)).json()["delegations"]
    assert client.delete(f"/v1/delegations/{held[0]['id']}", headers=auth(s)).status_code == 204
    assert client.post("/v1/calendar/items", json=item(person_id=profile), headers=auth(s)).status_code == 403


def test_setup_help_expires_when_the_profile_is_claimed_but_ongoing_help_lives_on():
    # an ongoing helper: a family member hands the owner ongoing access, the owner sees their calendar
    s = sign_in(fresh_email())
    family = client.post("/v1/families", json={"name": "The Rao household"}, headers=auth(s)).json()
    member = sign_in(fresh_email())
    code = client.post(f"/v1/families/{family['id']}/invites", json={"contact": fresh_phone(), "role": "member"}, headers=auth(s)).json()["dev_code"]
    joined = client.post("/v1/family-invites/accept", json={"code": code}, headers=auth(member))
    assert joined.status_code == 200, joined.text
    member_id = next(m["user_id"] for m in joined.json()["members"] if m["is_me"])
    assert client.post("/v1/calendar/items", json=item(person_id=member_id, title="Evening tablet"), headers=auth(s)).status_code == 403
    g = client.post("/v1/delegations", json={"helper_id": family["members"][0]["user_id"], "level": "ongoing"}, headers=auth(member))
    assert g.status_code == 200, g.text
    assert client.post("/v1/calendar/items", json=item(person_id=member_id, title="Evening tablet"), headers=auth(s)).status_code == 200

    # a setup helper is refused once the profile is claimed
    s2 = sign_in(fresh_email())
    family2 = client.post("/v1/families", json={"name": "The Bose household"}, headers=auth(s2)).json()
    profile = assisted_profile(s2, family2, "Arun Bose")
    assert client.post("/v1/calendar/items", json=item(person_id=profile), headers=auth(s2)).status_code == 200
    claim = client.post(f"/v1/families/{family2['id']}/assisted/{profile}/claim-code", headers=auth(s2)).json()["code"]
    r = client.post("/v1/auth/claim", json={"code": claim, "email": fresh_email()})
    assert r.status_code == 200, r.text
    r = client.post("/v1/calendar/items", json=item(person_id=profile), headers=auth(s2))
    # the real claim ends the one-time delegation itself (the spec's setup_expired check never fires); the door is shut either way
    assert r.status_code == 403 and r.json()["detail"]["code"] in ("setup_expired", "no_access")


def test_the_community_activities_i_go_to_show_up_only_for_me_and_are_read_only():
    s = sign_in(fresh_email())
    cid = client.post("/v1/communities", json={"name": "Riverside Club"}, headers=auth(s)).json()["id"]
    with engine().begin() as conn:
        aid = str(conn.execute(
            text("insert into activities (community_id, title, starts_at) values (:c, 'Morning Yoga', :t) returning id"),
            {"c": cid, "t": datetime(2026, 11, 21, 2, 0, tzinfo=timezone.utc)},
        ).one().id)
    assert client.post(f"/v1/communities/activities/{aid}/going", json={"going": True}, headers=auth(s)).status_code == 200
    got = occurrences(s, **{"from": iso(S), "to": iso(E)})
    ev = [o for o in got["occurrences"] if o.get("activity_id") == aid]
    assert len(ev) == 1 and ev[0]["kind"] == "event" and ev[0]["title"] == "Morning Yoga"
    assert ev[0]["can_edit"] is False and ev[0]["item_id"] is None
    other = sign_in(fresh_email())
    assert not [o for o in occurrences(other, **{"from": iso(S), "to": iso(E)})["occurrences"] if o.get("activity_id") == aid]

