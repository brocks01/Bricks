"""The presentation's demo (A3 follow-up): "Demo: skip onboarding" signs in Mr Lim, already set up with his story; and recommendations follow the
interests a person chose (only the ones that share an interest, unless they search). Against the real local database."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app

client = TestClient(app)
EMAILS: list[str] = []
KEYS = {"walking", "taichi", "cooking", "chess", "music", "gardening", "teaching", "tech"}


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})


def h(t: dict) -> dict:
    return {"Authorization": f"Bearer {t['access_token']}"}


def lim() -> dict:
    r = client.post("/v1/auth/lim-demo", json={})
    assert r.status_code == 200, r.text
    return r.json()


def person_who_enjoys(*keys: str) -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    t = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    client.patch("/v1/me", json={"display_name": "Test Person", "area_name": "Tampines"}, headers=h(t))
    assert client.put("/v1/onboarding/interests", json={"answers": {"interests": list(keys)}}, headers=h(t)).status_code == 200
    return t


def test_skip_onboarding_signs_in_mr_lim_already_set_up_with_his_story():
    t = lim()
    me = client.get("/v1/me", headers=h(t)).json()
    assert me["display_name"] == "Lim Teck Seng" and me["area_name"] == "Tampines" and me["age_band"] == "60plus" and me["signed_in_with"] == "demo"
    assert set(me["interests"]) == {"walking", "chess", "teaching", "tech"}
    assert client.get("/v1/profile", headers=h(t)).json()["onboarded"] is True
    mine = client.get("/v1/communities/cards/mine", headers=h(t)).json()
    names = {c["name"] for c in (mine.get("communities") if isinstance(mine, dict) else mine)}
    assert names == {"Tampines Money Sense Circle", "Tampines Xiangqi and Chess Club", "Tampines Eco Green Walkers"}
    assert client.get("/v1/wisdom/teaching-profile", headers=h(t)).json()["expertise"].startswith("Budgeting")
    home = client.get("/v1/home/upcoming", headers=h(t)).json()["events"]
    assert {e["source"] for e in home} >= {"community", "market", "wisdom"}
    assert client.get("/v1/nodes/wisdom?limit=50", headers=h(t)).json()["leaves"] >= 8
    # signing in again adds nothing twice
    lim()
    with engine().connect() as conn:
        assert conn.execute(text("select count(*) from communities where slug = 'tampines-money-sense-circle-demo'")).scalar() == 1


@pytest.mark.parametrize("key", sorted(KEYS))
def test_every_interest_has_something_to_recommend_and_only_that(key):
    lim()  # the demo data exists
    t = person_who_enjoys(key)
    comms = client.get("/v1/communities/recommended", headers=h(t)).json()["communities"]
    events = client.get("/v1/market/events/recommended", headers=h(t)).json()["events"]
    offers = client.get(f"/v1/wisdom/offers?topic={key}", headers=h(t)).json()["offers"]
    assert comms and all(key in c["interests"] for c in comms), key
    assert events and all(key in e["interests"] for e in events), key
    assert offers, key


def test_a_search_still_looks_at_everything():
    t = person_who_enjoys("chess")
    found = client.get("/v1/communities/recommended?q=tampines", headers=h(t)).json()["communities"]
    assert any("chess" not in c["interests"] for c in found)
    events = client.get("/v1/market/events/recommended?q=tampines", headers=h(t)).json()["events"]
    assert any("chess" not in e["interests"] for e in events)
