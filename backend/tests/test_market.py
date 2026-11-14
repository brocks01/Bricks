"""Marketplace: listings with proof and a draft pay guide, bookings (a person or a community's leader hires), calendar items for both, endorsements only from people who booked, stalls at a market day."""
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
            conn.execute(text("delete from calendar_items where person_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person(band: str | None = None) -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    if band:
        with engine().begin() as conn:
            conn.execute(text("update users set age_band = :b where id = :u"), {"b": band, "u": s["user"]["id"]})
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"]}


def when(days=2, hour=10):
    return (datetime.now(timezone.utc) + timedelta(days=days)).replace(hour=hour, minute=0, second=0, microsecond=0).isoformat()


def listing(p, **kw):
    body = {"title": "Kueh making lesson", "category": "cooking", "tier": "skilled", "experience_years": 30, "proof_text": "Ran a kueh stall at Tekka for 30 years", "rate_per_hour": 25, **kw}
    return client.post("/v1/market/listings", json=body, headers=p["h"])


def test_the_pay_guide_is_by_complexity_only_and_a_draft():
    g = client.get("/v1/market/guide?tier=expert").json()
    assert g["low"] < g["high"] and g["currency"] == "SGD" and "Not a legal wage" in g["note"]
    assert set(g) == {"tier", "low", "high", "currency", "per", "note"}  # no gender, no age: rates follow the work


def test_who_may_list_and_what_a_listing_holds():
    senior, young = person("60plus"), person("under40")
    r = listing(senior)
    assert r.status_code == 200, r.text
    lid = r.json()["id"]
    assert listing(young).json()["detail"]["code"] == "offer_not_allowed"
    d = client.get(f"/v1/market/listings/{lid}", headers=young["h"]).json()
    assert d["proof_text"].startswith("Ran a kueh") and d["experience_years"] == 30 and d["verified"] is False and d["endorsements"] == 0 and d["rate_per_hour"] == 25.0
    assert client.post("/v1/market/listings", json={"title": "ab", "category": "cooking"}, headers=senior["h"]).status_code == 422
    found = client.get("/v1/market/listings?q=kueh", headers=young["h"]).json()["listings"]
    assert lid in [x["id"] for x in found]
    assert lid not in [x["id"] for x in client.get("/v1/market/listings?category=repair", headers=young["h"]).json()["listings"]]
    assert client.get("/v1/market/listings?category=nonsense", headers=young["h"]).status_code == 422
    mine = client.get("/v1/market/listings?mine=true", headers=senior["h"]).json()["listings"]
    assert [x["id"] for x in mine] == [lid] and mine[0]["mine"] is True
    assert client.patch(f"/v1/market/listings/{lid}", json={"rate_per_hour": 30}, headers=young["h"]).status_code == 403
    assert client.patch(f"/v1/market/listings/{lid}", json={"rate_per_hour": 30, "status": "paused"}, headers=senior["h"]).status_code == 200
    assert lid not in [x["id"] for x in client.get("/v1/market/listings", headers=young["h"]).json()["listings"]]
    assert client.delete(f"/v1/market/listings/{lid}", headers=senior["h"]).json() == {"archived": True}
    assert client.get(f"/v1/market/listings/{lid}", headers=senior["h"]).status_code == 404
    assert client.get("/v1/market/listings/not-a-uuid", headers=senior["h"]).status_code == 404


def test_booking_accepted_lands_in_both_calendars_and_cancel_removes_it():
    senior, buyer = person("60plus"), person()
    lid = listing(senior).json()["id"]
    assert client.post(f"/v1/market/listings/{lid}/bookings", json={"starts_at": when(), "hours": 2}, headers=senior["h"]).json()["detail"]["code"] == "own_listing"
    assert client.post(f"/v1/market/listings/{lid}/bookings", json={"starts_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()}, headers=buyer["h"]).json()["detail"]["code"] == "in_the_past"
    b = client.post(f"/v1/market/listings/{lid}/bookings", json={"starts_at": when(), "hours": 2, "note": "For my grandchildren"}, headers=buyer["h"]).json()
    assert b["status"] == "requested"
    assert client.post(f"/v1/market/listings/{lid}/bookings", json={"starts_at": when(), "hours": 2}, headers=buyer["h"]).json()["detail"]["code"] == "duplicate"
    assert client.get("/v1/market/summary", headers=senior["h"]).json() == {"waiting_for_me": 1, "my_listings": 1}
    assert client.post(f"/v1/market/bookings/{b['id']}/decide", json={"accept": True}, headers=buyer["h"]).status_code == 403  # only the provider answers
    assert client.post(f"/v1/market/bookings/{b['id']}/decide", json={"accept": True}, headers=senior["h"]).json() == {"status": "accepted"}
    assert client.post(f"/v1/market/bookings/{b['id']}/decide", json={"accept": False}, headers=senior["h"]).status_code == 409
    for p in (senior, buyer):
        items = client.get("/v1/calendar/occurrences", params={"from": when(1, 0), "to": when(4, 0)}, headers=p["h"]).json()["occurrences"]
        assert any("Kueh making lesson with" in i["title"] for i in items), items
    mine = client.get("/v1/market/bookings", headers=buyer["h"]).json()["bookings"]
    assert mine[0]["role"] == "requester" and mine[0]["agreed_rate"] == 25.0 and mine[0]["hours"] == 2.0
    assert client.post(f"/v1/market/bookings/{b['id']}/cancel", headers=buyer["h"]).json() == {"status": "cancelled"}
    items = client.get("/v1/calendar/occurrences", params={"from": when(1, 0), "to": when(4, 0)}, headers=senior["h"]).json()["occurrences"]
    assert not any("Kueh making lesson" in i["title"] for i in items)


def test_only_someone_who_really_had_the_service_can_endorse():
    senior, buyer, other = person("60plus"), person(), person()
    lid = listing(senior).json()["id"]
    assert client.post(f"/v1/market/listings/{lid}/endorse", json={"note": "Great"}, headers=other["h"]).json()["detail"]["code"] == "no_booking"
    b = client.post(f"/v1/market/listings/{lid}/bookings", json={"starts_at": when()}, headers=buyer["h"]).json()["id"]
    client.post(f"/v1/market/bookings/{b}/decide", json={"accept": True}, headers=senior["h"])
    assert client.post(f"/v1/market/bookings/{b}/complete", headers=senior["h"]).json()["detail"]["code"] == "not_yet"  # it has not happened yet
    with engine().begin() as conn:
        conn.execute(text("update service_bookings set starts_at = now() - interval '2 hours' where id = :b"), {"b": b})
    assert client.post(f"/v1/market/bookings/{b}/complete", headers=senior["h"]).json() == {"status": "done"}
    assert client.get(f"/v1/market/listings/{lid}", headers=buyer["h"]).json()["can_endorse"] is True
    assert client.post(f"/v1/market/listings/{lid}/endorse", json={"note": "Best kueh"}, headers=buyer["h"]).json() == {"endorsed": True}
    assert client.post(f"/v1/market/listings/{lid}/endorse", json={}, headers=buyer["h"]).json()["detail"]["code"] == "already"
    d = client.get(f"/v1/market/listings/{lid}", headers=other["h"]).json()
    assert d["endorsements"] == 1 and d["endorsed_by"][0]["note"] == "Best kueh" and d["can_endorse"] is False


def test_a_community_hires_through_its_leader_only():
    senior, lead, member = person("60plus"), person(), person()
    cid = client.post("/v1/communities", json={"name": "Hire Heights"}, headers=lead["h"]).json()["id"]
    code = client.get(f"/v1/communities/{cid}", headers=lead["h"]).json()["community"]["invite_code"]
    client.post("/v1/communities/join", json={"code": code}, headers=member["h"])
    lid = listing(senior, title="Marketing for your stall", category="advice", tier="expert").json()["id"]
    body = {"starts_at": when(3), "hours": 1.5, "community_id": cid}
    assert client.post(f"/v1/market/listings/{lid}/bookings", json=body, headers=member["h"]).json()["detail"]["code"] == "not_a_manager"
    r = client.post(f"/v1/market/listings/{lid}/bookings", json=body, headers=lead["h"])
    assert r.status_code == 200
    incoming = client.get("/v1/market/bookings", headers=senior["h"]).json()["bookings"][0]
    assert incoming["role"] == "provider" and incoming["community_name"] == "Hire Heights"


def test_stalls_at_a_market_day_senior_seller_with_a_helper():
    senior, young, lead = person("60plus"), person(), person()
    cid = client.post("/v1/communities", json={"name": "Market Heights"}, headers=lead["h"]).json()["id"]
    code = client.get(f"/v1/communities/{cid}", headers=lead["h"]).json()["community"]["invite_code"]
    for p in (senior, young):
        client.post("/v1/communities/join", json={"code": code}, headers=p["h"])
    with engine().begin() as conn:
        market = str(conn.execute(text("insert into activities (community_id, organiser_id, title, category, starts_at) values (:c, :o, 'Sunday Market', 'Market', now() + interval '3 days') returning id"), {"c": cid, "o": lead["id"]}).scalar_one())
        plain = str(conn.execute(text("insert into activities (community_id, organiser_id, title, category, starts_at) values (:c, :o, 'Tea', 'Social', now() + interval '3 days') returning id"), {"c": cid, "o": lead["id"]}).scalar_one())
    body = {"selling": "Hand-painted greeting cards", "helper_name": "Grandson Arun"}
    assert client.post(f"/v1/market/stalls/{market}", json=body, headers=young["h"]).json()["detail"]["code"] == "sellers_are_seniors"
    assert client.post(f"/v1/market/stalls/{plain}", json=body, headers=senior["h"]).json()["detail"]["code"] == "not_a_market"
    assert client.post(f"/v1/market/stalls/{market}", json=body, headers=senior["h"]).status_code == 200
    outsider = person("60plus")
    assert client.get(f"/v1/market/stalls/{market}", headers=outsider["h"]).json()["detail"]["code"] == "not_a_member"
    s = client.get(f"/v1/market/stalls/{market}", headers=young["h"]).json()
    assert s["activity"]["is_market"] is True and s["stalls"][0]["selling"] == "Hand-painted greeting cards" and s["stalls"][0]["helper_name"] == "Grandson Arun" and s["stalls"][0]["mine"] is False
    assert client.delete(f"/v1/market/stalls/{market}", headers=senior["h"]).json() == {"cancelled": True}
    assert client.get(f"/v1/market/stalls/{market}", headers=young["h"]).json()["stalls"] == []
