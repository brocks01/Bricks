"""Wisdom speaks first, politely: the preferred channel, then the others, never at night, retried, always in the in-app inbox, and gentle nudges before a gathering."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.channels import nudges, outbox

client = TestClient(app)
EMAILS: list[str] = []
UTC = timezone.utc
DAY = datetime(2026, 11, 16, 4, 0, tzinfo=UTC)  # 12:00 in Singapore
NIGHT = datetime(2026, 11, 16, 15, 0, tzinfo=UTC)  # 23:00 in Singapore


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


@pytest.fixture
def pushes(monkeypatch):
    """Record every message sent to a chat channel instead of sending it."""
    class Log(list):
        fail: set = set()

    log = Log()
    log.fail = set()

    def fake(channel, address, body):
        if channel in log.fail:
            return False
        log.append((channel, address, body))
        return True

    monkeypatch.setattr(outbox, "_push", fake)
    return log


def person(name="Test Person") -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    h = {"Authorization": f"Bearer {s['access_token']}"}
    client.patch("/v1/me", json={"display_name": name}, headers=h)
    return {"h": h, "id": s["user"]["id"]}


def link(p, channel, address=None):
    with engine().begin() as conn:
        conn.execute(text("insert into channel_links (channel, external_id, user_id) values (:c, :x, :u)"), {"c": channel, "x": address or f"{channel}-{uuid.uuid4().hex[:6]}", "u": p["id"]})


def skill(p, name, /, **args):
    return client.post(f"/v1/skills/{name}", json={"args": args}, headers=p["h"]).json()


def row(i):
    with engine().connect() as conn:
        return conn.execute(text("select status, channel_used, tries, deliver_after from notifications where id = :i"), {"i": i}).one()


def test_it_goes_to_the_preferred_channel_first_and_falls_back_when_that_one_fails(pushes):
    p = person()
    link(p, "telegram", "tg-1")
    link(p, "sms", "+6590000001")
    assert skill(p, "set_contact_preference", channel="sms")["preferred"] == "sms"
    r = outbox.send(p["id"], "Meena asked for your guidance.", kind="wisdom", now=DAY)
    assert r["status"] == "sent" and r["channel"] == "sms" and pushes[-1][:2] == ("sms", "+6590000001")
    pushes.fail.add("sms")
    r = outbox.send(p["id"], "A second message.", now=DAY)
    assert r["channel"] == "telegram" and pushes[-1][0] == "telegram"  # sms failed, telegram took it


def test_with_no_chat_channel_it_lands_in_the_app_inbox_and_can_be_read():
    p = person()
    r = outbox.send(p["id"], "Hello from Wisdom.", now=DAY)
    assert r["status"] == "inbox"
    box = client.get("/v1/notifications", headers=p["h"]).json()
    assert box["unread"] == 1 and box["notifications"][0]["body"] == "Hello from Wisdom." and box["notifications"][0]["via"] == "app"
    assert client.post("/v1/notifications/read", headers=p["h"]).json()["marked"] == 1
    assert client.get("/v1/notifications", headers=p["h"]).json()["unread"] == 0
    outbox.send(p["id"], "News for you.", now=DAY)
    assert skill(p, "my_notifications")["unread"] == ["News for you."]
    assert skill(p, "my_notifications")["count"] == 0  # reading marks them seen


def test_nothing_is_sent_at_night_unless_it_is_urgent_and_the_morning_delivers_it(pushes):
    p = person()
    link(p, "telegram", "tg-2")
    r = outbox.send(p["id"], "Someone would like your help.", now=NIGHT)
    assert r["status"] == "queued" and pushes == []
    assert row(r["id"]).deliver_after == datetime(2026, 11, 17, 0, 0, tzinfo=UTC)  # 08:00 the next morning in Singapore
    assert outbox.run_due(NIGHT + timedelta(hours=1)) >= 0 and pushes == []
    morning = datetime(2026, 11, 17, 0, 5, tzinfo=UTC)
    outbox.run_due(morning)
    assert row(r["id"]).status == "sent" and pushes[-1][2] == "Someone would like your help."
    urgent = outbox.send(p["id"], "Your family needs you.", urgent=True, now=NIGHT)
    assert urgent["status"] == "sent"


def test_a_failing_channel_is_retried_then_the_message_stays_in_the_inbox(pushes):
    p = person()
    link(p, "telegram", "tg-3")
    pushes.fail.add("telegram")
    r = outbox.send(p["id"], "Please say hello.", now=DAY)
    assert r["status"] == "queued" and row(r["id"]).tries == 1
    outbox.run_due(DAY + timedelta(minutes=11))
    outbox.run_due(DAY + timedelta(minutes=22))
    assert row(r["id"]).status == "inbox"
    assert client.get("/v1/notifications", headers=p["h"]).json()["notifications"][0]["body"] == "Please say hello."


def test_the_same_message_is_never_sent_twice_and_what_was_sent_is_in_the_agents_memory(pushes):
    from app.modules.channels import memory

    p = person()
    link(p, "telegram", "tg-4")
    assert outbox.send(p["id"], "Tai chi starts soon.", kind="nudge", dedupe_key="x:1", now=DAY)["status"] == "sent"
    assert outbox.send(p["id"], "Tai chi starts soon.", kind="nudge", dedupe_key="x:1", now=DAY)["status"] == "duplicate"
    assert "Tai chi starts soon." in memory.context(p["id"])  # so a reply of "yes I'll go" makes sense


def test_a_nudge_tells_who_is_going_only_to_members_who_have_not_answered_once_and_never_in_quiet_hours(pushes, monkeypatch):
    monkeypatch.setenv("WISDOM_QUIET", "00:00-00:00")  # no quiet hours, so the test does not depend on the clock
    lead, going, silent, other = person("Rajan Pillai"), person("Meena Iyer"), person("Ravi Kumar"), person("Priya Nair")
    cid = client.post("/v1/communities", json={"name": f"Tai Chi Friends {uuid.uuid4().hex[:4]}"}, headers=lead["h"]).json()["id"]
    with engine().begin() as conn:
        for u in (going, silent):
            conn.execute(text("insert into memberships (community_id, user_id) values (:c, :u)"), {"c": cid, "u": u["id"]})
        conn.execute(text("insert into activities (community_id, organiser_id, title, location, starts_at) values (:c, :o, 'Morning tai chi', 'AMK Ave 3 park', now() + interval '45 minutes')"), {"c": cid, "o": lead["id"]})
    for u in (going, silent, other):
        link(u, "telegram", f"tg-{u['id'][:6]}")
    assert skill(going, "gathering_going", title="tai chi", going=True)["going"] is True
    n = nudges.run_once()
    assert n == 1  # only the member who has not answered; the leader organises; the going member already said yes; the outsider is not in the group
    body = [b for ch, addr, b in pushes if addr == f"tg-{silent['id'][:6]}"][-1]
    assert "Morning tai chi" in body and "AMK Ave 3 park" in body and "1 going, including Meena" in body and "I'm going to Morning tai chi" in body
    assert nudges.run_once() == 0  # one nudge per gathering


def test_an_introduction_request_reaches_the_mentor_through_the_outbox(monkeypatch):
    monkeypatch.setenv("WISDOM_QUIET", "00:00-00:00")
    mentor, learner = person("Kavita Rao"), person("Zara Khan")
    with engine().begin() as conn:
        conn.execute(text("update users set age_band = '40to59' where id in (:a, :b)"), {"a": mentor["id"], "b": learner["id"]})
    oid = client.post("/v1/wisdom/offers", json={"title": "Interview practice"}, headers=mentor["h"]).json()["id"]
    assert client.post(f"/v1/wisdom/offers/{oid}/ask", json={}, headers=learner["h"]).status_code == 201
    box = client.get("/v1/notifications", headers=mentor["h"]).json()
    assert any("Zara would like your guidance" in n["body"] for n in box["notifications"]) and box["unread"] == 1
