"""Delegation tests: who may act on whose account, at which level, and how access ends."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app

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
            conn.execute(text("delete from permission_events where actor_user_id = :u or user_id = :u or helper_id = :u"), {"u": uid})
            conn.execute(text("delete from delegations where user_id = :u or helper_id = :u"), {"u": uid})
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


def make_family(name: str) -> tuple[dict, dict]:
    s = sign_in(fresh_email())
    r = client.post("/v1/families", json={"name": name}, headers=auth(s))
    assert r.status_code == 200, r.text
    return s, r.json()


def add_member(family: dict, owner_session: dict) -> dict:
    """A second, real person joins by their own invitation code; the OWNER invites, the person accepts."""
    joiner = sign_in(fresh_email())
    resp = client.post("/v1/families/" + family["id"] + "/invites", json={"contact": fresh_phone()}, headers=auth(owner_session))
    assert resp.status_code == 200, resp.text
    code = resp.json()["dev_code"]
    r = client.post("/v1/family-invites/accept", json={"code": code}, headers=auth(joiner))
    assert r.status_code == 200, r.text
    return joiner


def test_setup_delegation_is_created_with_the_assisted_profile():
    s, family = make_family("The kapoor family")
    r = client.post(f"/v1/families/{family['id']}/assisted", json={"display_name": "Rajesh Kumar", "language": "hi"}, headers=auth(s))
    assert r.status_code == 200, r.text
    held = client.get("/v1/delegations/mine", headers=auth(s)).json()["delegations"]
    assert len(held) == 1 and held[0]["level"] == "setup" and held[0]["granted_by"] == "setup"


def test_helper_reads_the_assisted_profile_on_behalf():
    s, family = make_family("The nair family")
    r = client.post(f"/v1/families/{family['id']}/assisted", json={"display_name": "Sunita Kumar"}, headers=auth(s))
    assisted_id = next(m["user_id"] for m in r.json()["members"] if m["login_kind"] == "assisted")
    me = client.get("/v1/me", headers={**auth(s), "X-Bricks-On-Behalf": assisted_id})
    assert me.status_code == 200, me.text
    assert me.json()["display_name"] == "Sunita Kumar" and me.json()["login_kind"] == "assisted"
    # and may finish their set-up (that is what the setup level is for)
    r = client.patch("/v1/me", json={"area_name": "Pune"}, headers={**auth(s), "X-Bricks-On-Behalf": assisted_id})
    assert r.status_code == 200 and r.json()["area_name"] == "Pune"


def test_a_stranger_cannot_act_on_behalf():
    s, family = make_family("The bose family")
    r = client.post(f"/v1/families/{family['id']}/assisted", json={"display_name": "Arun Bose"}, headers=auth(s))
    assisted_id = next(m["user_id"] for m in r.json()["members"] if m["login_kind"] == "assisted")
    stranger = sign_in(fresh_email())
    me = client.get("/v1/me", headers={**auth(stranger), "X-Bricks-On-Behalf": assisted_id})
    assert me.status_code == 403 and me.json()["detail"]["code"] == "no_access"


def test_setup_help_does_not_follow_a_claimed_account():
    s, family = make_family("The pillai family")
    r = client.post(f"/v1/families/{family['id']}/assisted", json={"display_name": "Meena Pillai"}, headers=auth(s))
    assisted_id = next(m["user_id"] for m in r.json()["members"] if m["login_kind"] == "assisted")
    with engine().begin() as conn:  # simulate the person claiming their own login (phase 3 does it properly)
        conn.execute(text("update users set login_kind = 'own' where id = :u"), {"u": assisted_id})
    me = client.get("/v1/me", headers={**auth(s), "X-Bricks-On-Behalf": assisted_id})
    assert me.status_code == 403 and me.json()["detail"]["code"] == "no_access"


def test_the_person_controls_their_own_access():
    s, family = make_family("The ghosh family")
    member = add_member(family, s)
    owner_id = family["members"][0]["user_id"]
    # the member hands the owner ongoing help
    g = client.post("/v1/delegations", json={"helper_id": owner_id, "level": "ongoing"}, headers=auth(member))
    assert g.status_code == 200, g.text
    delegation_id = g.json()["id"]
    me = client.get("/v1/me", headers={**auth(s), "X-Bricks-On-Behalf": member["user"]["id"]})
    assert me.status_code == 200 and me.json()["id"] == member["user"]["id"]
    # the helper may step back but never step up by themselves
    r = client.patch(f"/v1/delegations/{delegation_id}", json={"level": "full"}, headers=auth(s))
    assert r.status_code == 403 and r.json()["detail"]["code"] == "supported_only"
    r = client.patch(f"/v1/delegations/{delegation_id}", json={"level": "full"}, headers=auth(member))
    assert r.status_code == 200 and r.json()["level"] == "full"
    # ... and the person can take the access away at any time
    r = client.delete(f"/v1/delegations/{delegation_id}", headers=auth(member))
    assert r.status_code == 204
    me = client.get("/v1/me", headers={**auth(s), "X-Bricks-On-Behalf": member["user"]["id"]})
    assert me.status_code == 403 and me.json()["detail"]["code"] == "no_access"
    # the history remembers every step
    events = client.get("/v1/me/permission-events", headers=auth(member)).json()["events"]
    actions = [e["action"] for e in events]
    assert "delegation_granted" in actions and "delegation_changed" in actions and "delegation_revoked" in actions


def test_removing_the_helper_ends_their_access():
    s, family = make_family("The sen family")
    helper = add_member(family, s)
    member_id = helper["user"]["id"]
    g = client.post("/v1/delegations", json={"helper_id": member_id, "level": "ongoing"}, headers=auth(s))
    assert g.status_code == 200, g.text
    # the owner removes the helper from the family: every delegation they held ends
    r = client.delete(f"/v1/families/{family['id']}/members/{member_id}", headers=auth(s))
    assert r.status_code == 204
    me = client.get("/v1/me", headers={**auth(helper), "X-Bricks-On-Behalf": s["user"]["id"]})
    assert me.status_code == 403 and me.json()["detail"]["code"] == "no_access"
