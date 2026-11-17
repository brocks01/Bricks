"""GET /v1/me says how the person signed in (revamp v2, A3: the profile card's "Signed in with ..." line). Against the real local database."""
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
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def me(tokens: dict) -> dict:
    r = client.get("/v1/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert r.status_code == 200, r.text
    return r.json()


def test_email_code_says_email_and_a_refresh_keeps_it():
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    t = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    assert me(t)["signed_in_with"] == "email"
    again = client.post("/v1/auth/refresh", json={"refresh_token": t["refresh_token"]})
    assert again.status_code == 200, again.text
    assert me(again.json())["signed_in_with"] == "email"


def test_demo_account_says_demo():
    t = client.post("/v1/auth/demo", json={}).json()
    EMAILS.append(t["user"]["email"])
    assert me(t)["signed_in_with"] == "demo"


def test_mock_singpass_says_singpass():
    t = client.post("/v1/auth/singpass-demo", json={}).json()
    assert me(t)["signed_in_with"] == "singpass"
    assert t["user"]["display_name"]  # Uncle Tan, already set up
