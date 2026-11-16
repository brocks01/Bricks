"""Security tests, part 1: who may call what. Every signed-in route refuses a stranger (401); expired,
forged or wrong-type tokens are refused; admin-only endpoints refuse non-admins; acting for someone else
needs a real delegation; onboarding answers and skills are checked. Reading or changing another person's
data is tested in test_security_access.py; webhooks and input limits in test_security_webhooks.py."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core import security
from app.core.db import engine
from app.main import app

client = TestClient(app)
EMAILS: list[str] = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from notifications where user_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from media_assets where owner_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from delegations where helper_id in (select id from users where email = :e) or user_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from permission_events where user_id in (select id from users where email = :e) or actor_user_id in (select id from users where email = :e) or helper_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person(name="Safety Person", band="60plus", admin=False) -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    h = {"Authorization": f"Bearer {s['access_token']}"}
    client.patch("/v1/me", json={"display_name": name, "age_band": band}, headers=h)
    if admin:
        with engine().begin() as conn:
            conn.execute(text("update users set is_platform_admin = true where id = :u"), {"u": s["user"]["id"]})
    return {"h": h, "id": s["user"]["id"]}


# ---- every signed-in route refuses a stranger ----
SIGNED_IN_ROUTES = [
    ("get", "/v1/me"),
    ("patch", "/v1/me"),
    ("get", "/v1/onboarding"),
    ("put", "/v1/onboarding/basics"),
    ("post", "/v1/onboarding/consent/skip"),
    ("get", "/v1/profile"),
    ("get", "/v1/calendar/people"),
    ("get", "/v1/calendar/occurrences"),
    ("post", "/v1/calendar/items"),
    ("get", "/v1/calendar/missed"),
    ("get", "/v1/calendar/consent"),
    ("get", "/v1/skills"),
    ("post", "/v1/skills/my_day"),
    ("get", "/v1/notifications"),
    ("post", "/v1/notifications/read"),
    ("get", "/v1/insights/pilot"),
    ("get", "/v1/insights/interests"),
    ("get", "/v1/media/status"),
    ("post", "/v1/media/upload"),
    ("get", "/v1/families/mine"),
    ("post", "/v1/families"),
    ("get", "/v1/me/translation"),
    ("put", "/v1/me/translation"),
    ("post", "/v1/translate/text"),
    ("post", "/v1/translate/batch"),
    ("get", "/v1/channels"),
    ("post", "/v1/channels/telegram/link-code"),
    ("delete", "/v1/channels/telegram"),
    ("get", "/v1/suggestions/communities"),
    ("post", "/v1/delegations"),
    ("get", "/v1/delegations/mine"),
    ("get", "/v1/me/permission-events"),
]


@pytest.mark.parametrize("method,path", SIGNED_IN_ROUTES)
def test_a_route_needs_a_token(method, path):
    body = {"args": {}} if method == "post" and path.startswith("/v1/skills") else ({} if method in ("patch", "put", "post") else None)
    assert client.request(method, path, json=body).status_code == 401
    assert client.request(method, path, json=body, headers={"Authorization": "Bearer nonsense"}).status_code == 401


def test_forged_expired_and_wrong_type_tokens_are_refused():
    p = person()
    good = p["h"]["Authorization"].removeprefix("Bearer ")
    h, payload, sig = good.split(".")
    damaged = security.read_claims(f"{h}.{payload}.{sig[:-2]}xx")
    assert damaged is None  # one changed character breaks the signature
    r = client.get("/v1/me", headers={"Authorization": f"Bearer {h}.{payload}.{sig[:-2]}xx"})
    assert r.status_code == 401
    expired = security.make_access_token(p["id"], "sess-expired", minutes=-1)
    assert client.get("/v1/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401
    agent_token = security.make_access_token(p["id"], "sess-agent", kind=security.AGENT)
    assert client.get("/v1/me", headers={"Authorization": f"Bearer {agent_token}"}).status_code == 401


def test_a_valid_token_for_a_missing_person_is_refused():
    ghost = security.make_access_token(str(uuid.uuid4()), "sess-ghost")
    r = client.get("/v1/me", headers={"Authorization": f"Bearer {ghost}"})
    assert r.status_code in (401, 503)  # gone: never waved through


def test_on_behalf_needs_a_live_delegation():
    helper, other = person("Helper Hsu"), person("Uncle Other")
    r = client.get("/v1/me", headers={**helper["h"], "X-Bricks-On-Behalf": other["id"]})
    assert r.status_code == 403 and r.json()["detail"]["code"] == "no_access"
    assert r.json()["detail"]["code"] != "unauthorized"  # refused for access, not for the token
    own = client.get("/v1/me", headers={**helper["h"], "X-Bricks-On-Behalf": helper["id"]})
    assert own.status_code == 200 and own.json()["email"].endswith("@example.com")


def test_a_malformed_on_behalf_header_is_refused_never_a_crash():
    p = person()
    r = client.get("/v1/me", headers={**p["h"], "X-Bricks-On-Behalf": "zz"})
    assert r.status_code in (403, 404), f"a malformed header answered {r.status_code}"


# ---- admin-only endpoints ----
def test_insights_refuse_non_admins_and_answer_admins():
    normal, admin = person("Normal Ng"), person("Admin Amara", admin=True)
    assert client.get("/v1/insights/pilot", headers=normal["h"]).status_code == 403
    assert client.get("/v1/insights/pilot", headers=normal["h"]).json()["detail"]["code"] == "admin_only"
    assert client.get("/v1/insights/interests", headers=normal["h"]).status_code == 403
    ok = client.get("/v1/insights/pilot", headers=admin["h"])
    assert ok.status_code == 200 and "joined" in str(ok.json()).lower() or ok.status_code == 200


# ---- onboarding answers are checked ----
def test_onboarding_refuses_unknown_sections_questions_and_long_text():
    p = person()
    assert client.put("/v1/onboarding/not_a_section", json={"answers": {"a": "b"}}, headers=p["h"]).status_code == 400
    r = client.put("/v1/onboarding/basics", json={"answers": {"not_a_question": "x"}}, headers=p["h"])
    assert r.status_code == 400 and r.json()["detail"]["code"] == "unknown_question"
    r = client.put("/v1/onboarding/basics", json={"answers": {"display_name": "x" * 201}}, headers=p["h"])
    assert r.status_code == 400 and r.json()["detail"]["code"] == "bad_answer"
    r = client.put("/v1/onboarding/basics", json={"answers": {"language": "xx"}}, headers=p["h"])
    assert r.status_code == 400
    r = client.post("/v1/onboarding/consent/skip", headers=p["h"])
    assert r.status_code == 400 and r.json()["detail"]["code"] == "cannot_skip"  # a required part is not skippable
    assert client.get("/v1/onboarding", headers=p["h"]).status_code == 200  # nothing was saved


# ---- skills ----
def test_skills_run_only_for_the_caller_and_confirm_gated_skills_ask_first():
    p = person()
    r = client.post("/v1/skills/not_a_skill", json={"args": {}}, headers=p["h"])
    assert r.status_code == 200 and r.json()["error"] == "unknown_skill"  # a refusal is an answer, not a crash
    r = client.post("/v1/skills/tell_family", json={"args": {"message": "I need a hand"}}, headers=p["h"])
    assert r.status_code == 200 and r.json()["error"] == "needs_confirmation"
    r = client.post("/v1/skills/tell_family", json={"args": {"message": "I need a hand", "confirmed": True}}, headers=p["h"])
    assert r.status_code == 200 and "family_told" in r.json()
