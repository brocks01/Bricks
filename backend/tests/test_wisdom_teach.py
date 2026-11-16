"""Wisdom, Teach: the teaching profile, invitations from one person or a group, sessions (reschedule, complete), reviews, and the sessions Home shows."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.wisdom import service as wisdom

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


def offer(p, title="AI and operating systems", **extra) -> str:
    r = client.post("/v1/wisdom/offers", json={"title": title, "kind": "mentoring", "mode": "volunteer", **extra}, headers=p["h"])
    assert r.status_code == 201, r.text
    return r.json()["id"]


def ask(p, offer_id, **body) -> str:
    r = client.post(f"/v1/wisdom/offers/{offer_id}/ask", json=body, headers=p["h"])
    assert r.status_code == 201, r.text
    return r.json()["id"]


def conns(p):
    return client.get("/v1/wisdom/connections", headers=p["h"]).json()["connections"]


def pair():
    """An elder, a learner, and an accepted introduction between them."""
    elder, learner = person("Tan Boon Huat", "60plus"), person("Sarath Kumar")
    cid = ask(learner, offer(elder), topic="AI, OS")
    assert client.post(f"/v1/wisdom/connections/{cid}/decide", json={"accept": True}, headers=elder["h"]).status_code == 200
    return elder, learner, cid


def later(days=2) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).replace(microsecond=0).isoformat()


def plan(p, cid, title="AI & OS Mentoring", days=2):
    r = client.post(f"/v1/wisdom/connections/{cid}/schedule", json={"title": title, "starts_at": later(days), "place": "Tampines Hub"}, headers=p["h"])
    assert r.status_code == 201, r.text
    return r.json()


def leaves(user_id: str) -> int:
    with engine().begin() as conn:
        return conn.execute(text("select count(*) from wisdom_leaves where user_id = :u and source = 'wisdom'"), {"u": user_id}).scalar()


def test_the_teaching_profile_saves_and_refuses_bad_times():
    elder = person("Tan Boon Huat", "60plus")
    assert client.get("/v1/wisdom/teaching-profile", headers=elder["h"]).json()["saved"] is False
    r = client.patch("/v1/wisdom/teaching-profile", json={"expertise": "AI, OS, Business", "bio": "Forty years in tech sales.", "days": "Mon-Fri", "start_time": "9:00", "end_time": "17:00"}, headers=elder["h"])
    assert r.status_code == 200 and r.json() == {"expertise": "AI, OS, Business", "bio": "Forty years in tech sales.", "days": "Mon-Fri", "start_time": "09:00", "end_time": "17:00", "saved": True}
    # a field left out keeps its value
    assert client.patch("/v1/wisdom/teaching-profile", json={"bio": "Retired."}, headers=elder["h"]).json()["expertise"] == "AI, OS, Business"
    assert client.patch("/v1/wisdom/teaching-profile", json={"start_time": "18:00"}, headers=elder["h"]).json()["detail"]["code"] == "bad_end_time"
    assert client.patch("/v1/wisdom/teaching-profile", json={"end_time": "25:00"}, headers=elder["h"]).status_code == 422


def test_only_the_elder_decides_an_invitation_and_a_group_shows_its_count():
    elder, learner = person("Tan Boon Huat", "60plus"), person("Wei Ling Ong")
    cid = ask(learner, offer(elder, "Business strategy"), group_name="SMU Students", learner_count=31, topic="Business")
    mine = next(c for c in conns(elder) if c["id"] == cid)
    assert mine["waiting_for_me"] and mine["group_name"] == "SMU Students" and mine["learner_count"] == 31 and mine["topic"] == "Business"
    assert client.post(f"/v1/wisdom/connections/{cid}/decide", json={"accept": True}, headers=learner["h"]).status_code == 403
    assert client.post(f"/v1/wisdom/connections/{cid}/decide", json={"accept": False}, headers=elder["h"]).json()["status"] == "declined"
    # a group must say how many, and a count needs a name
    o = offer(elder, "Operating systems")
    assert client.post(f"/v1/wisdom/offers/{o}/ask", json={"group_name": "SMU Students"}, headers=learner["h"]).status_code == 422
    assert client.post(f"/v1/wisdom/offers/{o}/ask", json={"learner_count": 31}, headers=learner["h"]).status_code == 422


def test_reschedule_tells_both_people(monkeypatch):
    told: list[str] = []
    monkeypatch.setattr(wisdom, "_tell", lambda user_id, line: told.append(user_id))
    from app.modules.wisdom import teach
    monkeypatch.setattr(teach, "_tell", lambda user_id, line: told.append(user_id))
    elder, learner, cid = pair()
    s = plan(elder, cid)
    told.clear()
    r = client.post(f"/v1/wisdom/sessions/{s['id']}/reschedule", json={"starts_at": later(5)}, headers=learner["h"])
    assert r.status_code == 200 and r.json()["starts_at"] != s["starts_at"]
    assert sorted(told) == sorted([elder["id"], learner["id"]])
    assert client.post(f"/v1/wisdom/sessions/{s['id']}/reschedule", json={"starts_at": "next tuesday"}, headers=elder["h"]).status_code == 422


def test_complete_gives_each_person_one_leaf_once():
    elder, learner, cid = pair()
    s = plan(elder, cid)
    assert leaves(elder["id"]) == leaves(learner["id"]) == 0
    assert client.post(f"/v1/wisdom/sessions/{s['id']}/complete", headers=learner["h"]).json()["status"] == "completed"
    assert client.post(f"/v1/wisdom/sessions/{s['id']}/complete", headers=elder["h"]).json()["status"] == "completed"
    assert leaves(elder["id"]) == leaves(learner["id"]) == 1
    assert client.post(f"/v1/wisdom/sessions/{s['id']}/reschedule", json={"starts_at": later(3)}, headers=elder["h"]).status_code == 409
    tree = client.get("/v1/nodes/wisdom", headers=learner["h"]).json()
    assert tree["leaves"] == 1 and tree["events"][0]["source_name"] == "Tan"
    # the session counts as a call this month, once
    assert client.get("/v1/wisdom/stats", headers=elder["h"]).json()["calls"] == 1


def test_only_the_learner_reviews_once_from_1_to_5():
    elder, learner, cid = pair()
    s = plan(elder, cid)
    assert client.post(f"/v1/wisdom/sessions/{s['id']}/review", json={"score": 5}, headers=learner["h"]).json()["detail"]["code"] == "not_completed"
    client.post(f"/v1/wisdom/sessions/{s['id']}/complete", headers=elder["h"])
    assert client.post(f"/v1/wisdom/sessions/{s['id']}/review", json={"score": 5}, headers=elder["h"]).status_code == 403
    for bad in (0, 6):
        assert client.post(f"/v1/wisdom/sessions/{s['id']}/review", json={"score": bad}, headers=learner["h"]).status_code == 422
    assert client.post(f"/v1/wisdom/sessions/{s['id']}/review", json={"score": 4, "note": "x" * 501}, headers=learner["h"]).status_code == 422
    r = client.post(f"/v1/wisdom/sessions/{s['id']}/review", json={"score": 4, "note": "Clear and patient."}, headers=learner["h"])
    assert r.status_code == 201 and r.json()["review"] == {"score": 4, "note": "Clear and patient."} and r.json()["can_review"] is False
    assert client.post(f"/v1/wisdom/sessions/{s['id']}/review", json={"score": 5}, headers=learner["h"]).status_code == 409
    seen = client.get("/v1/wisdom/sessions", headers=elder["h"]).json()["sessions"]
    assert seen[0]["review"]["score"] == 4 and seen[0]["role"] == "teacher" and seen[0]["with_name"] == "Sarath"


def test_upcoming_sessions_has_its_shape_and_never_shows_another_persons():
    elder, learner, cid = pair()
    soon, far = plan(elder, cid, "AI & OS Mentoring", 2), plan(elder, cid, "OS Project Review", 20)
    stranger = person("Nur Aisyah")
    with engine().begin() as conn:
        mine = wisdom.upcoming_sessions(conn, learner["id"], datetime.now(timezone.utc) + timedelta(days=7))
        theirs = wisdom.upcoming_sessions(conn, stranger["id"], datetime.now(timezone.utc) + timedelta(days=30))
    assert [s["id"] for s in mine] == [soon["id"]] and far["id"] not in str(mine)
    assert set(mine[0]) == {"id", "title", "starts_at", "place", "with_name", "role"}
    assert mine[0]["role"] == "learner" and mine[0]["with_name"] == "Tan" and mine[0]["place"] == "Tampines Hub"
    assert theirs == []
    assert client.get("/v1/wisdom/sessions", headers=stranger["h"]).json()["sessions"] == []
    assert client.post(f"/v1/wisdom/sessions/{soon['id']}/complete", headers=stranger["h"]).status_code == 404
    assert client.post("/v1/wisdom/sessions/not-a-uuid/complete", headers=stranger["h"]).status_code == 404
    assert client.post(f"/v1/wisdom/connections/{cid}/schedule", json={"title": "Sneaky", "starts_at": later()}, headers=stranger["h"]).status_code == 404


def test_learn_search_finds_an_elder_by_name_skill_or_language_and_a_chip_finds_any_of_its_words():
    elder, learner = person("Kenji Watanabe", "60plus"), person("Priya Raman")
    oid = offer(elder, "Everyday conversation for travel", about="Born in Osaka. I teach slowly.", proof_field="Language teacher", topics=["language", "japanese"], languages=["Japanese", "English"])
    found = lambda **q: [o["id"] for o in client.get("/v1/wisdom/offers", params=q, headers=learner["h"]).json()["offers"]]  # noqa: E731
    assert oid in found(q="watanabe")  # the elder's name
    assert oid in found(q="osaka")  # the bio
    assert oid in found(q="japanese")  # a skill or a language
    assert oid in found(q="language teacher")  # the field
    assert oid in found(topic="career,language")  # a chip: any of its words
    assert oid not in found(topic="career,gardening")
    o = next(x for x in client.get("/v1/wisdom/offers", params={"q": "watanabe"}, headers=learner["h"]).json()["offers"] if x["id"] == oid)
    assert o["name"] == "Kenji W." and o["by"] == "Kenji" and "Watanabe" not in o["name"]
