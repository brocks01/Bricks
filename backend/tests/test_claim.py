"""The claim flow: an assisted profile becomes the person's own account with a code the helper shows them."""
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
            conn.execute(text("delete from claim_invites where user_id = :u or created_by = :u"), {"u": uid})
        for uid in uids:
            conn.execute(text("delete from families where created_by = :u"), {"u": uid})
        for uid in uids:
            conn.execute(text("delete from users where set_up_by = :u"), {"u": uid})
            conn.execute(text("delete from users where id = :u"), {"u": uid})
        for e in EMAILS:
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})
            conn.execute(text("delete from refresh_tokens where user_id in (select id from users where email = :e)"), {"e": e})


def sign_in(email: str) -> dict:
    sent = client.post("/v1/auth/request-code", json={"email": email}).json()
    assert sent["sent"] and len(sent["dev_code"]) == 6
    r = client.post("/v1/auth/verify-code", json={"email": email, "code": sent["dev_code"]})
    assert r.status_code == 200, r.text
    return r.json()


def auth(session: dict) -> dict:
    return {"Authorization": f"Bearer {session['access_token']}"}


def assisted_in_a_family() -> tuple[dict, dict, str]:
    s, family = sign_in(fresh_email()), None
    r = client.post("/v1/families", json={"name": "The ghosh family"}, headers=auth(s))
    family = r.json()
    r = client.post(f"/v1/families/{family['id']}/assisted", json={"display_name": "Dhananjay Ghosh", "language": "hi"}, headers=auth(s))
    assisted_id = next(m["user_id"] for m in r.json()["members"] if m["login_kind"] == "assisted")
    return s, family, assisted_id


def test_the_person_claims_their_own_account_with_the_code():
    s, family, assisted_id = assisted_in_a_family()
    code = client.post(f"/v1/families/{family['id']}/assisted/{assisted_id}/claim-code", headers=auth(s)).json()["code"]
    own_email = fresh_email()
    r = client.post("/v1/auth/claim", json={"code": code, "email": own_email})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["id"] == assisted_id and body["user"]["login_kind"] == "own" and body["user"]["email"] == own_email
    # the session they got is really theirs
    me = client.get("/v1/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200 and me.json()["id"] == assisted_id
    # the one-time setup help ended with the claim
    me_on_behalf = client.get("/v1/me", headers={**auth(s), "X-Bricks-On-Behalf": assisted_id})
    assert me_on_behalf.status_code == 403
    # the history shows it
    events = client.get("/v1/me/permission-events", headers={"Authorization": f"Bearer {body['access_token']}"}).json()["events"]
    assert "claimed" in [e["action"] for e in events]


def test_the_claim_code_cannot_be_used_twice():
    s, family, assisted_id = assisted_in_a_family()
    code = client.post(f"/v1/families/{family['id']}/assisted/{assisted_id}/claim-code", headers=auth(s)).json()["code"]
    r = client.post("/v1/auth/claim", json={"code": code, "email": fresh_email()})
    assert r.status_code == 200
    r = client.post("/v1/auth/claim", json={"code": code, "email": fresh_email()})
    assert r.status_code == 400 and r.json()["detail"]["code"] == "code_invalid"


def test_an_email_that_already_belongs_to_someone_is_refused():
    s, family, assisted_id = assisted_in_a_family()
    code = client.post(f"/v1/families/{family['id']}/assisted/{assisted_id}/claim-code", headers=auth(s)).json()["code"]
    taken = fresh_email()
    sign_in(taken)  # that address now belongs to a real account
    r = client.post("/v1/auth/claim", json={"code": code, "email": taken})
    assert r.status_code == 409 and r.json()["detail"]["code"] == "email_in_use"


def test_a_member_without_a_delegation_cannot_ask_for_a_claim_code():
    s, family, assisted_id = assisted_in_a_family()
    r = client.post(f"/v1/families/{family['id']}/assisted/{assisted_id}/claim-code", headers=auth(sign_in(fresh_email())))
    assert r.status_code == 403 and r.json()["detail"]["code"] in ("no_access", "not_a_member")


def test_a_garbage_code_is_refused():
    r = client.post("/v1/auth/claim", json={"code": "000000", "email": fresh_email()})
    assert r.status_code == 400 and r.json()["detail"]["code"] == "code_invalid"
