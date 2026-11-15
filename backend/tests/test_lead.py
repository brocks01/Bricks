"""Leader tools (votes, the rota), check-in at a gathering, stall slots, leaves from calendar items and aspirations, and a new-community request that carries its product and meeting time."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app

client = TestClient(app)
EMAILS: list[str] = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
        for e in EMAILS:
            conn.execute(text("delete from families where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person() -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"]}


def make(lead, *members, name="Lead Heights"):
    cid = client.post("/v1/communities", json={"name": name}, headers=lead["h"]).json()["id"]
    code = client.get(f"/v1/communities/{cid}", headers=lead["h"]).json()["community"]["invite_code"]
    for m in members:
        client.post("/v1/communities/join", json={"code": code}, headers=m["h"])
    return cid


def activity(cid, lead, title="Sunday garden", when="now() + interval '30 minutes'", category=None):
    with engine().begin() as conn:
        return str(conn.execute(text(f"insert into activities (community_id, organiser_id, title, category, starts_at) values (:c, :o, :t, :k, {when}) returning id"),
                                {"c": cid, "o": lead["id"], "t": title, "k": category}).scalar_one())


# ---------- the vote and the signature product ----------
def test_a_lead_starts_a_vote_members_pick_and_the_winner_becomes_the_signature_product():
    lead, m1, m2, m3 = person(), person(), person(), person()
    cid = make(lead, m1, m2, m3)
    body = {"title": "What should we be known for?", "options": ["Chilli padi", "Herbs", "Planters"]}
    assert client.post(f"/v1/communities/{cid}/votes", json=body, headers=m1["h"]).json()["detail"]["code"] == "not_a_lead"  # members cannot start one
    assert client.post(f"/v1/communities/{cid}/votes", json={"title": "x y", "options": ["Only one"]}, headers=lead["h"]).status_code == 422
    v = client.post(f"/v1/communities/{cid}/votes", json=body, headers=lead["h"]).json()
    assert [o["name"] for o in v["options"]] == ["Chilli padi", "Herbs", "Planters"] and v["voters"] == 0
    assert client.post(f"/v1/communities/{cid}/votes", json=body, headers=lead["h"]).json()["detail"]["code"] == "vote_already_open"
    opt = {o["name"]: o["id"] for o in v["options"]}
    client.post(f"/v1/communities/votes/{v['id']}/ballot", json={"option_id": opt["Herbs"]}, headers=m1["h"])
    client.post(f"/v1/communities/votes/{v['id']}/ballot", json={"option_id": opt["Chilli padi"]}, headers=m2["h"])
    client.post(f"/v1/communities/votes/{v['id']}/ballot", json={"option_id": opt["Chilli padi"]}, headers=m3["h"])
    client.post(f"/v1/communities/votes/{v['id']}/ballot", json={"option_id": opt["Planters"]}, headers=m1["h"])  # changed their mind: one vote each
    seen = client.get(f"/v1/communities/{cid}/vote", headers=m1["h"]).json()["vote"]
    counts = {o["name"]: o["count"] for o in seen["options"]}
    assert counts == {"Chilli padi": 2, "Herbs": 0, "Planters": 1} and seen["my_pick"] == opt["Planters"] and seen["voters"] == 3
    assert client.post(f"/v1/communities/votes/{v['id']}/close", headers=m1["h"]).json()["detail"]["code"] == "not_a_lead"
    closed = client.post(f"/v1/communities/votes/{v['id']}/close", headers=lead["h"]).json()
    assert closed == {"closed": True, "winner": "Chilli padi"}
    lv = client.get(f"/v1/communities/{cid}/lead", headers=lead["h"]).json()
    assert lv["product"] == "Chilli padi" and lv["vote"] is None
    assert client.get(f"/v1/communities/{cid}/lead", headers=m1["h"]).json()["detail"]["code"] == "not_a_lead"


def test_a_tied_vote_has_no_winner():
    lead, m1 = person(), person()
    cid = make(lead, m1, name="Tie Heights")
    v = client.post(f"/v1/communities/{cid}/votes", json={"title": "Pick one", "options": ["Tea", "Coffee"]}, headers=lead["h"]).json()
    opt = {o["name"]: o["id"] for o in v["options"]}
    client.post(f"/v1/communities/votes/{v['id']}/ballot", json={"option_id": opt["Tea"]}, headers=lead["h"])
    client.post(f"/v1/communities/votes/{v['id']}/ballot", json={"option_id": opt["Coffee"]}, headers=m1["h"])
    assert client.post(f"/v1/communities/votes/{v['id']}/close", headers=lead["h"]).json() == {"closed": True, "winner": None}


# ---------- the rota ----------
def test_the_rota_has_a_slot_for_each_coming_week_members_sign_up_and_gaps_show():
    lead, m1, m2 = person(), person(), person()
    cid = make(lead, m1, m2, name="Rota Heights")
    assert client.post(f"/v1/communities/{cid}/rota", json={"weekday": 6, "label": "Garden shift"}, headers=m1["h"]).json()["detail"]["code"] == "not_a_lead"
    assert client.post(f"/v1/communities/{cid}/rota", json={"weekday": 6, "label": "Garden shift", "capacity": 2, "weeks": 4}, headers=lead["h"]).json() == {"made": 4}
    assert client.post(f"/v1/communities/{cid}/rota", json={"weekday": 6, "label": "Garden shift", "capacity": 2, "weeks": 4}, headers=lead["h"]).json() == {"made": 0}  # the same slots are not made twice
    slots = client.get(f"/v1/communities/{cid}/rota", headers=m1["h"]).json()["slots"]
    assert len(slots) == 4 and all(datetime.fromisoformat(s["on"]).weekday() == 6 and s["gap"] == 2 for s in slots)
    first = slots[0]["id"]
    for who in (m1, m2):
        client.post(f"/v1/communities/rota/{first}/signup", json={"on": True}, headers=who["h"])
    assert client.post(f"/v1/communities/rota/{first}/signup", json={"on": True}, headers=lead["h"]).json()["detail"]["code"] == "slot_full"
    again = client.get(f"/v1/communities/{cid}/rota", headers=m1["h"]).json()["slots"][0]
    assert again["gap"] == 0 and again["mine"] is True and len(again["names"]) == 2
    client.post(f"/v1/communities/rota/{first}/signup", json={"on": False}, headers=m1["h"])
    assert client.get(f"/v1/communities/{cid}/rota", headers=m1["h"]).json()["slots"][0]["gap"] == 1
    outsider = person()
    assert client.get(f"/v1/communities/{cid}/rota", headers=outsider["h"]).status_code == 403


# ---------- check-in ----------
def test_im_here_opens_around_the_start_a_lead_can_check_someone_in_and_the_leaf_turns_green():
    lead, m1, m2 = person(), person(), person()
    cid = make(lead, m1, m2, name="Checkin Heights")
    soon, later = activity(cid, lead), activity(cid, lead, "Next week", "now() + interval '3 days'")
    for who in (m1, m2):
        client.post(f"/v1/communities/activities/{soon}/going", json={"going": True}, headers=who["h"])
    assert client.post(f"/v1/communities/activities/{later}/checkin", json={}, headers=m1["h"]).json()["detail"]["code"] == "not_open_yet"
    tr = client.get("/v1/nodes/tree", headers=m1["h"]).json()
    assert tr["leaves"] == 0 and tr["growing"] == 1
    assert client.post(f"/v1/communities/activities/{soon}/checkin", json={}, headers=m1["h"]).json()["checked_in"] is True  # "I'm here"
    assert client.get("/v1/nodes/tree", headers=m1["h"]).json()["leaves"] == 1
    assert client.post(f"/v1/communities/activities/{soon}/checkin", json={"user_id": m2["id"]}, headers=m1["h"]).json()["detail"]["code"] == "not_a_lead"  # members cannot check others in
    assert client.post(f"/v1/communities/activities/{soon}/checkin", json={"user_id": m2["id"]}, headers=lead["h"]).json() == {"checked_in": True, "user_id": m2["id"]}  # check in for them
    assert client.get("/v1/nodes/tree", headers=m2["h"]).json()["leaves"] == 1
    lv = client.get(f"/v1/communities/{cid}/lead", headers=lead["h"]).json()
    today = next(g for g in lv["gatherings"] if g["id"] == soon)
    assert {p["checked_in"] for p in today["people"]} == {True} and len(today["people"]) == 2
    up = client.get("/v1/communities/upcoming?limit=5", headers=m1["h"]).json()["activities"]
    assert next(a for a in up if a["id"] == soon)["i_attended"] is True


def test_checking_in_without_having_said_yes_still_grows_a_leaf_once():
    lead = person()
    cid = make(lead, name="Walkin Heights")
    a = activity(cid, lead, "Tea morning")
    client.post(f"/v1/communities/activities/{a}/checkin", json={}, headers=lead["h"])
    client.post(f"/v1/communities/activities/{a}/checkin", json={}, headers=lead["h"])  # twice: still one leaf
    assert client.get("/v1/nodes/tree", headers=lead["h"]).json()["leaves"] == 1


# ---------- stall slots ----------
def test_a_stall_takes_a_half_of_the_day_or_the_whole():
    lead, senior = person(), person()
    with engine().begin() as conn:
        conn.execute(text("update users set age_band = '60plus' where id = :u"), {"u": senior["id"]})
    cid = make(lead, senior, name="Slot Heights")
    a = activity(cid, lead, "Sunday Market", "now() + interval '3 days'", "Market")
    assert client.post(f"/v1/market/stalls/{a}", json={"selling": "Chilli seedlings", "slot": "first"}, headers=senior["h"]).status_code == 200
    assert client.post(f"/v1/market/stalls/{a}", json={"selling": "x y", "slot": "never"}, headers=senior["h"]).status_code == 422
    s = client.get(f"/v1/market/stalls/{a}", headers=senior["h"]).json()["stalls"]
    assert s[0]["slot"] == "first" and s[0]["selling"] == "Chilli seedlings"
    client.post(f"/v1/market/stalls/{a}", json={"selling": "Chilli seedlings and planters", "slot": "whole"}, headers=senior["h"])
    assert client.get(f"/v1/market/stalls/{a}", headers=senior["h"]).json()["stalls"][0]["slot"] == "whole"


# ---------- leaves from reminders and aspirations ----------
def test_a_reminder_ticked_done_grows_a_leaf_and_taking_it_back_removes_it():
    p = person()
    soon = (datetime.now(timezone.utc) + timedelta(hours=2)).replace(microsecond=0)
    item = client.post("/v1/calendar/items", json={"title": "Morning tablet", "kind": "medicine", "starts_at": soon.isoformat(), "repeat": "none", "remind_before_min": 15}, headers=p["h"])
    assert item.status_code == 200, item.text
    iid = item.json()["id"]
    assert client.post(f"/v1/calendar/items/{iid}/mark", json={"occurs_at": soon.isoformat(), "status": "done"}, headers=p["h"]).status_code == 200
    tr = client.get("/v1/nodes/tree", headers=p["h"]).json()
    assert tr["leaves"] == 1 and any(n["key"] == "care" for n in tr["nodes"] if n["type"] == "area")
    client.post(f"/v1/calendar/items/{iid}/mark", json={"occurs_at": soon.isoformat(), "status": "done"}, headers=p["h"])  # same tick again: still one
    assert client.get("/v1/nodes/tree", headers=p["h"]).json()["leaves"] == 1
    client.post(f"/v1/calendar/items/{iid}/mark", json={"occurs_at": soon.isoformat(), "status": "skipped"}, headers=p["h"])
    assert client.get("/v1/nodes/tree", headers=p["h"]).json()["leaves"] == 0


def test_an_aspiration_reached_grows_a_leaf():
    p = person()
    a = client.post("/v1/grow/aspirations", json={"title": "Learn to video call", "category": "own"}, headers=p["h"])
    assert a.status_code == 200, a.text
    aid = a.json()["id"]
    client.post(f"/v1/grow/aspirations/{aid}/done", json={"done": True}, headers=p["h"])
    tr = client.get("/v1/nodes/tree", headers=p["h"]).json()
    assert tr["leaves"] == 1 and any(n["key"] == "aspire" for n in tr["nodes"] if n["type"] == "area")
    client.post(f"/v1/grow/aspirations/{aid}/done", json={"done": False}, headers=p["h"])
    assert client.get("/v1/nodes/tree", headers=p["h"]).json()["leaves"] == 0


# ---------- a new-community request carries its product and its meeting time ----------
def test_a_new_community_keeps_the_product_and_meeting_time_from_its_request():
    lead = person()
    with engine().begin() as conn:
        conn.execute(text("update users set is_platform_admin = true where id = :u"), {"u": lead["id"]})
    admin = lead
    # the request flow has its own eligibility rule; the admin opens creation for this check
    body = {"name": "Yishun Growers", "kind": "block", "area_name": "Yishun", "product": "Chilli padi", "meeting": "Sundays, 9 to 10 am"}
    with engine().begin() as conn:
        conn.execute(text("insert into community_requests (user_id, name, kind, area_name, product, meeting, status) values (:u, :n, :k, :a, :p, :m, 'approved')"),
                     {"u": lead["id"], "n": body["name"], "k": body["kind"], "a": body["area_name"], "p": body["product"], "m": body["meeting"]})
        rid = str(conn.execute(text("select id from community_requests where user_id = :u"), {"u": lead["id"]}).scalar_one())
    made = client.post(f"/v1/communities/requests/{rid}/create", headers=admin["h"])
    assert made.status_code == 200, made.text
    with engine().begin() as conn:
        row = conn.execute(text("select signature_product, meeting from communities where id = :c"), {"c": made.json()["id"]}).one()
    assert row.signature_product == "Chilli padi" and row.meeting == "Sundays, 9 to 10 am"
