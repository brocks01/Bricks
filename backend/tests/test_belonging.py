"""The belonging layer of Communities: the days a circle keeps (and the countdown nudge), who is away and only when they chose to share
it, taking part from afar, and the circle's stories. Own throw-away people, circles and days, removed afterwards."""
import uuid
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app

client = TestClient(app)
EMAILS: list[str] = []
TAG = uuid.uuid4().hex[:6]
NAME = f"BT{TAG} Chhath Circle"


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from notifications where user_id in (select id from users where email = :e)"), {"e": e})
        conn.execute(text("delete from wisdom_capsules where title like :t"), {"t": f"BT{TAG}%"})
        conn.execute(text("delete from communities where name like :t"), {"t": f"BT{TAG}%"})
        for e in EMAILS:
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from festivals where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person(name="Rajan Pillai", gender=None, admin=False) -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    h = {"Authorization": f"Bearer {s['access_token']}"}
    client.patch("/v1/me", json={"display_name": name, "age_band": "60plus"}, headers=h)
    if gender:
        client.put("/v1/onboarding/basics", json={"answers": {"gender": gender}}, headers=h)
    if admin:
        with engine().begin() as conn:
            conn.execute(text("update users set is_platform_admin = true where id = :u"), {"u": s["user"]["id"]})
    return {"h": h, "id": s["user"]["id"], "name": name}


def circle(lead: dict) -> str:
    r = client.post("/v1/communities", json={"name": NAME, "circle": "faith", "privacy": "open"}, headers=lead["h"])
    assert r.status_code == 200, r.text
    return r.json()["id"]


def join(cid: str, lead: dict, p: dict) -> None:
    code = client.get(f"/v1/communities/{cid}", headers=lead["h"]).json()["community"]["invite_code"]
    assert client.post("/v1/communities/join", json={"code": code}, headers=p["h"]).status_code == 200


def member_in(lead: dict, cid: str, p: dict) -> dict:
    return next((m for m in client.get(f"/v1/communities/{cid}/members", headers=lead["h"]).json()["members"] if m["id"] == p["id"]), {})


def day_offset(n: int) -> str:
    return (date.today() + timedelta(days=n)).isoformat()


# ---------- our days ----------
def test_only_a_leader_keeps_a_day_and_members_see_the_countdown():
    lead, member, outsider = person("Asha Devi", admin=True), person("Mohan Lal"), person("Ravi Kumar")
    cid = circle(lead)
    join(cid, lead, member)

    made = client.post(f"/v1/communities/{cid}/days", json={"name": "Chhath Puja", "starts_on": day_offset(3), "ends_on": day_offset(4), "tradition": "The ghat at dawn"}, headers=lead["h"])
    assert made.status_code == 200 and made.json()["kept"] is True

    # a plain member may look but not add, and someone outside the circle cannot even look
    refused = client.post(f"/v1/communities/{cid}/days", json={"name": "Diwali", "starts_on": day_offset(9)}, headers=member["h"])
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == "not_a_lead"
    outsider_post = client.post(f"/v1/communities/{cid}/days", json={"name": "Diwali", "starts_on": day_offset(9)}, headers=outsider["h"])
    assert outsider_post.status_code == 403 and outsider_post.json()["detail"]["code"] == "not_a_member"
    assert client.get(f"/v1/communities/{cid}/days", headers=outsider["h"]).status_code == 403

    # the countdown, to a member and to a leader alike
    for p in (lead, member):
        days = client.get(f"/v1/communities/{cid}/days", headers=p["h"]).json()["days"]
        assert len(days) == 1 and days[0]["name"] == "Chhath Puja" and days[0]["days_to_go"] == 3 and days[0]["tradition"] == "The ghat at dawn"

    # a day already past is not a coming day
    client.post(f"/v1/communities/{cid}/days", json={"name": "Old Harvest", "starts_on": day_offset(-2)}, headers=lead["h"])
    assert [d["name"] for d in client.get(f"/v1/communities/{cid}/days", headers=lead["h"]).json()["days"]] == ["Chhath Puja"]

    # only a leader takes a day off
    day_id = made.json()["id"]
    assert client.delete(f"/v1/communities/{cid}/days/{day_id}", headers=member["h"]).status_code == 403
    assert client.delete(f"/v1/communities/{cid}/days/{day_id}", headers=lead["h"]).json() == {"removed": True}
    assert client.get(f"/v1/communities/{cid}/days", headers=lead["h"]).json()["days"] == []


