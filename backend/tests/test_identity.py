"""Identity tests, against the real local database. Every test uses its own throw-away email and cleans up after itself."""
import base64
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
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def sign_in(email: str) -> dict:
    sent = client.post("/v1/auth/request-code", json={"email": email}).json()
    assert sent["sent"] and len(sent["dev_code"]) == 6
    r = client.post("/v1/auth/verify-code", json={"email": email, "code": sent["dev_code"]})
    assert r.status_code == 200, r.text
    return r.json()


def auth(session: dict) -> dict:
    return {"Authorization": f"Bearer {session['access_token']}"}


def test_health():
    assert client.get("/v1/health").json()["ok"] is True


def test_new_person_signs_in_and_profile_is_incomplete():
    s = sign_in(fresh_email())
    assert s["is_new"] is True and s["user"]["profile_complete"] is False
    me = client.get("/v1/me", headers=auth(s)).json()
    assert me["email"] == s["user"]["email"] and me["language"] == "en"


def test_returning_person_is_not_new():
    e = fresh_email()
    sign_in(e)
    import time
    time.sleep(0.1)
    with engine().begin() as conn:  # skip the 30 second wait between codes for the test
        conn.execute(text("update login_codes set created_at = created_at - interval '1 minute' where email = :e"), {"e": e})
    assert sign_in(e)["is_new"] is False


def test_wrong_code_refused_and_counted():
    e = fresh_email()
    sent = client.post("/v1/auth/request-code", json={"email": e}).json()
    wrong = "000000" if sent["dev_code"] != "000000" else "111111"
    r = client.post("/v1/auth/verify-code", json={"email": e, "code": wrong})
    assert r.status_code == 400 and r.json()["detail"]["code"] == "code_invalid"
    assert client.post("/v1/auth/verify-code", json={"email": e, "code": sent["dev_code"]}).status_code == 200  # the right one still works


def test_code_is_single_use():
    e = fresh_email()
    sent = client.post("/v1/auth/request-code", json={"email": e}).json()
    assert client.post("/v1/auth/verify-code", json={"email": e, "code": sent["dev_code"]}).status_code == 200
    again = client.post("/v1/auth/verify-code", json={"email": e, "code": sent["dev_code"]})
    assert again.status_code == 400


def test_five_wrong_attempts_lock_the_code():
    e = fresh_email()
    sent = client.post("/v1/auth/request-code", json={"email": e}).json()
    wrong = "000000" if sent["dev_code"] != "000000" else "111111"
    for _ in range(5):
        client.post("/v1/auth/verify-code", json={"email": e, "code": wrong})
    r = client.post("/v1/auth/verify-code", json={"email": e, "code": sent["dev_code"]})
    assert r.status_code == 429 and r.json()["detail"]["code"] == "too_many_attempts"


def test_codes_are_rate_limited():
    e = fresh_email()
    assert client.post("/v1/auth/request-code", json={"email": e}).status_code == 200
    r = client.post("/v1/auth/request-code", json={"email": e})
    assert r.status_code == 429 and r.json()["detail"]["code"] == "rate_limited" and r.json()["detail"]["retry_after"] > 0


def test_the_code_is_not_stored_in_clear():
    e = fresh_email()
    sent = client.post("/v1/auth/request-code", json={"email": e}).json()
    with engine().connect() as conn:
        stored = conn.execute(text("select code_hash from login_codes where email = :e"), {"e": e}).scalar_one()
    assert sent["dev_code"] not in stored and len(stored) == 64


def test_profile_update_and_validation():
    s = sign_in(fresh_email())
    ok = client.patch("/v1/me", headers=auth(s), json={"display_name": "  Mdm Test  ", "language": "ta", "age_band": "60plus", "phone": "+65 9123 4567", "area_name": "Test Estate"})
    assert ok.status_code == 200
    me = ok.json()
    assert me["display_name"] == "Mdm Test" and me["language"] == "ta" and me["age_band"] == "60plus" and me["profile_complete"] is True
    assert client.patch("/v1/me", headers=auth(s), json={"language": "xx"}).status_code == 422
    assert client.patch("/v1/me", headers=auth(s), json={"display_name": "   "}).status_code == 422
    assert client.patch("/v1/me", headers=auth(s), json={"phone": "abc"}).status_code == 422
    cleared = client.patch("/v1/me", headers=auth(s), json={"phone": None}).json()
    assert cleared["phone"] is None and cleared["display_name"] == "Mdm Test"  # only what is sent changes


def test_profile_needs_sign_in():
    assert client.get("/v1/me").status_code == 401
    assert client.get("/v1/me", headers={"Authorization": "Bearer nonsense"}).status_code == 401
    assert client.patch("/v1/me", json={"language": "hi"}).status_code == 401


