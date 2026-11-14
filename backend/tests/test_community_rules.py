"""Community rules: three at most, explore, leave, family can see you are there (opt-in), and creating by request with experience + platform approval."""
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
        for e in EMAILS:  # families first: they point at people
            conn.execute(text("delete from families where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from family_members where user_id in (select id from users where email = :e)"), {"e": e})
        for e in EMAILS:
            conn.execute(text("delete from community_requests where user_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person() -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"], "email": email}


def make(lead: dict, name: str = "Rules Heights", privacy: str = "open") -> str:
    return client.post("/v1/communities", json={"name": name, "privacy": privacy}, headers=lead["h"]).json()["id"]


def test_three_communities_at_most_then_leave_one_to_join_another():
    owner, me = person(), person()
    ids = [make(owner, f"Cap Block {i}") for i in range(4)]
    for i in range(3):
        assert client.post(f"/v1/communities/{ids[i]}/join", headers=me["h"]).status_code == 200
    assert client.get("/v1/communities/limits", headers=me["h"]).json() == {"max": 3, "used": 3, "left": 0}
    r = client.post(f"/v1/communities/{ids[3]}/join", headers=me["h"])
    assert r.status_code == 409 and r.json()["detail"]["code"] == "community_limit"
    # joining one I am already in costs nothing and is not refused
    assert client.post(f"/v1/communities/{ids[0]}/join", headers=me["h"]).status_code == 200
    # exploring is still free: the fourth is listed, just cannot be joined
    ex = client.get("/v1/communities/explore?q=Cap Block 3", headers=me["h"]).json()
    assert ex["limits"]["left"] == 0 and ex["communities"][0]["can_join"] is False and ex["communities"][0]["joined"] is False
    assert client.post(f"/v1/communities/{ids[1]}/leave", headers=me["h"]).json() == {"left": True}
    assert client.post(f"/v1/communities/{ids[3]}/join", headers=me["h"]).status_code == 200
    # the invite code path obeys the same cap
    code = client.get(f"/v1/communities/{ids[1]}", headers=owner["h"]).json()["community"]["invite_code"]
    r = client.post("/v1/communities/join", json={"code": code}, headers=me["h"])
    assert r.status_code == 409 and r.json()["detail"]["code"] == "community_limit"


def test_invite_only_cannot_be_joined_from_explore_and_bad_ids_are_404():
    owner, me = person(), person()
    cid = make(owner, "Private Court", privacy="invite")
    r = client.post(f"/v1/communities/{cid}/join", headers=me["h"])
    assert r.status_code == 403 and r.json()["detail"]["code"] == "invite_only"
    assert client.post("/v1/communities/not-a-uuid/join", headers=me["h"]).status_code == 404
    assert client.post("/v1/communities/not-a-uuid/leave", headers=me["h"]).status_code == 404
    assert client.post(f"/v1/communities/{cid}/leave", headers=me["h"]).status_code == 404  # never a member


def test_the_last_lead_cannot_walk_away_from_a_community_with_people_in_it():
    owner, me = person(), person()
    cid = make(owner, "Lead Court")
    client.post(f"/v1/communities/{cid}/join", headers=me["h"])
    r = client.post(f"/v1/communities/{cid}/leave", headers=owner["h"])
    assert r.status_code == 409 and r.json()["detail"]["code"] == "last_lead"
    assert client.post(f"/v1/communities/{cid}/leave", headers=me["h"]).status_code == 200


def test_family_sees_a_member_only_after_the_member_allows_it():
    mum, son, stranger = person(), person(), person()
    with engine().begin() as conn:
        fid = conn.execute(text("insert into families (name, created_by) values ('Test Family', :u) returning id"), {"u": son["id"]}).scalar_one()
        for u, role in ((son["id"], "owner"), (mum["id"], "member")):
            conn.execute(text("insert into family_members (family_id, user_id, role) values (:f, :u, :r)"), {"f": fid, "u": u, "r": role})
    cid = make(stranger, "Family Court")
    client.post(f"/v1/communities/{cid}/join", headers=mum["h"])
    client.post(f"/v1/communities/{cid}/join", headers=son["h"])
    sees = lambda: [m["id"] for m in client.get(f"/v1/communities/{cid}", headers=son["h"]).json()["family_here"]]  # noqa: E731
    assert sees() == []  # off by default: nobody is shown without saying so
    assert client.get(f"/v1/communities/{cid}", headers=mum["h"]).json()["my_share"] is False
    assert client.post(f"/v1/communities/{cid}/share", json={"share": True}, headers=mum["h"]).json() == {"share": True}
    assert sees() == [mum["id"]]
    ex = [c for c in client.get("/v1/communities/explore?q=Family Court", headers=son["h"]).json()["communities"] if c["id"] == cid][0]
    assert [f["id"] for f in ex["family_here"]] == [mum["id"]]
    # a person who is not in the family never sees it, even if they are in the community
    client.post(f"/v1/communities/{cid}/join", headers=stranger["h"])
    assert client.get(f"/v1/communities/{cid}", headers=stranger["h"]).json()["family_here"] == []
    # leaving withdraws the sharing
    client.post(f"/v1/communities/{cid}/leave", headers=mum["h"])
    assert sees() == []


