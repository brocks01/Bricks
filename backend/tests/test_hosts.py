"""Hosts list their own opportunities (Marketplace): who works on a host, and what only they may do there —
members only, editors cannot add members, never another host's, importing a community is idempotent,
and the host's own people make, edit and cancel their opportunities (the same fields as the platform admin's form)."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app

client = TestClient(app)
EMAILS: list[str] = []
UTC = timezone.utc
TAG = uuid.uuid4().hex[:6]


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        conn.execute(text("delete from market_events where title like :t"), {"t": f"HM{TAG}%"})
        conn.execute(text("delete from recurrences where template->>'title' like :t"), {"t": f"HM{TAG}%"})
        conn.execute(text("delete from communities where name like :t"), {"t": f"HM{TAG}%"})
        conn.execute(text("delete from hosts where name like :t"), {"t": f"HM{TAG}%"})
        for e in EMAILS:
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person(name="Rajan Pillai", band="60plus", admin=False) -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    h = {"Authorization": f"Bearer {s['access_token']}"}
    client.patch("/v1/me", json={"display_name": name, "age_band": band}, headers=h)
    if admin:
        with engine().begin() as conn:
            conn.execute(text("update users set is_platform_admin = true where id = :u"), {"u": s["user"]["id"]})
    return {"h": h, "id": s["user"]["id"], "email": email}


def skill(p, name, /, **args):
    return client.post(f"/v1/skills/{name}", json={"args": args}, headers=p["h"]).json()


def host(admin, name="Ang Mo Kio AAC", kind="aac", area="Ang Mo Kio") -> str:
    return client.post("/v1/hosts", json={"name": f"HM{TAG} {name}", "kind": kind, "area_name": area}, headers=admin["h"]).json()["id"]


def tomorrow(hh=9) -> datetime:
    local = datetime.now(UTC) + timedelta(hours=8) + timedelta(days=1)
    return local.replace(hour=hh, minute=0, second=0, microsecond=0) - timedelta(hours=8)


def event_body(hid, title="Saturday market", **more) -> dict:
    return {"title": f"HM{TAG} {title}", "venue_name": "Tampines Hub", "starts_at": tomorrow().isoformat(), "host_id": hid,
            "kind": "market_day", "intents": ["earn", "enjoy"], "area_name": "Tampines", **more}


def test_members_only_owners_and_editors_make_edit_and_cancel_their_own_hosts_opportunities():
    admin, owner, editor, stranger = person("Platform Admin", admin=True), person("Meena Iyer"), person("Ravi Kumar"), person("Sunita Devi")
    hid = host(admin, "Tampines Hub", kind="mall")
    # a platform admin adds the first owner by email; the owner adds an editor
    assert client.post(f"/v1/hosts/{hid}/members", json={"email": owner["email"], "role": "owner"}, headers=admin["h"]).status_code == 201
    assert client.post(f"/v1/hosts/{hid}/members", json={"email": editor["email"], "role": "editor"}, headers=owner["h"]).status_code == 201
    # nobody else may even look
    for path in (f"/v1/hosts/{hid}/events", f"/v1/hosts/{hid}/members"):
        refused = client.get(path, headers=stranger["h"])
        assert refused.status_code == 403 and refused.json()["detail"]["code"] == "not_member"
    assert client.post(f"/v1/hosts/{hid}/events", json=event_body(hid), headers=stranger["h"]).status_code == 403
    # an editor makes one: same fields and validation as the platform admin's form
    made = client.post(f"/v1/hosts/{hid}/events", json=event_body(hid), headers=editor["h"])
    assert made.status_code == 201 and made.json()["created"] is True
    assert client.post(f"/v1/hosts/{hid}/events", json=event_body(hid, intents=["steal"]), headers=owner["h"]).status_code == 422
    listed = client.get(f"/v1/hosts/{hid}/events", headers=owner["h"]).json()["events"]
    assert len(listed) == 1 and listed[0]["going_count"] == 0 and listed[0]["stalls_left"] == listed[0]["stalls_total"]
    eid = listed[0]["id"]
    # an editor edits it, the stranger may not touch it
    assert client.patch(f"/v1/hosts/{hid}/events/{eid}", json={"title": f"HM{TAG} Saturday market (edited)"}, headers=editor["h"]).json()["updated"] is True
    assert client.patch(f"/v1/hosts/{hid}/events/{eid}", json={"title": "Nope"}, headers=stranger["h"]).status_code == 403
    row = client.get(f"/v1/hosts/{hid}/events", headers=owner["h"]).json()["events"][0]
    assert row["title"].endswith("(edited)")
    # and cancels it: it stops being shown to people
    assert client.post(f"/v1/hosts/{hid}/events/{eid}/cancel", headers=owner["h"]).json() == {"cancelled": True}
    assert client.get(f"/v1/hosts/{hid}/events", headers=owner["h"]).json()["events"] == []
    # a member sees their host in "My host"; a stranger sees nothing
    assert [h["role"] for h in client.get("/v1/hosts/mine", headers=owner["h"]).json()["hosts"]] == ["owner"]
    assert client.get("/v1/hosts/mine", headers=stranger["h"]).json()["hosts"] == []


def test_editors_cannot_add_members_and_only_an_admin_adds_the_first_owner():
    admin, owner, editor, friend = person("Platform Admin", admin=True), person("Meena Iyer"), person("Ravi Kumar"), person("Asha Rao")
    hid = host(admin, "Bishan AAC")
    client.post(f"/v1/hosts/{hid}/members", json={"email": owner["email"], "role": "owner"}, headers=admin["h"])
    client.post(f"/v1/hosts/{hid}/members", json={"email": editor["email"], "role": "editor"}, headers=owner["h"])
    refused = client.post(f"/v1/hosts/{hid}/members", json={"email": friend["email"], "role": "editor"}, headers=editor["h"])
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == "not_allowed"
    # an owner may never promote someone above themselves: only a platform admin adds owners
    own = client.post(f"/v1/hosts/{hid}/members", json={"email": friend["email"], "role": "owner"}, headers=owner["h"])
    assert own.status_code == 403 and own.json()["detail"]["code"] == "only_admin_adds_owners"
    assert client.post(f"/v1/hosts/{hid}/members", json={"email": friend["email"], "role": "owner"}, headers=admin["h"]).status_code == 201
    assert client.post(f"/v1/hosts/{hid}/members", json={"email": friend["email"], "role": "editor"}, headers=admin["h"]).status_code == 409  # already there
    assert client.post(f"/v1/hosts/{hid}/members", json={"email": "nobody@example.com", "role": "editor"}, headers=admin["h"]).status_code == 404
    names = [m["name"] for m in client.get(f"/v1/hosts/{hid}/members", headers=owner["h"]).json()["members"]]
    assert names == ["Asha Rao", "Meena Iyer", "Ravi Kumar"]  # owners first, then the editor


def test_cross_host_is_refused_and_importing_a_community_is_idempotent():
    admin, member, stranger = person("Platform Admin", admin=True), person("Meena Iyer"), person("Ravi Kumar")
    a, b = host(admin, "Tampines Hub", kind="mall"), host(admin, "Bishan AAC")
    client.post(f"/v1/hosts/{a}/members", json={"email": member["email"], "role": "owner"}, headers=admin["h"])
    # making an opportunity at the other host is refused
    assert client.post(f"/v1/hosts/{b}/events", json=event_body(b), headers=member["h"]).status_code == 403
    # and the other host's event does not exist for this host: 404, never a edit or cancel
    theirs = client.post(f"/v1/hosts/{b}/events", json=event_body(b), headers=admin["h"]).json()["id"]
    assert client.patch(f"/v1/hosts/{a}/events/{theirs}", json={"title": "Nope"}, headers=member["h"]).status_code == 404
    assert client.post(f"/v1/hosts/{a}/events/{theirs}/cancel", headers=member["h"]).status_code == 404
    # a community the host already runs is imported under the host, once: the same reference updates it
    body = {"host_id": a, "external_ref": "hm-tai-chi", "name": f"HM{TAG} Tai chi at AMK", "description": "Mornings at the centre", "area_name": "Ang Mo Kio", "circle": "interest"}
    first = client.post(f"/v1/hosts/{a}/communities", json=body, headers=member["h"])
    assert first.status_code == 201 and first.json()["created"] is True
    again = client.post(f"/v1/hosts/{a}/communities", json={**body, "description": "Mornings and evenings"}, headers=member["h"])
    assert again.json() == {"id": first.json()["id"], "created": False}
    found = client.get("/v1/communities/explore", params={"q": f"HM{TAG} Tai chi"}, headers=member["h"]).json()["communities"]
    assert len(found) == 1 and found[0]["source"] == "imported" and found[0]["description"] == "Mornings and evenings"
    # strangers may not import into a host, and a reference is needed
    assert client.post(f"/v1/hosts/{a}/communities", json=body, headers=stranger["h"]).status_code == 403
    assert client.post(f"/v1/hosts/{a}/communities", json={"name": f"HM{TAG} no ref"}, headers=member["h"]).status_code == 422


def test_my_host_events_skill_and_the_admins_form_for_any_host():
    admin, member = person("Platform Admin", admin=True), person("Meena Iyer")
    hid = host(admin, "Tampines Hub", kind="mall")
    client.post(f"/v1/hosts/{hid}/members", json={"email": member["email"], "role": "owner"}, headers=admin["h"])
    client.post(f"/v1/hosts/{hid}/events", json=event_body(hid), headers=member["h"])
    said = skill(member, "my_host_events")["hosts"]
    assert len(said) == 1 and said[0]["host"] == f"HM{TAG} Tampines Hub" and said[0]["role"] == "owner"
    assert said[0]["coming_up"][0]["title"].startswith(f"HM{TAG}") and said[0]["coming_up"][0]["stalls_left"] == 12
    assert skill(person("Sunita Devi"), "my_host_events")["hosts"] == []
    # a platform admin who is not a member may still use the same form for any host (the app's "make a market day" form)
    assert client.post(f"/v1/hosts/{hid}/events", json=event_body(hid, title="Admin market day"), headers=admin["h"]).status_code == 201
    mine = client.get("/v1/hosts/mine", headers=admin["h"]).json()["hosts"]
    assert hid in [h["id"] for h in mine] and {h["role"] for h in mine} == {"admin"}


def test_a_repeating_opportunity_can_be_stopped_by_a_host_member():
    admin, owner = person("Platform Admin", admin=True), person("Meena Iyer")
    hid = host(admin, "Bishan AAC")
    client.post(f"/v1/hosts/{hid}/members", json={"email": owner["email"], "role": "owner"}, headers=admin["h"])
    made = client.post(f"/v1/hosts/{hid}/events", json=event_body(hid, title="weekly market", repeat="weekly"), headers=owner["h"])
    assert made.status_code == 201 and made.json()["made"] >= 1
    listed = client.get(f"/v1/hosts/{hid}/events", headers=owner["h"]).json()["events"]
    assert listed[0]["repeat"] == "weekly" and len(listed) >= 1
    ended = client.post(f"/v1/hosts/{hid}/events/{listed[0]['id']}/end-series", headers=owner["h"])
    assert ended.status_code == 200 and ended.json()["ended"] is True
    assert client.get(f"/v1/hosts/{hid}/events", headers=owner["h"]).json()["events"] == []
