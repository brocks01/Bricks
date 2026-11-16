"""Security tests, part 2: nobody reads or changes another person's data. Family, calendar and the
in-app notifications are scoped to the person (or to a live delegation); onboarding sections that do
not apply are refused; malformed ids answer "not found", never a server error."""
import uuid

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
            conn.execute(text("delete from calendar_marks where item_id in (select id from calendar_items where created_by in (select id from users where email = :e))"), {"e": e})
            conn.execute(text("delete from calendar_items where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from notifications where user_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from delegations where helper_id in (select id from users where email = :e) or user_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from permission_events where user_id in (select id from users where email = :e) or actor_user_id in (select id from users where email = :e) or helper_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from family_members where user_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from families where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from announcements where community_id in (select id from communities where created_by in (select id from users where email = :e))"), {"e": e})
            conn.execute(text("delete from memberships where community_id in (select id from communities where created_by in (select id from users where email = :e))"), {"e": e})
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person(name="Access Person", band="60plus") -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    h = {"Authorization": f"Bearer {s['access_token']}"}
    client.patch("/v1/me", json={"display_name": name, "age_band": band}, headers=h)
    return {"h": h, "id": s["user"]["id"]}


# ---- family ----
def test_a_family_is_invisible_to_people_outside_it():
    owner, stranger = person("Family Ow", band="40to59"), person("Stranger S")
    fam = client.post("/v1/families", json={"name": "The Ow family"}, headers=owner["h"]).json()
    fid = fam["id"]
    assert client.get(f"/v1/families/{fid}", headers=stranger["h"]).status_code == 403
    assert client.get(f"/v1/families/{fid}", headers=stranger["h"]).json()["detail"]["code"] == "not_a_member"
    assert client.patch(f"/v1/families/{fid}", json={"name": "Renamed"}, headers=stranger["h"]).status_code == 403
    assert client.post(f"/v1/families/{fid}/invites", json={"contact": f"test-{uuid.uuid4().hex[:6]}@example.com", "role": "helper"}, headers=stranger["h"]).status_code == 403
    assert client.patch(f"/v1/families/{fid}/members/{owner['id']}", json={"role": "helper"}, headers=stranger["h"]).status_code == 403
    assert client.delete(f"/v1/families/{fid}/members/{owner['id']}", headers=stranger["h"]).status_code == 403
    mine = client.get(f"/v1/families/{fid}", headers=owner["h"])
    assert mine.status_code == 200 and mine.json()["my_role"] == "owner"


def test_an_invite_code_made_up_is_refused():
    p = person("Inviter Iv", band="40to59")
    r = client.post("/v1/family-invites/accept", json={"code": "NOPE-NOPE-NOPE"}, headers=p["h"])
    assert r.status_code in (400, 404, 422)  # refused for the code, never accepted


def test_a_malformed_family_or_delegation_id_is_not_found_never_a_crash():
    p = person("Shape Sh")
    r = client.get("/v1/families/not-a-uuid", headers=p["h"])
    assert r.status_code == 404, f"a malformed id answered {r.status_code}"
    assert client.patch("/v1/delegations/not-a-uuid", json={"level": "full"}, headers=p["h"]).status_code == 404
    assert client.delete("/v1/delegations/not-a-uuid", headers=p["h"]).status_code == 404
    assert client.post("/v1/delegations", json={"helper_id": "zz", "level": "full"}, headers=p["h"]).status_code in (403, 404, 422)


# ---- calendar ----
def test_a_calendar_item_is_private_to_its_person():
    owner, stranger = person("Cal Ow"), person("Cal St")
    item = client.post("/v1/calendar/items", json={"title": "Blood pressure tablet", "kind": "medicine", "starts_at": "2026-11-17T09:00:00+08:00"}, headers=owner["h"]).json()
    iid = item["id"] if isinstance(item, dict) and "id" in item else item.get("item_id")
    assert iid, item
    r = client.get("/v1/calendar/occurrences", params={"person_id": owner["id"]}, headers=stranger["h"])
    assert r.status_code == 403  # another person's calendar is not mine to open
    # a stranger is refused without being told whether the item exists (403 or 404, never 200)
    assert client.get(f"/v1/calendar/items/{iid}", headers=stranger["h"]).status_code in (403, 404)
    assert client.patch(f"/v1/calendar/items/{iid}", json={"title": "Hacked"}, headers=stranger["h"]).status_code in (403, 404)
    assert client.delete(f"/v1/calendar/items/{iid}", headers=stranger["h"]).status_code in (403, 404)
    assert client.post("/v1/calendar/occurrences", headers=stranger["h"]).status_code in (401, 405)
    mine = client.get(f"/v1/calendar/items/{iid}", headers=owner["h"])
    assert mine.status_code == 200 and mine.json()["title"] == "Blood pressure tablet"


def test_a_malformed_person_or_item_id_is_not_found_never_a_crash():
    p = person("Cal Shape")
    assert client.get("/v1/calendar/occurrences", params={"person_id": "zz"}, headers=p["h"]).status_code == 404
    assert client.get("/v1/calendar/items/zz", headers=p["h"]).status_code == 404


# ---- notifications ----
def test_notifications_are_read_only_by_their_person():
    a, b = person("Notif A"), person("Notif B")
    from app.modules.channels import outbox

    made = outbox.send(a["id"], "Your walk is at four.", kind="nudge", urgent=True)
    nid = made["id"]
    assert nid
    foreign = client.post(f"/v1/notifications/{nid}/read", headers=b["h"])
    assert foreign.json()["marked"] == 0
    with engine().begin() as conn:
        status = conn.execute(text("select status from notifications where id = :i"), {"i": nid}).scalar_one()
    assert status != "read"  # B could not mark it
    assert client.post(f"/v1/notifications/{nid}/read", headers=a["h"]).json()["marked"] == 1
    b_inbox = client.get("/v1/notifications", headers=b["h"]).json()
    b_ids = [n["id"] for n in b_inbox.get("notifications", b_inbox.get("items", []))]
    assert nid not in b_ids  # B's inbox never shows A's notification


# ---- onboarding: only your own sections ----
def test_a_section_that_does_not_apply_is_refused():
    p = person("Role Ro")
    assert client.put("/v1/onboarding/purpose", json={"answers": {"roles": ["connect"]}}, headers=p["h"]).status_code == 200
    r = client.put("/v1/onboarding/share", json={"answers": {"field": "Carpentry"}}, headers=p["h"])
    assert r.status_code == 400 and r.json()["detail"]["code"] == "no_such_section"