def test_a_new_community_is_a_request_the_platform_approves(monkeypatch):
    monkeypatch.setenv("COMMUNITY_CREATION", "request")
    newbie, veteran, admin, host = person(), person(), person(), person()
    body = {"name": "Sunrise Walkers", "kind": "club", "area_name": "Toa Payoh", "why": "Twenty men walk there every morning already."}
    # nobody can simply create one
    r = client.post("/v1/communities", json={"name": "Nope Heights"}, headers=newbie["h"])
    assert r.status_code == 403 and r.json()["detail"]["code"] == "creation_by_request"
    # a newcomer has no experience yet, so cannot even ask
    r = client.post("/v1/communities/requests", json=body, headers=newbie["h"])
    assert r.status_code == 403 and r.json()["detail"]["code"] == "not_eligible"
    exp = client.get("/v1/communities/experience", headers=newbie["h"]).json()
    assert exp["eligible"] is False and exp["need_events"] == 3 and exp["need_days"] == 14
    # experience: 14 days in a community and 3 events
    with engine().begin() as conn:
        cid = conn.execute(text("insert into communities (name, slug, invite_code, created_by) values ('Host Court', :s, :c, :u) returning id"),
                           {"s": "host-" + uuid.uuid4().hex[:6], "c": uuid.uuid4().hex[:8].upper(), "u": host["id"]}).scalar_one()
        conn.execute(text("insert into memberships (community_id, user_id, joined_at) values (:c, :u, now() - interval '30 days')"), {"c": cid, "u": veteran["id"]})
        for i in range(3):
            aid = conn.execute(text("insert into activities (community_id, organiser_id, title, starts_at) values (:c, :o, :t, now() - make_interval(days => :d)) returning id"),
                               {"c": cid, "o": host["id"], "t": f"Past {i}", "d": i + 1}).scalar_one()
            conn.execute(text("insert into activity_participants (activity_id, user_id, status) values (:a, :u, 'attended')"), {"a": aid, "u": veteran["id"]})
        conn.execute(text("update users set is_platform_admin = true where id = :u"), {"u": admin["id"]})
    assert client.get("/v1/communities/experience", headers=veteran["h"]).json()["eligible"] is True
    rid = client.post("/v1/communities/requests", json=body, headers=veteran["h"]).json()["id"]
    assert client.post("/v1/communities/requests", json=body, headers=veteran["h"]).json()["detail"]["code"] == "already_open"
    # only the platform sees and decides the queue
    assert client.get("/v1/communities/requests/review", headers=veteran["h"]).status_code == 403
    queue = client.get("/v1/communities/requests/review", headers=admin["h"]).json()["requests"]
    assert rid in [q["id"] for q in queue]
    assert client.post(f"/v1/communities/requests/{rid}/decide", json={"approve": True}, headers=veteran["h"]).status_code == 403
    # not approved yet: cannot turn it into a community
    assert client.post(f"/v1/communities/requests/{rid}/create", headers=veteran["h"]).status_code == 403
    assert client.post(f"/v1/communities/requests/{rid}/decide", json={"approve": True, "note": "Welcome"}, headers=admin["h"]).json() == {"status": "approved"}
    made = client.post(f"/v1/communities/requests/{rid}/create", headers=veteran["h"])
    assert made.status_code == 200
    new_id = made.json()["id"]
    mine = client.get(f"/v1/communities/{new_id}", headers=veteran["h"]).json()
    assert mine["my_role"] == "Community Lead" and mine["community"]["name"] == "Sunrise Walkers"
    assert client.get("/v1/communities/requests/mine", headers=veteran["h"]).json()["requests"][0]["status"] == "used"
    # a request cannot be used twice
    assert client.post(f"/v1/communities/requests/{rid}/create", headers=veteran["h"]).status_code == 403
    # a declined request stays declined
    other = person()
    with engine().begin() as conn:
        conn.execute(text("update users set is_platform_admin = true where id = :u"), {"u": other["id"]})
    rid2 = client.post("/v1/communities/requests", json={**body, "name": "Second Club"}, headers=other["h"]).json()["id"]
    assert client.post(f"/v1/communities/requests/{rid2}/decide", json={"approve": False, "note": "Too close to an existing one"}, headers=admin["h"]).json() == {"status": "declined"}
    assert client.post(f"/v1/communities/requests/{rid2}/create", headers=other["h"]).status_code == 403
    # platform admins may create directly
    assert client.post("/v1/communities", json={"name": "Admin Made"}, headers=other["h"]).status_code == 200
