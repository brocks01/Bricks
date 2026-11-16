"""Wisdom: stories kept in a person's own words (private until shared), offers to teach, requests to learn, and introductions that the OTHER side decides."""
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


def person(name: str, band: str = "40to59") -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    h = {"Authorization": f"Bearer {s['access_token']}"}
    client.patch("/v1/me", json={"display_name": name, "age_band": band}, headers=h)
    return {"h": h, "id": s["user"]["id"]}


def skill(p, name, /, **args):
    return client.post(f"/v1/skills/{name}", json={"args": args}, headers=p["h"]).json()


STORY = "In 1987 our ship lost its engine in a storm off Sri Lanka. I was the second engineer and I kept calm by checking the simple things first: fuel, then air, then the filters."


def test_a_story_is_private_until_the_author_clearly_shares_it_and_only_the_first_name_shows():
    senior, young = person("Rajan Pillai"), person("Aarav Nair")
    kept = skill(senior, "capture_wisdom", title="The engine that stopped in a storm", story=STORY, kind="professional", tags="engineering, calm", source="call")
    assert kept["status"] == "draft"
    assert skill(young, "browse_wisdom", search="engine")["stories"] == []  # private: nobody else sees it
    assert skill(senior, "share_wisdom", title="engine")["error"] == "needs_confirmation"
    assert skill(senior, "share_wisdom", title="engine", confirmed=True)["shared"] == "The engine that stopped in a storm"
    seen = skill(young, "browse_wisdom", search="engine")["stories"]
    assert len(seen) == 1 and seen[0]["by"] == "Rajan" and "Pillai" not in str(seen) and seen[0]["kind"] == "professional"
    lib = client.get("/v1/wisdom/capsules", params={"q": "calm"}, headers=young["h"]).json()["capsules"]
    assert len(lib) == 1 and lib[0]["mine"] is False
    assert skill(senior, "unshare_wisdom", title="engine")["private_again"]
    assert skill(young, "browse_wisdom", search="engine")["stories"] == []


def test_capturing_adds_the_share_role_and_bad_input_is_refused():
    senior = person("Meena Iyer")
    assert skill(senior, "capture_wisdom", title="x", story="too short")["error"] in ("bad_title", "bad_body")
    skill(senior, "capture_wisdom", title="My mother's rasam", story="My mother always started with tamarind water, then crushed pepper and cumin by hand, never in a machine.", kind="cultural")
    p = client.get("/v1/profile", headers=senior["h"]).json()
    assert "share" in p["roles"] and "wisdom_share" in p["surfaces"]
    mine = client.get("/v1/wisdom/capsules/mine", headers=senior["h"]).json()["capsules"]
    assert len(mine) == 1 and mine[0]["status"] == "draft"
    r = client.post("/v1/wisdom/capsules", json={"title": "", "body": "long enough body text here"}, headers=senior["h"])
    assert r.status_code == 422


def test_a_learner_asks_an_offering_mentor_and_only_the_mentor_can_say_yes():
    mentor, learner = person("Kavita Rao"), person("Zara Khan")
    assert client.post("/v1/wisdom/offers", json={"title": "Teach small business accounting", "kind": "freelance", "mode": "paid", "availability": "weekday evenings"}, headers=mentor["h"]).status_code == 201
    free = client.post("/v1/wisdom/offers", json={"title": "Chat about career choices", "kind": "mentoring"}, headers=mentor["h"]).json()["id"]
    paid = client.get("/v1/wisdom/offers", params={"kind": "freelance"}, headers=learner["h"]).json()["offers"]
    assert [o["title"] for o in paid] == ["Teach small business accounting"] and paid[0]["by"] == "Kavita"
    assert client.get("/v1/wisdom/offers", params={"mode": "volunteer"}, headers=learner["h"]).json()["offers"][0]["title"] == "Chat about career choices"
    assert client.get("/v1/wisdom/offers", headers=mentor["h"]).json()["offers"] == []  # your own offers are not in your own search
    asked = client.post(f"/v1/wisdom/offers/{free}/ask", json={"message": "I am starting my first job"}, headers=learner["h"])
    assert asked.status_code == 201
    cid = asked.json()["id"]
    assert client.post(f"/v1/wisdom/offers/{free}/ask", json={}, headers=learner["h"]).status_code == 409  # not twice
    assert client.post(f"/v1/wisdom/connections/{cid}/decide", json={"accept": True}, headers=learner["h"]).status_code == 403  # nobody accepts their own request
    waiting = client.get("/v1/wisdom/connections", headers=mentor["h"]).json()["connections"]
    assert waiting[0]["waiting_for_me"] is True and waiting[0]["with"] == "Zara" and waiting[0]["message"] == "I am starting my first job"
    assert client.post(f"/v1/wisdom/connections/{cid}/decide", json={"accept": True}, headers=mentor["h"]).json()["status"] == "accepted"
    assert client.get("/v1/wisdom/connections", headers=learner["h"]).json()["connections"][0]["status"] == "accepted"
    assert "learn" in client.get("/v1/profile", headers=learner["h"]).json()["roles"]


