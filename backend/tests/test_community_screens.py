"""Community screens: events/activities lists and detail, people, invite, initiatives, update comments and likes. Own throw-away users and communities."""
import uuid
from datetime import datetime, timedelta, timezone

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
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"]}


def community(lead: dict) -> tuple[str, str]:
    r = client.post("/v1/communities", json={"name": "Screens Heights"}, headers=lead["h"]).json()
    code = client.get(f"/v1/communities/{r['id']}", headers=lead["h"]).json()["community"]["invite_code"]
    return r["id"], code


def at(days: float) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def test_lead_creates_an_event_and_it_shows_in_the_right_tab():
    lead = person()
    cid, _ = community(lead)
    r = client.post(f"/v1/communities/{cid}/activities", json={"title": "Morning Yoga", "category": "Fitness", "starts_at": at(2), "location": "Lawn"}, headers=lead["h"])
    assert r.status_code == 200, r.text
    aid = r.json()["id"]
    up = client.get(f"/v1/communities/{cid}/activities?when=upcoming", headers=lead["h"]).json()["activities"]
    assert [a["id"] for a in up] == [aid]
    assert client.get(f"/v1/communities/{cid}/activities?when=mine", headers=lead["h"]).json()["activities"] == []
    assert client.post(f"/v1/communities/activities/{aid}/going", json={"going": True}, headers=lead["h"]).status_code == 200
    mine = client.get(f"/v1/communities/{cid}/activities?when=mine", headers=lead["h"]).json()["activities"]
    assert mine[0]["i_going"] is True and mine[0]["going_count"] == 1
    assert client.get(f"/v1/communities/{cid}/activities?when=past", headers=lead["h"]).json()["activities"] == []
    assert client.get(f"/v1/communities/{cid}/activities?when=nonsense", headers=lead["h"]).status_code == 422
    d = client.get(f"/v1/communities/activities/{aid}", headers=lead["h"]).json()
    assert d["title"] == "Morning Yoga" and d["going"][0]["id"] == lead["id"]
    cats = client.get(f"/v1/communities/{cid}/activity-categories", headers=lead["h"]).json()["categories"]
    assert cats[0]["name"] == "Fitness" and cats[0]["ongoing"] == 1
    only = client.get(f"/v1/communities/{cid}/activities?category=Fitness", headers=lead["h"]).json()["activities"]
    assert len(only) == 1


def test_a_plain_member_cannot_create_and_an_outsider_sees_nothing():
    lead, member, outsider = person(), person(), person()
    cid, code = community(lead)
    assert client.post("/v1/communities/join", json={"code": code}, headers=member["h"]).status_code == 200
    body = {"title": "Tea Morning", "starts_at": at(1)}
    assert client.post(f"/v1/communities/{cid}/activities", json=body, headers=member["h"]).status_code == 403
    assert client.post(f"/v1/communities/{cid}/initiatives", json={"title": "Green Block"}, headers=member["h"]).status_code == 403
    for path in (f"/{cid}/activities", f"/{cid}/members", f"/{cid}/invite", f"/{cid}/initiatives", f"/{cid}/activity-categories"):
        assert client.get("/v1/communities" + path, headers=outsider["h"]).status_code == 403
    assert client.get("/v1/communities/activities/not-a-uuid", headers=member["h"]).status_code == 404


def test_people_search_and_the_invite_code_is_for_managers_only():
    lead, member = person(), person()
    cid, code = community(lead)
    client.post("/v1/communities/join", json={"code": code}, headers=member["h"])
    people = client.get(f"/v1/communities/{cid}/members", headers=member["h"]).json()["members"]
    assert len(people) == 2 and people[0]["role"] == "Community Lead"
    assert client.get(f"/v1/communities/{cid}/members?q=zzzzzz", headers=member["h"]).json()["members"] == []
    assert client.get(f"/v1/communities/{cid}/invite", headers=lead["h"]).json() == {"name": "Screens Heights", "can_invite": True, "invite_code": code}
    assert client.get(f"/v1/communities/{cid}/invite", headers=member["h"]).json() == {"name": "Screens Heights", "can_invite": False, "invite_code": None}


def test_initiatives_create_join_leave():
    lead, member = person(), person()
    cid, code = community(lead)
    client.post("/v1/communities/join", json={"code": code}, headers=member["h"])
    iid = client.post(f"/v1/communities/{cid}/initiatives", json={"title": "Green Campus", "summary": "Greener", "current_plan": "Plant 50 trees"}, headers=lead["h"]).json()["id"]
    one = client.get(f"/v1/communities/initiatives/{iid}", headers=member["h"]).json()
    assert one["member_count"] == 1 and one["joined"] is False and one["current_plan"] == "Plant 50 trees"
    assert client.post(f"/v1/communities/initiatives/{iid}/join", json={"joined": True}, headers=member["h"]).json() == {"joined": True, "member_count": 2}
    assert client.post(f"/v1/communities/initiatives/{iid}/join", json={"joined": False}, headers=member["h"]).json()["member_count"] == 1
    assert [i["id"] for i in client.get(f"/v1/communities/{cid}/initiatives", headers=member["h"]).json()["initiatives"]] == [iid]


def test_comments_and_likes_on_an_update():
    lead, member, outsider = person(), person(), person()
    cid, code = community(lead)
    client.post("/v1/communities/join", json={"code": code}, headers=member["h"])
    with engine().begin() as conn:
        aid = str(conn.execute(text("insert into announcements (community_id, author_id, title, body) values (:c, :u, 'Tree drive', 'Join us') returning id"), {"c": cid, "u": lead["id"]}).one().id)
    h = member["h"]
    assert client.post(f"/v1/communities/updates/{aid}/like", json={"liked": True}, headers=h).json() == {"liked": True, "likes": 1}
    d = client.post(f"/v1/communities/updates/{aid}/comments", json={"body": "I will join"}, headers=h).json()
    assert d["comments"][0]["body"] == "I will join" and d["likes"] == 1 and d["i_like"] is True
    assert client.post(f"/v1/communities/updates/{aid}/comments", json={"body": ""}, headers=h).status_code == 422
    assert client.get(f"/v1/communities/updates/{aid}", headers=outsider["h"]).status_code == 403
    assert client.post(f"/v1/communities/updates/{aid}/comments", json={"body": "hi"}, headers=outsider["h"]).status_code == 403