def test_a_festival_comes_from_the_calendar_and_its_real_dates_travel_with_it():
    admin, other = person("Platform Admin", admin=True), person("Sunita Devi")
    cid = circle(admin)

    # only platform admins add to the calendar
    assert client.post("/v1/festivals", json={"name": "Chhath Puja", "starts_on": day_offset(30), "ends_on": day_offset(34)}, headers=other["h"]).status_code == 403
    made = client.post("/v1/festivals", json={"name": "Chhath Puja", "tradition": "Four days of thanks to the sun", "regions": ["Bihar", "UP"],
                                              "starts_on": day_offset(30), "ends_on": day_offset(34)}, headers=admin["h"])
    assert made.status_code == 200, made.text
    fid = made.json()["id"]
    listed = [f for f in client.get("/v1/festivals", headers=other["h"]).json()["festivals"] if f["id"] == fid]
    assert listed and listed[0]["regions"] == ["Bihar", "UP"]

    # the circle keeps it once, and the calendar's dates are the ones that travel with it
    first = client.post(f"/v1/communities/{cid}/days", json={"festival_id": fid}, headers=admin["h"])
    assert first.status_code == 200 and first.json()["kept"] is True
    again = client.post(f"/v1/communities/{cid}/days", json={"festival_id": fid}, headers=admin["h"])
    assert again.json() == {"id": first.json()["id"], "kept": False}
    days = client.get(f"/v1/communities/{cid}/days", headers=admin["h"]).json()["days"]
    assert days[0]["name"] == "Chhath Puja" and days[0]["days_to_go"] == 30 and days[0]["festival_id"] == fid

    # the dates are never invented: they have to make sense, and no festival means no day
    bad = client.post("/v1/festivals", json={"name": "Backwards Day", "starts_on": day_offset(5), "ends_on": day_offset(1)}, headers=admin["h"])
    assert bad.status_code == 422
    assert client.post(f"/v1/communities/{cid}/days", json={"festival_id": str(uuid.uuid4())}, headers=admin["h"]).status_code == 404


# ---------- presence ----------
def test_away_is_shown_to_the_circle_only_when_the_person_chose_to_share_it():
    lead, member, outsider = person("Asha Devi", admin=True), person("Meena Iyer"), person("Ravi Kumar")
    cid = circle(lead)
    join(cid, lead, member)

    # off by default: the circle is told nothing at all
    assert client.put(f"/v1/communities/{cid}/presence", json={"status": "away", "place": "Penang"}, headers=member["h"]).json()["share"] is False
    row = member_in(lead, cid, member)
    assert row["away"] is False and row["away_place"] is None

    shared = client.put(f"/v1/communities/{cid}/presence", json={"status": "away", "place": "Penang", "share": True}, headers=member["h"])
    assert shared.json()["share"] is True and shared.json()["since"]
    row = member_in(lead, cid, member)
    assert row["away"] is True and row["away_place"] == "Penang" and row["away_since"]

    # the person sees their own; nobody sees anyone else's
    mine = client.get(f"/v1/communities/{cid}/presence", headers=member["h"]).json()
    assert mine["status"] == "away" and mine["place"] == "Penang" and mine["share"] is True
    assert client.get(f"/v1/communities/{cid}/presence", headers=outsider["h"]).status_code == 403
    assert client.get(f"/v1/communities/{cid}/members", headers=outsider["h"]).status_code == 403

    # back among them, and the sharing goes with it
    back = client.put(f"/v1/communities/{cid}/presence", json={"status": "here"}, headers=member["h"]).json()
    assert back["status"] == "here" and back["place"] is None and back["share"] is False and back["since"]
    assert member_in(lead, cid, member)["away"] is False
    assert client.put(f"/v1/communities/{cid}/presence", json={"status": "somewhere"}, headers=member["h"]).status_code == 422


# ---------- taking part from afar ----------
def test_a_message_for_a_day_reaches_the_circle_once_a_day_and_only_members_read_it():
    lead, member, outsider = person("Asha Devi", admin=True), person("Meena Iyer"), person("Ravi Kumar")
    cid = circle(lead)
    join(cid, lead, member)
    day = client.post(f"/v1/communities/{cid}/days", json={"name": "Chhath Puja", "starts_on": day_offset(1)}, headers=lead["h"]).json()["id"]

    assert client.get(f"/v1/communities/{cid}/contributions", headers=outsider["h"]).status_code == 403  # members only
    first = client.post(f"/v1/communities/{cid}/contributions", json={"day_id": day, "kind": "blessing", "body": "May the sun rise on all of you at the ghat."}, headers=member["h"])
    assert first.status_code == 200, first.text
    second = client.post(f"/v1/communities/{cid}/contributions", json={"day_id": day, "body": "And on our families too."}, headers=member["h"])
    assert second.status_code == 200

    rows = client.get(f"/v1/communities/{cid}/contributions", headers=lead["h"]).json()
    assert len(rows["contributions"]) == 2
    kinds = {c["id"]: c["kind"] for c in rows["contributions"]}
    assert kinds[first.json()["id"]] == "blessing" and kinds[second.json()["id"]] == "message"
    by = {c["id"]: c["by"] for c in rows["contributions"]}
    assert by[first.json()["id"]] == "Meena Iyer" and all(c["day_id"] == day for c in rows["contributions"])

    # the circle is told through the outbox, once per person per day, however many things are sent
    told = notified(lead, "circle")
    assert told == 1
    assert notified(member, "circle") == 0  # nobody is told about their own message

    # a long message is refused, and a day that is not this circle's cannot be used
    assert client.post(f"/v1/communities/{cid}/contributions", json={"body": "x" * 1001}, headers=member["h"]).status_code == 422
    assert client.post(f"/v1/communities/{cid}/contributions", json={"body": "hello", "day_id": str(uuid.uuid4())}, headers=member["h"]).status_code == 404

    # a leader takes one out of view: hidden from the others, kept safe, never deleted
    hidden_id = first.json()["id"]
    assert client.post(f"/v1/communities/contributions/{hidden_id}/hide", headers=member["h"]).status_code == 403
    assert client.post(f"/v1/communities/contributions/{hidden_id}/hide", headers=lead["h"]).json() == {"hidden": True}
    left = client.get(f"/v1/communities/{cid}/contributions", headers=member["h"]).json()
    assert [c["id"] for c in left["contributions"]] == [second.json()["id"]]
    assert client.get(f"/v1/communities/{cid}/contributions", headers=lead["h"]).json()["can_hide"] is True
    with engine().connect() as conn:
        assert conn.execute(text("select body from circle_contributions where id = :i"), {"i": hidden_id}).scalar_one()


