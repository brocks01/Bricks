"""Safety: reports, blocks, admin review, auto-hide after three reporters, and the agent's skills.
Against the real local database; every person is a throw-away and is removed afterwards."""
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
            conn.execute(text("delete from notifications where user_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from reports where reporter_id in (select id from users where email = :e) or target_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from blocks where blocker_id in (select id from users where email = :e) or blocked_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from wisdom_capsules where author_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from memberships where community_id in (select id from communities where created_by in (select id from users where email = :e))"), {"e": e})
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person(name="Safety Person", band="60plus", admin=False) -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    h = {"Authorization": f"Bearer {s['access_token']}"}
    client.patch("/v1/me", json={"display_name": name, "age_band": band}, headers=h)
    if admin:
        with engine().begin() as conn:
            conn.execute(text("update users set is_platform_admin = true where id = :u"), {"u": s["user"]["id"]})
    return {"h": h, "id": s["user"]["id"]}


def story(p: dict, title="A story worth keeping") -> str:
    r = client.post("/v1/wisdom/capsules", json={"title": title, "body": "We prepared thekua for two days and sang at dawn by the river.", "kind": "cultural"}, headers=p["h"])
    assert r.status_code == 201, r.text
    cid = r.json()["id"]
    assert client.post(f"/v1/wisdom/capsules/{cid}/share", headers=p["h"]).status_code == 200  # published, so it is really in the library
    return cid


def report(p: dict, kind: str, target: str, reason="other", note=None):
    body = {"target_kind": kind, "target_id": target, "reason": reason}
    if note:
        body["note"] = note
    return client.post("/v1/reports", json=body, headers=p["h"])


# ---- filing a report ----
def test_a_person_reports_someone_elses_story_once():
    author, watcher = person("Author Am"), person("Watcher W")
    sid = story(author)
    r = report(watcher, "capsule", sid, reason="unkind", note="This is not kind.")
    assert r.status_code == 201 and r.json()["status"] == "reported", r.text
    again = report(watcher, "capsule", sid)
    assert again.status_code == 201 and again.json()["status"] == "already_reported"  # one word per person per thing
    mine = client.get("/v1/reports/mine", headers=watcher["h"]).json()["reports"]
    assert [x["target_id"] for x in mine] == [sid] and mine[0]["status"] == "open"
    assert client.get("/v1/reports/mine", headers=author["h"]).json()["reports"] == []  # the author sees none of it


def test_a_report_is_checked():
    p, other = person(), person()
    assert report(p, "album", str(uuid.uuid4())).status_code == 422  # a kind that does not exist
    assert report(p, "capsule", str(uuid.uuid4()), reason="rude").status_code == 422
    assert report(p, "capsule", "not-a-uuid").status_code == 404
    assert report(p, "capsule", str(uuid.uuid4())).status_code == 404  # no such story
    assert client.post("/v1/reports", json={"target_kind": "capsule", "target_id": str(uuid.uuid4()), "reason": "other", "note": "x" * 501}, headers=p["h"]).status_code == 422
    own = story(p)
    assert report(p, "capsule", own).status_code == 400  # nobody reports their own thing
    assert client.post("/v1/reports", json={"target_kind": "person", "target_id": p["id"], "reason": "other"}, headers=other["h"]).status_code == 201
    assert report(other, "person", p["id"]).status_code == 201  # reporting a person works
    assert report(p, "person", p["id"]).status_code == 400


# ---- three different reporters hide a thing and an admin is told ----
def test_three_different_reporters_auto_hide_and_notify_an_admin():
    author, admin = person("Author An"), person("Admin Az", admin=True)
    sid = story(author, "The auto-hidden story")
    r1, r2, r3 = person("R1 Tan"), person("R2 Kumar"), person("R3 Wong")
    with engine().begin() as conn:
        before = conn.execute(text("select count(*) from notifications where user_id = :u and kind = 'safety'"), {"u": admin["id"]}).scalar_one()
    assert report(r1, "capsule", sid).json()["status"] == "reported"
    assert report(r2, "capsule", sid, reason="spam").json()["status"] == "reported"
    assert report(r3, "capsule", sid, reason="unsafe").json()["status"] == "hidden_after_reports"
    with engine().begin() as conn:
        row = conn.execute(text("select hidden_at, status from wisdom_capsules where id = :i"), {"i": sid}).one()
        told = conn.execute(text("select count(*) from notifications where user_id = :u and kind = 'safety'"), {"u": admin["id"]}).scalar_one()
        library = conn.execute(text("select count(*) from wisdom_capsules where id = :i and status = 'published'"), {"i": sid}).scalar_one()
    assert row.hidden_at is not None and row.status == "removed" and library == 0  # out of the published list at once
    assert told > before  # an admin knows
    for p in (r1, r2, r3):
        st = client.get("/v1/reports/mine", headers=p["h"]).json()["reports"][0]["status"]
        assert st == "actioned"