def test_refresh_rotates_and_sign_out_revokes():
    s = sign_in(fresh_email())
    r = client.post("/v1/auth/refresh", json={"refresh_token": s["refresh_token"]})
    assert r.status_code == 200
    new = r.json()
    assert new["refresh_token"] != s["refresh_token"]
    assert client.post("/v1/auth/refresh", json={"refresh_token": s["refresh_token"]}).status_code == 401  # the old one is dead
    assert client.post("/v1/auth/sign-out", json={"refresh_token": new["refresh_token"]}).status_code == 204
    assert client.post("/v1/auth/refresh", json={"refresh_token": new["refresh_token"]}).status_code == 401


def test_bad_email_refused():
    assert client.post("/v1/auth/request-code", json={"email": "not-an-email"}).status_code == 422



def test_providers_lists_what_is_on():
    r = client.get("/v1/auth/providers").json()
    assert r["email"] is True and set(r) == {"email", "google", "singpass", "digilocker"}


def test_google_rejects_a_bad_token():
    r = client.post("/v1/auth/google", json={"id_token": "x" * 40})
    assert r.status_code in (401, 503) and r.json()["detail"]["code"] in ("token_invalid", "provider_off", "provider_unavailable")


def test_google_creates_then_reuses_the_person(monkeypatch):
    from app.modules.identity import service

    email = fresh_email()
    monkeypatch.setattr(service, "verify_google_token", lambda t: {"email": email, "name": "Test Person", "email_verified": True})
    first = client.post("/v1/auth/google", json={"id_token": "x" * 40}).json()
    assert first["is_new"] is True and first["user"]["display_name"] == "Test Person" and first["user"]["profile_complete"] is True
    second = client.post("/v1/auth/google", json={"id_token": "x" * 40}).json()
    assert second["is_new"] is False and second["user"]["id"] == first["user"]["id"]


# ---- stateless access tokens ----
def test_token_carries_fixed_claims_and_lasts_15_minutes():
    import base64, json
    t = sign_in(fresh_email())["access_token"]
    c = json.loads(base64.urlsafe_b64decode(t.split(".")[1] + "=="))
    assert c["t"] == "a" and c["iss"] == "bricks" and c["aud"] == "bricks" and c["s"] and c["exp"] - c["iat"] == 15 * 60


def test_forged_or_wrong_type_tokens_are_refused():
    from app.core import security
    t = sign_in(fresh_email())["access_token"]
    h, p, s = t.split(".")
    assert security.read_claims(f"{h}.{p}.{s[:-2]}xx") is None  # signature damaged
    assert security.read_claims(t, ("g",)) is None  # an access token is not an agent token
    none_alg = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').rstrip(b"=").decode()
    assert security.read_claims(f"{none_alg}.{p}.") is None


def test_sign_out_ends_the_session_at_once():
    s = sign_in(fresh_email())
    assert client.get("/v1/me", headers=auth(s)).status_code == 200
    client.post("/v1/auth/sign-out", json={"refresh_token": s["refresh_token"]})
    r = client.get("/v1/me", headers=auth(s))  # the access token is still unexpired, but its session is over
    assert r.status_code == 401 and r.json()["detail"]["code"] == "unauthorized"
    assert client.post("/v1/auth/refresh", json={"refresh_token": s["refresh_token"]}).status_code == 401


def test_refresh_keeps_the_session_id():
    import base64, json
    s = sign_in(fresh_email())
    n = client.post("/v1/auth/refresh", json={"refresh_token": s["refresh_token"]}).json()
    sid = lambda tok: json.loads(base64.urlsafe_b64decode(tok.split(".")[1] + "=="))["s"]
    assert sid(s["access_token"]) == sid(n["access_token"])


def test_a_change_makes_older_tokens_refresh():
    from app.core import auth_state
    from app.modules.identity import service
    s = sign_in(fresh_email())
    uid = s["user"]["id"]
    with engine().begin() as conn:
        conn.execute(text("update users set auth_changed_at = now() + interval '1 hour' where id = :u"), {"u": uid})
    auth_state.forget(uid)
    r = client.get("/v1/me", headers=auth(s))
    assert r.status_code == 401 and r.json()["detail"]["code"] == "token_expired"  # the app refreshes once and retries


def test_test_mode_code_is_hidden_from_public_tunnels():
    e = fresh_email()
    here = client.post("/v1/auth/request-code", json={"email": e}, headers={"host": "localhost:8800"}).json()
    assert here["dev_code"]
    e2 = fresh_email()
    public = client.post("/v1/auth/request-code", json={"email": e2}, headers={"host": "x.ngrok-free.dev", "x-forwarded-for": "203.0.113.9"}).json()
    assert public["sent"] and public["dev_code"] is None
