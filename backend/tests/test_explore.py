"""Explore tests, against the real local database (own throw-away users, removed afterwards). Uses the seeded library (python backend/run.py seed-explore)."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.seed_explore import ITEMS, main as seed

client = TestClient(app)
EMAILS: list[str] = []


@pytest.fixture(scope="module", autouse=True)
def library():
    seed([])  # idempotent
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person() -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    return {"Authorization": f"Bearer {s['access_token']}"}


def test_needs_sign_in():
    assert client.get("/v1/explore/home").status_code in (401, 403)


def test_library_has_six_categories_with_five_or_more_items_each():
    h = person()
    cats = client.get("/v1/explore/categories", headers=h).json()["categories"]
    assert [c["id"] for c in cats] == ["digital_skills", "health_awareness", "everyday_life", "hobbies", "culture", "knowledge"]
    assert all(c["items"] >= 5 for c in cats)
    assert len({i[3] for i in ITEMS}) == len(ITEMS)  # no duplicate titles


def test_category_search_and_detail():
    h = person()
    items = client.get("/v1/explore/items", params={"category": "hobbies"}, headers=h).json()["items"]
    assert items and all(i["category_id"] == "hobbies" for i in items)
    found = client.get("/v1/explore/items", params={"q": "UPI"}, headers=h).json()["items"]
    assert any("UPI" in i["title"] for i in found)
    one = client.get(f"/v1/explore/items/{items[0]['id']}", headers=h).json()
    assert one["steps"] and one["body"] and one["saved"] is False and one["percent"] == 0
    assert client.get("/v1/explore/items", params={"category": "nope"}, headers=h).status_code == 404
    assert client.get("/v1/explore/items/not-an-id", headers=h).status_code == 404
    assert client.get(f"/v1/explore/items/{uuid.uuid4()}", headers=h).status_code == 404


def test_unreviewed_items_are_hidden():
    h = person()
    with engine().begin() as conn:
        iid = conn.execute(text("insert into explore_items (category_id, format, title, summary, source, is_demo) values ('hobbies', 'guide', 'Hidden draft', 'x', 's', true) returning id")).scalar_one()
    try:
        assert client.get(f"/v1/explore/items/{iid}", headers=h).status_code == 404
        assert all(i["title"] != "Hidden draft" for i in client.get("/v1/explore/items", headers=h).json()["items"])
    finally:
        with engine().begin() as conn:
            conn.execute(text("delete from explore_items where id = :i"), {"i": iid})


def test_save_progress_and_my_exploration():
    h = person()
    iid = client.get("/v1/explore/items", params={"category": "digital_skills"}, headers=h).json()["items"][0]["id"]
    assert client.post(f"/v1/explore/items/{iid}/save", json={"saved": True}, headers=h).json() == {"saved": True}
    assert client.post(f"/v1/explore/items/{iid}/progress", json={"percent": 40}, headers=h).json() == {"percent": 40, "completed": False}
    m = client.get("/v1/explore/mine", headers=h).json()
    assert [i["id"] for i in m["in_progress"]] == [iid] and [i["id"] for i in m["saved"]] == [iid] and m["completed"] == []
    # progress never goes backwards, and 100 completes
    assert client.post(f"/v1/explore/items/{iid}/progress", json={"percent": 10}, headers=h).json()["percent"] == 40
    assert client.post(f"/v1/explore/items/{iid}/progress", json={"percent": 100}, headers=h).json() == {"percent": 100, "completed": True}
    m = client.get("/v1/explore/mine", headers=h).json()
    assert m["in_progress"] == [] and [i["id"] for i in m["completed"]] == [iid]
    assert m["milestones"] == {"explored": 1, "completed": 1, "interests": 0}
    assert client.post(f"/v1/explore/items/{iid}/save", json={"saved": False}, headers=h).json() == {"saved": False}
    assert client.get("/v1/explore/mine", headers=h).json()["saved"] == []
    assert client.post(f"/v1/explore/items/{iid}/progress", json={"percent": 101}, headers=h).status_code == 422


def test_each_person_only_sees_their_own_state():
    a, b = person(), person()
    iid = client.get("/v1/explore/items", headers=a).json()["items"][0]["id"]
    client.post(f"/v1/explore/items/{iid}/save", json={"saved": True}, headers=a)
    assert client.get("/v1/explore/mine", headers=b).json()["saved"] == []


def test_interests_steer_the_picked_list():
    h = person()
    assert client.get("/v1/explore/home", headers=h).json()["has_interests"] is False
    r = client.put("/v1/explore/interests", json={"categories": ["hobbies", "culture", "bogus", "hobbies"]}, headers=h).json()
    assert r["categories"] == ["culture", "hobbies"]
    home = client.get("/v1/explore/home", headers=h).json()
    assert home["has_interests"] is True and home["picked"] and {i["category_id"] for i in home["picked"]} <= {"hobbies", "culture"}
    assert [c["id"] for c in home["categories"] if c["chosen"]] == ["hobbies", "culture"]