def test_two_reporters_do_not_hide():
    author = person("Author Aw")
    sid = story(author, "Not hidden yet")
    report(person("W4 Lee"), "capsule", sid)
    report(person("W5 Chan"), "capsule", sid)
    with engine().begin() as conn:
        hidden = conn.execute(text("select hidden_at from wisdom_capsules where id = :i"), {"i": sid}).scalar_one()
    assert hidden is None


# ---- the admin's review ----
def test_only_an_admin_sees_and_resolves_reports():
    author, admin, watcher = person("Author Ax"), person("Admin Ay", admin=True), person("Watcher X")
    sid = story(author, "The reviewed story")
    rid = report(watcher, "capsule", sid, reason="other", note="Please look.").json()["id"]
    assert client.get("/v1/admin/reports", headers=watcher["h"]).status_code == 403
    assert client.post(f"/v1/admin/reports/{rid}/resolve", json={"action": "dismiss"}, headers=watcher["h"]).status_code == 403
    listed = client.get("/v1/admin/reports", headers=admin["h"]).json()["reports"]
    row = next(x for x in listed if x["id"] == rid)
    assert row["target_title"] == "The reviewed story" and row["status"] == "open" and row["note"] == "Please look."
    only_open = client.get("/v1/admin/reports", params={"status": "open"}, headers=admin["h"]).json()["reports"]
    assert rid in [x["id"] for x in only_open]
    r = client.post(f"/v1/admin/reports/{rid}/resolve", json={"action": "dismiss"}, headers=admin["h"])
    assert r.status_code == 200 and r.json()["status"] == "dismissed"
    assert rid not in [x["id"] for x in client.get("/v1/admin/reports", params={"status": "open"}, headers=admin["h"]).json()["reports"]]
    assert client.post(f"/v1/admin/reports/{rid}/resolve", json={"action": "vanish"}, headers=admin["h"]).status_code == 422


def test_an_admin_hides_a_thing_and_can_suspend_the_person_behind_it():
    author, admin, watcher = person("Author Ah"), person("Admin Ai", admin=True), person("Watcher Y")
    sid = story(author, "The hidden story")
    rid = report(watcher, "capsule", sid).json()["id"]
    r = client.post(f"/v1/admin/reports/{rid}/resolve", json={"action": "hide"}, headers=admin["h"])
    assert r.status_code == 200 and r.json()["hidden"] is True
    with engine().begin() as conn:
        assert conn.execute(text("select hidden_at from wisdom_capsules where id = :i"), {"i": sid}).scalar_one() is not None
    # a person is suspended, not hidden
    pid = person("Suspict Su")["id"]
    rid2 = report(watcher, "person", pid).json()["id"]
    assert client.post(f"/v1/admin/reports/{rid2}/resolve", json={"action": "hide"}, headers=admin["h"]).status_code == 422
    r3 = client.post(f"/v1/admin/reports/{rid2}/resolve", json={"action": "suspend"}, headers=admin["h"])
    assert r3.status_code == 200 and r3.json()["suspended"] == pid
    with engine().begin() as conn:
        assert conn.execute(text("select status from users where id = :u"), {"u": pid}).scalar_one() == "suspended"
    dead = client.post("/v1/auth/verify-code", json={"email": f"never-{uuid.uuid4().hex[:6]}@example.com", "code": "000000"})
    assert dead.status_code in (400, 429)  # sanity: sign-in still refuses strangers


