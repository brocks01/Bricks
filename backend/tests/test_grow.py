"""Grow tests, against the real local database (own throw-away users and communities, removed afterwards)."""
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
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person() -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    return {"Authorization": f"Bearer {s['access_token']}"}


def test_needs_sign_in():
    assert client.get("/v1/grow/progress").status_code in (401, 403)


def test_aspirations_add_complete_delete_and_privacy():
    a, b = person(), person()
    r = client.post("/v1/grow/aspirations", json={"title": "Visit Kolkata again", "category": "travel"}, headers=a)
    assert r.status_code == 200 and r.json()["done"] is False
    aid = r.json()["id"]
    assert client.post("/v1/grow/aspirations", json={"title": "x"}, headers=a).status_code == 422
    assert client.post("/v1/grow/aspirations", json={"title": "Fine", "category": "nope"}, headers=a).status_code == 422
    assert client.post(f"/v1/grow/aspirations/{aid}/done", json={"done": True}, headers=a).json()["done"] is True
    assert [x["done"] for x in client.get("/v1/grow/aspirations", headers=a).json()["aspirations"]] == [True]
    assert client.get("/v1/grow/aspirations", headers=b).json()["aspirations"] == []  # private
    assert client.post(f"/v1/grow/aspirations/{aid}/done", json={"done": False}, headers=b).status_code == 404
    assert client.delete(f"/v1/grow/aspirations/{aid}", headers=b).status_code == 404
    assert client.delete(f"/v1/grow/aspirations/{aid}", headers=a).json() == {"deleted": True}
    assert client.delete("/v1/grow/aspirations/not-an-id", headers=a).status_code == 404


def test_health_readings():
    h = person()
    assert client.get("/v1/grow/health", headers=h).json()["latest"]["heart_rate"] is None
    assert client.post("/v1/grow/health/readings", json={"kind": "heart_rate", "value": 72}, headers=h).status_code == 200
    assert client.post("/v1/grow/health/readings", json={"kind": "blood_pressure", "value": 118}, headers=h).status_code == 400  # needs both numbers
    assert client.post("/v1/grow/health/readings", json={"kind": "blood_pressure", "value": 118, "value2": 76}, headers=h).status_code == 200
    assert client.post("/v1/grow/health/readings", json={"kind": "pulse", "value": 70}, headers=h).status_code == 422
    assert client.post("/v1/grow/health/readings", json={"kind": "weight_kg", "value": -3}, headers=h).status_code == 422
    d = client.get("/v1/grow/health", headers=h).json()
    assert float(d["latest"]["heart_rate"]["value"]) == 72 and float(d["latest"]["blood_pressure"]["value2"]) == 76 and len(d["recent"]) == 2
    rid = d["recent"][0]["id"]
    assert client.delete(f"/v1/grow/health/readings/{rid}", headers=h).json() == {"deleted": True}
    assert len(client.get("/v1/grow/health", headers=h).json()["recent"]) == 1


def test_activity_week_and_streak():
    h = person()
    assert client.get("/v1/grow/activity", headers=h).json()["streak"] == 0
    for days_ago, minutes in ((0, 30), (1, 20), (2, 45)):
        from datetime import date, timedelta
        on = (date.today() - timedelta(days=days_ago)).isoformat()
        assert client.post("/v1/grow/activity", json={"kind": "walk", "minutes": minutes, "on": on}, headers=h).status_code == 200
    a = client.get("/v1/grow/activity", headers=h).json()
    assert a["week_minutes"] == 95 and a["streak"] == 3 and len(a["days"]) == 7 and a["days"][-1]["minutes"] == 30
    assert client.post("/v1/grow/activity", json={"kind": "walk", "minutes": 10, "on": "2999-01-01"}, headers=h).status_code == 400
    assert client.post("/v1/grow/activity", json={"kind": "walk", "minutes": 0}, headers=h).status_code == 422
    assert client.delete(f"/v1/grow/activity/{a['recent'][0]['id']}", headers=h).json() == {"deleted": True}


def test_contributions_need_membership_and_show_in_progress():
    h, other = person(), person()
    cid = client.post("/v1/communities", json={"name": "Grow Test Heights"}, headers=h).json()["id"]
    assert client.get("/v1/grow/contributions", headers=h).json()["my_communities"][0]["id"] == cid
    r = client.post("/v1/grow/contributions", json={"community_id": cid, "kind": "time", "description": "Helped set up chairs", "hours": 2.5}, headers=h)
    assert r.status_code == 200 and r.json()["hours"] == 2.5
    assert client.post("/v1/grow/contributions", json={"community_id": cid, "description": "Not a member"}, headers=other).status_code == 403
    assert client.post("/v1/grow/contributions", json={"community_id": "bad", "description": "Bad id"}, headers=h).status_code == 404
    c = client.get("/v1/grow/contributions", headers=h).json()
    assert c["count"] == 1 and c["hours"] == 2.5 and c["recent"][0]["community_name"] == "Grow Test Heights"
    assert client.get("/v1/grow/contributions", headers=other).json()["count"] == 0
    p = client.get("/v1/grow/progress", headers=h).json()
    assert p["contributions"] == {"count": 1, "hours": 2.5} and set(p) == {"activity", "health", "aspirations", "explore", "contributions"}