def test_a_mentor_answers_a_request_and_the_learner_decides_and_a_paused_offer_disappears():
    mentor, learner = person("Hari Menon"), person("Dev Patel")
    client.post("/v1/wisdom/requests", json={"topic": "How to start a small food business", "about": "Home baking"}, headers=learner["h"])
    open_ = client.get("/v1/wisdom/requests", params={"q": "food"}, headers=mentor["h"]).json()["requests"]
    assert open_[0]["by"] == "Dev" and client.get("/v1/wisdom/requests", headers=learner["h"]).json()["requests"] == []
    cid = client.post(f"/v1/wisdom/requests/{open_[0]['id']}/answer", json={"message": "I ran a bakery for 30 years"}, headers=mentor["h"]).json()["id"]
    assert client.post(f"/v1/wisdom/connections/{cid}/decide", json={"accept": False}, headers=mentor["h"]).status_code == 403
    assert client.post(f"/v1/wisdom/connections/{cid}/decide", json={"accept": False}, headers=learner["h"]).json()["status"] == "declined"
    assert client.post(f"/v1/wisdom/connections/{cid}/decide", json={"accept": True}, headers=learner["h"]).status_code == 404  # already answered
    oid = client.post("/v1/wisdom/offers", json={"title": "Bread making"}, headers=mentor["h"]).json()["id"]
    assert len(client.get("/v1/wisdom/offers", params={"q": "bread"}, headers=learner["h"]).json()["offers"]) == 1
    client.patch(f"/v1/wisdom/offers/{oid}", json={"status": "paused"}, headers=mentor["h"])
    assert client.get("/v1/wisdom/offers", params={"q": "bread"}, headers=learner["h"]).json()["offers"] == []
    assert client.post(f"/v1/wisdom/offers/{oid}/ask", json={}, headers=learner["h"]).status_code == 404


def test_the_whole_exchange_works_by_voice_skills_with_a_yes_before_anything_is_sent():
    mentor, learner = person("Lakshmi Nair"), person("Ben Tan")
    assert skill(mentor, "offer_to_teach", title="Teach Tamil cooking", kind="workshop", mode="either", availability="Saturdays")["offered"] == "Teach Tamil cooking"
    skill(learner, "ask_to_learn", topic="Cooking my grandmother's recipes")
    found = skill(learner, "find_a_mentor", search="cooking")["offers"]
    assert found[0]["title"] == "Teach Tamil cooking" and found[0]["by"] == "Lakshmi" and found[0]["mode"] == "either"
    assert skill(learner, "ask_for_guidance", offer="tamil cooking")["error"] == "needs_confirmation"
    sent = skill(learner, "ask_for_guidance", offer="tamil cooking", message="Could you teach me on a Saturday?", confirmed=True)
    assert sent["asked"] == "Lakshmi" and sent["status"] == "waiting for their answer"
    mine = skill(mentor, "my_wisdom")
    assert mine["waiting_for_my_answer"][0]["from"] == "Ben" and mine["offering"][0]["title"] == "Teach Tamil cooking"
    assert skill(mentor, "my_introductions")["introductions"][0]["waiting_for_me"] is True
    assert skill(mentor, "reply_to_introduction", who="ben", accept=True)["error"] == "needs_confirmation"
    assert skill(mentor, "reply_to_introduction", who="ben", accept=True, confirmed=True)["status"] == "accepted"
    assert skill(learner, "my_introductions")["introductions"][0]["status"] == "accepted"
    assert skill(mentor, "who_wants_to_learn", search="grandmother")["requests"][0]["by"] == "Ben"
    assert skill(mentor, "pause_offer", title="tamil cooking")["stopped"] == "Teach Tamil cooking"
    assert skill(learner, "find_a_mentor", search="cooking")["offers"] == []


def test_a_young_learner_must_say_they_are_15_or_older_before_asking_anyone():
    mentor, kid = person("Hari Menon"), person("Tia Lim", band="under40")
    oid = client.post("/v1/wisdom/offers", json={"title": "Carpentry basics for teenagers"}, headers=mentor["h"]).json()["id"]
    r = client.post(f"/v1/wisdom/offers/{oid}/ask", json={}, headers=kid["h"])
    assert r.status_code == 403 and r.json()["detail"]["code"] == "confirm_age_15"
    assert skill(kid, "ask_to_learn", topic="woodwork")["error"] == "confirm_age_15"
    assert skill(kid, "save_answer", section="learn", field="age_15_plus", value="yes")["saved"] == "age_15_plus"
    assert client.post(f"/v1/wisdom/offers/{oid}/ask", json={}, headers=kid["h"]).status_code == 201


def test_sessions_add_up_to_calls_and_people_helped_this_month():
    mentor, learner = person("Kavita Rao"), person("Zara Khan")
    oid = client.post("/v1/wisdom/offers", json={"title": "Interview practice"}, headers=mentor["h"]).json()["id"]
    cid = client.post(f"/v1/wisdom/offers/{oid}/ask", json={}, headers=learner["h"]).json()["id"]
    assert client.post(f"/v1/wisdom/connections/{cid}/sessions", json={"minutes": 30}, headers=mentor["h"]).status_code == 404  # not accepted yet
    client.post(f"/v1/wisdom/connections/{cid}/decide", json={"accept": True}, headers=mentor["h"])
    assert client.post(f"/v1/wisdom/connections/{cid}/sessions", json={"minutes": 0}, headers=mentor["h"]).status_code == 422
    assert client.post(f"/v1/wisdom/connections/{cid}/sessions", json={"minutes": 30}, headers=mentor["h"]).status_code == 201
    assert skill(learner, "log_wisdom_session", who="kavita", minutes="20")["noted"] == "Kavita"
    assert client.get("/v1/wisdom/stats", headers=mentor["h"]).json() == {"calls": 2, "minutes": 50, "people_helped": 1, "mentors_learned_from": 0}
    assert client.get("/v1/wisdom/stats", headers=learner["h"]).json()["mentors_learned_from"] == 1
    assert skill(mentor, "my_wisdom")["this_month"]["calls"] == 2