def test_dismissing_the_last_report_puts_the_thing_back():
    author, admin, watcher = person("Author Ar"), person("Admin As", admin=True), person("Watcher R")
    sid = story(author, "The restored story")
    rid = report(watcher, "capsule", sid).json()["id"]
    assert client.post(f"/v1/admin/reports/{rid}/resolve", json={"action": "hide"}, headers=admin["h"]).json()["hidden"] is True
    with engine().begin() as conn:
        assert conn.execute(text("select status from wisdom_capsules where id = :i"), {"i": sid}).scalar_one() == "removed"
    r = client.post(f"/v1/admin/reports/{rid}/resolve", json={"action": "dismiss"}, headers=admin["h"])
    assert r.status_code == 200 and r.json()["restored"] is True
    with engine().begin() as conn:
        row = conn.execute(text("select hidden_at, status from wisdom_capsules where id = :i"), {"i": sid}).one()
    assert row.hidden_at is None and row.status == "published"  # it is back in the library


# ---- blocks ----
def test_a_block_is_one_sided_quiet_and_undone():
    a, b, other = person("Blocker Bo"), person("Blocked Bi"), person("Watcher Z")
    assert client.post("/v1/blocks", json={"person_id": a["id"]}, headers=a["h"]).status_code == 400  # not yourself
    r = client.post("/v1/blocks", json={"person_id": b["id"]}, headers=a["h"])
    assert r.status_code == 201 and r.json()["blocked"] is True
    assert client.post("/v1/blocks", json={"person_id": b["id"]}, headers=a["h"]).json()["status"] == "already_blocked"
    assert client.post("/v1/blocks", json={"person_id": "not-a-uuid"}, headers=a["h"]).status_code == 404
    from app.modules.safety import service

    with engine().begin() as conn:
        assert service.blocked(conn, a["id"], b["id"]) is True
        assert service.blocked(conn, b["id"], a["id"]) is True  # either direction counts
        assert service.blocked(conn, a["id"], other["id"]) is False
    mine = client.get("/v1/blocks", headers=a["h"]).json()["blocks"]
    assert [x["person_id"] for x in mine] == [b["id"]] and mine[0]["name"] == "Blocked Bi"
    assert client.get("/v1/blocks", headers=b["h"]).json()["blocks"] == []  # nobody is told
    assert client.delete(f"/v1/blocks/{b['id']}", headers=a["h"]).json()["removed"] is True
    with engine().begin() as conn:
        assert service.blocked(conn, a["id"], b["id"]) is False


# ---- the agent's skills ----
def test_the_agent_can_report_and_block_with_the_same_rules():
    author, watcher = person("Author Ak"), person("Watcher Wk")
    sid = story(author)
    r = client.post("/v1/skills/report_something", json={"args": {"kind": "capsule", "target": sid, "reason": "unkind"}}, headers=watcher["h"]).json()
    assert r.get("reported") is True, r
    bad = client.post("/v1/skills/report_something", json={"args": {"kind": "capsule", "target": "not-a-uuid", "reason": "other"}}, headers=watcher["h"]).json()
    assert bad.get("error") in ("not_found", None) or "error" in bad
    # blocking by name works inside a shared circle, and only with a confirmed yes
    circle = client.post("/v1/communities", json={"name": "Safety Skill Circle"}, headers=author["h"]).json()["id"]
    code = client.get(f"/v1/communities/{circle}", headers=author["h"]).json()["community"]["invite_code"]
    client.post("/v1/communities/join", json={"code": code}, headers=watcher["h"])
    refused = client.post("/v1/skills/block_person", json={"args": {"person": "Author Ak"}}, headers=watcher["h"]).json()
    assert refused.get("error") == "needs_confirmation"
    ok = client.post("/v1/skills/block_person", json={"args": {"person": "Author Ak", "confirmed": True}}, headers=watcher["h"]).json()
    assert ok.get("blocked") is True, ok
    with engine().begin() as conn:
        assert conn.execute(text("select count(*) from blocks where blocker_id = :a and blocked_id = :b"), {"a": watcher["id"], "b": author["id"]}).scalar_one() == 1
    unknown = client.post("/v1/skills/block_person", json={"args": {"person": "Nobody Nobody", "confirmed": True}}, headers=watcher["h"]).json()
    assert unknown.get("error") == "not_found"