def notified(p: dict, kind: str) -> int:
    with engine().connect() as conn:
        return conn.execute(text("select count(*) from notifications where user_id = :u and kind = :k"), {"u": p["id"], "k": kind}).scalar_one()


# ---------- the circle's stories ----------
def test_only_the_author_shares_a_story_into_a_circle_and_only_members_read_it():
    author, other, outsider = person("Asha Devi", admin=True), person("Meena Iyer"), person("Ravi Kumar", admin=True)
    cid = circle(author)
    join(cid, author, other)
    outsider_circle = circle(outsider)
    capsule = client.post("/v1/wisdom/capsules", json={"title": f"BT{TAG} How we kept Chhath in Singapore",
                                                       "body": "We woke before dawn and made thekua together, all four of us.", "kind": "cultural"}, headers=author["h"])
    assert capsule.status_code == 201, capsule.text
    lid = capsule.json()["id"]

    # somebody else's story is never theirs to share, and no circle of someone else's either
    assert client.post(f"/v1/wisdom/capsules/{lid}/share-to-circle", json={"community_id": cid}, headers=other["h"]).status_code == 403
    assert client.post(f"/v1/wisdom/capsules/{lid}/share-to-circle", json={"community_id": outsider_circle}, headers=author["h"]).status_code == 403

    # their own story, into their own circle, reads back to its members and to nobody outside
    assert client.post(f"/v1/wisdom/capsules/{lid}/share-to-circle", json={"community_id": cid}, headers=author["h"]).json()["shared"] is True
    for p in (author, other):
        assert [s["title"] for s in client.get(f"/v1/communities/{cid}/stories", headers=p["h"]).json()["stories"]] == [f"BT{TAG} How we kept Chhath in Singapore"]
    assert client.get(f"/v1/communities/{cid}/stories", headers=outsider["h"]).status_code == 403

    # taking it back leaves nothing in the circle
    assert client.post(f"/v1/wisdom/capsules/{lid}/share-to-circle", json={}, headers=author["h"]).json()["shared"] is False
    assert client.get(f"/v1/communities/{cid}/stories", headers=other["h"]).json()["stories"] == []


# ---------- the countdown nudge ----------
def test_the_nudge_goes_out_three_days_and_one_day_before_and_only_once_per_person():
    from app.modules.belonging import nudges

    lead, member = person("Asha Devi", admin=True), person("Meena Iyer")
    cid = circle(lead)
    join(cid, lead, member)
    for n, o in (("One Day Away", 1), ("Two Days Away", 2), ("Three Days Away", 3)):
        assert client.post(f"/v1/communities/{cid}/days", json={"name": n, "starts_on": day_offset(o)}, headers=lead["h"]).status_code == 200

    nudges.run_once()
    bodies = [r.body for r in notified_rows(member, "day_nudge")]
    assert len(bodies) == 2  # three days before, and the day before; nothing for the day in between
    assert any("Three Days Away is in 3 days" in b for b in bodies) and any("One Day Away is tomorrow" in b for b in bodies)

    # a second tick says nothing more: one nudge per person per kept day
    nudges.run_once()
    assert notified(member, "day_nudge") == 2
    assert notified(lead, "day_nudge") == 2  # the leaders of the circle hear it too


def notified_rows(p: dict, kind: str):
    with engine().connect() as conn:
        return conn.execute(text("select body from notifications where user_id = :u and kind = :k order by id"), {"u": p["id"], "k": kind}).all()
