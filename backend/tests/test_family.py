"""Family tests, against the real local database. Every test uses its own throw-away people and cleans up after itself."""
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
    p = f"+65 8{uuid.uuid4().int >> 100 & 0x7FFFFFF:07d}"
    return p


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        uids: list[str] = []
        for e in EMAILS:
            uids.extend(str(r[0]) for r in conn.execute(text("select id from users where email = :e"), {"e": e}))
        for uid in uids:  # the history first, then everything that points at a person
            conn.execute(text("delete from permission_events where actor_user_id = :u or user_id = :u or helper_id = :u"), {"u": uid})
            conn.execute(text("delete from delegations where user_id = :u or helper_id = :u"), {"u": uid})
        for uid in uids:  # the family goes before its members (the delete cascades membership and invitations)
            conn.execute(text("delete from families where created_by = :u"), {"u": uid})
        for uid in uids:
            conn.execute(text("delete from users where set_up_by = :u"), {"u": uid})  # their assisted profiles
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


def test_owner_creates_family_and_becomes_owner():
    s, family = make_family("The kumar household")
    assert family["my_role"] == "owner"
    assert family["name"] == "The kumar household"
    assert len(family["members"]) == 1 and family["members"][0]["is_me"] is True
    mine = client.get("/v1/families/mine", headers=auth(s)).json()["families"]
    assert len(mine) == 1 and mine[0]["role"] == "owner" and mine[0]["member_count"] == 1


def test_person_joins_by_their_own_invitation_code():
    s, family = make_family("The sharma family")
    joiner = sign_in(fresh_email())
    sent = client.post("/v1/families/" + family["id"] + "/invites", json={"contact": fresh_phone()}, headers=auth(s))
    assert sent.status_code == 200, sent.text
    code = sent.json()["dev_code"]
    joined = client.post("/v1/family-invites/accept", json={"code": code}, headers=auth(joiner))
    assert joined.status_code == 200, joined.text
    assert joined.json()["my_role"] == "member"
    assert len(joined.json()["members"]) == 2
    # the same code cannot be used twice
    again = client.post("/v1/family-invites/accept", json={"code": code}, headers=auth(sign_in(fresh_email())))
    assert again.status_code == 400 and again.json()["detail"]["code"] == "code_invalid"
    events = client.get("/v1/families/" + family["id"], headers=auth(s)).json()
    assert any(m["role"] == "member" for m in events["members"] if not m["is_me"])


def test_a_garbage_code_is_refused():
    r = client.post("/v1/family-invites/accept", json={"code": "000000"}, headers=auth(sign_in(fresh_email())))
    assert r.status_code == 400 and r.json()["detail"]["code"] == "code_invalid"


def test_only_the_owner_renames_and_only_the_owner_hands_out_helper():
    s, family = make_family("The verma family")
    joiner = sign_in(fresh_email())
    code = client.post("/v1/families/" + family["id"] + "/invites", json={"contact": fresh_phone()}, headers=auth(s)).json()["dev_code"]
    client.post("/v1/family-invites/accept", json={"code": code}, headers=auth(joiner))
    # a plain member cannot rename or invite
    r = client.patch("/v1/families/" + family["id"], json={"name": "Hijacked name"}, headers=auth(joiner))
    assert r.status_code == 403 and r.json()["detail"]["code"] == "owner_only"
    r = client.post("/v1/families/" + family["id"] + "/invites", json={"contact": fresh_phone()}, headers=auth(joiner))
    assert r.status_code == 403 and r.json()["detail"]["code"] == "helper_only"
    # the owner promotes them, and then they may invite
    members = client.get("/v1/families/" + family["id"], headers=auth(s)).json()["members"]
    joiner_id = next(m["user_id"] for m in members if not m["is_me"])
    r = client.patch(f"/v1/families/{family['id']}/members/{joiner_id}", json={"role": "helper"}, headers=auth(s))
    assert r.status_code == 200, r.text
    assert next(m["role"] for m in r.json()["members"] if m["user_id"] == joiner_id) == "helper"
    r = client.post("/v1/families/" + family["id"] + "/invites", json={"contact": fresh_phone()}, headers=auth(joiner))
    assert r.status_code == 200, r.text


def test_owner_cannot_be_removed_or_demoted():
    s, family = make_family("The das family")
    uid = family["members"][0]["user_id"]
    r = client.patch(f"/v1/families/{family['id']}/members/{uid}", json={"role": "member"}, headers=auth(s))
    assert r.status_code == 422  # the owner's role is not a choice on the list for themselves either
    r = client.delete(f"/v1/families/{family['id']}/members/{uid}", headers=auth(s))
    assert r.status_code == 403 and r.json()["detail"]["code"] == "owner_immutable"


def test_assisted_profile_is_created_inside_the_family_and_is_restricted():
    s, family = make_family("The rao family")
    r = client.post(f"/v1/families/{family['id']}/assisted", json={"display_name": "Rajesh Kumar", "language": "hi", "age_band": "60plus", "relationship": "Grandfather"}, headers=auth(s))
    assert r.status_code == 200, r.text
    member = next(m for m in r.json()["members"] if m["login_kind"] == "assisted")
    assert member["display_name"] == "Rajesh Kumar" and member["language"] == "hi"
    with engine().begin() as conn:
        row = conn.execute(text("select email, login_kind, set_up_by from users where id = :u"), {"u": member["user_id"]}).one()
        assert row.email is None and row.login_kind == "assisted"
        d = conn.execute(text("select level, granted_by, status from delegations where user_id = :u"), {"u": member["user_id"]}).one()
        assert (d.level, d.granted_by, d.status) == ("setup", "setup", "active")
        n = conn.execute(
            text("select count(*) from permission_events where user_id = :u and action in ('assisted_created','delegation_granted')"),
            {"u": member["user_id"]},
        ).scalar_one()
        assert n == 2


def test_one_helper_holds_at_most_five_assisted_profiles():
    s, family = make_family("The iyer family")
    for i in range(5):
        r = client.post(f"/v1/families/{family['id']}/assisted", json={"display_name": f"Family elder {i + 1}"}, headers=auth(s))
        assert r.status_code == 200, r.text
    r = client.post(f"/v1/families/{family['id']}/assisted", json={"display_name": "One too many"}, headers=auth(s))
    assert r.status_code == 403 and r.json()["detail"]["code"] == "assisted_limit"


def test_removing_a_member_revokes_their_delegations():
    s, family = make_family("The menon family")
    r = client.post(f"/v1/families/{family['id']}/assisted", json={"display_name": "Sunita Kumar"}, headers=auth(s))
    assisted_id = next(m["user_id"] for m in r.json()["members"] if m["login_kind"] == "assisted")
    out = client.delete(f"/v1/families/{family['id']}/members/{assisted_id}", headers=auth(s))
    assert out.status_code == 204, out.text
    with engine().begin() as conn:
        st = conn.execute(text("select status from family_members where family_id = :f and user_id = :u"), {"f": family["id"], "u": assisted_id}).one()
        d = conn.execute(text("select status from delegations where user_id = :u"), {"u": assisted_id}).one()
    assert st.status == "removed" and d.status == "revoked"


def test_a_leaving_member_is_gone_but_the_owner_stays():
    s, family = make_family("The chowdhury family")
    joiner = sign_in(fresh_email())
    code = client.post("/v1/families/" + family["id"] + "/invites", json={"contact": fresh_phone()}, headers=auth(s)).json()["dev_code"]
    client.post("/v1/family-invites/accept", json={"code": code}, headers=auth(joiner))
    r = client.delete("/v1/families/" + family["id"] + "/members/me", headers=auth(joiner))
    assert r.status_code == 204, r.text
    mine = client.get("/v1/families/mine", headers=auth(joiner)).json()["families"]
    assert mine == []
    still = client.get("/v1/families/" + family["id"], headers=auth(s)).json()
    assert len(still["members"]) == 1

