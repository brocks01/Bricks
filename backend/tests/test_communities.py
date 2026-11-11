"""Communities and media tests, against the real local database (own throw-away users and communities, removed afterwards) and a fake Cloudinary."""
import uuid

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.media import service as media

client = TestClient(app)
EMAILS: list[str] = []
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64


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


def make(p: dict, **kw) -> str:
    r = client.post("/v1/communities", json={"name": "Test Heights", **kw}, headers=p["h"])
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_a_new_person_has_no_communities():
    assert client.get("/v1/communities/mine", headers=person()["h"]).json() == {"communities": []}


def test_create_makes_the_creator_the_lead():
    p = person()
    cid = make(p, kind="club", description="Hello")
    mine = client.get("/v1/communities/mine", headers=p["h"]).json()["communities"]
    assert [c["id"] for c in mine] == [cid] and mine[0]["my_role"] == "Community Lead" and mine[0]["member_count"] == 1
    d = client.get(f"/v1/communities/{cid}", headers=p["h"]).json()
    assert d["can_manage"] is True and d["community"]["invite_code"] and d["members"][0]["role"] == "Community Lead"


def test_only_members_can_see_a_community():
    owner, other = person(), person()
    cid = make(owner)
    r = client.get(f"/v1/communities/{cid}", headers=other["h"])
    assert r.status_code == 403 and r.json()["detail"]["code"] == "not_a_member"
    assert client.get("/v1/communities/not-a-uuid", headers=other["h"]).status_code == 404


def test_join_by_code_and_the_code_stays_hidden_from_plain_members():
    owner, joiner = person(), person()
    cid = make(owner)
    code = client.get(f"/v1/communities/{cid}", headers=owner["h"]).json()["community"]["invite_code"]
    assert client.post("/v1/communities/join", json={"code": "NOPE-NOPE"}, headers=joiner["h"]).status_code == 404
    assert client.post("/v1/communities/join", json={"code": code.lower()}, headers=joiner["h"]).json()["id"] == cid  # case-insensitive
    d = client.get(f"/v1/communities/{cid}", headers=joiner["h"]).json()
    assert d["my_role"] == "Member" and d["can_manage"] is False and d["community"]["invite_code"] is None and d["community"]["member_count"] == 2


def test_going_to_an_activity_respects_capacity():
    owner, a, b = person(), person(), person()
    cid = make(owner)
    code = client.get(f"/v1/communities/{cid}", headers=owner["h"]).json()["community"]["invite_code"]
    for p in (a, b):
        client.post("/v1/communities/join", json={"code": code}, headers=p["h"])
    with engine().begin() as conn:
        aid = str(conn.execute(text("insert into activities (community_id, organiser_id, title, starts_at, capacity) values (:c, :o, 'Yoga', now() + interval '1 day', 1) returning id"),
                                {"c": cid, "o": owner["id"]}).one().id)
    assert client.post(f"/v1/communities/activities/{aid}/going", json={"going": True}, headers=a["h"]).json() == {"going": True, "going_count": 1}
    full = client.post(f"/v1/communities/activities/{aid}/going", json={"going": True}, headers=b["h"])
    assert full.status_code == 409 and full.json()["detail"]["code"] == "full"
    assert client.post(f"/v1/communities/activities/{aid}/going", json={"going": False}, headers=a["h"]).json()["going_count"] == 0
    d = client.get(f"/v1/communities/{cid}", headers=b["h"]).json()
    assert d["activities"][0]["title"] == "Yoga" and d["activities"][0]["i_going"] is False


def test_outsiders_cannot_say_they_are_going():
    owner, outsider = person(), person()
    cid = make(owner)
    with engine().begin() as conn:
        aid = str(conn.execute(text("insert into activities (community_id, title, starts_at) values (:c, 'Walk', now() + interval '1 day') returning id"), {"c": cid}).one().id)
    assert client.post(f"/v1/communities/activities/{aid}/going", json={"going": True}, headers=outsider["h"]).status_code == 403


# ---- media (fake Cloudinary) ----
@pytest.fixture
def cloud(monkeypatch):
    monkeypatch.setenv("CLOUDINARY_CLOUD_NAME", "democloud")
    monkeypatch.setenv("CLOUDINARY_API_KEY", "key123")
    monkeypatch.setenv("CLOUDINARY_API_SECRET", "secret456")
    sent = {}

    def fake_post(url, data=None, files=None, timeout=None):
        sent.update(url=url, data=data, files=files)
        return httpx.Response(200, json={"secure_url": "https://res.cloudinary.com/democloud/image/upload/v1/bricks/other/x.png", "public_id": "bricks/other/x", "bytes": 72, "width": 4, "height": 4},
                              request=httpx.Request("POST", url))

    monkeypatch.setattr(media.httpx, "post", fake_post)
    return sent


def upload(p, content=PNG, kind="other"):
    return client.post("/v1/media/upload", files={"file": ("a.png", content, "image/png")}, data={"kind": kind}, headers=p["h"])


def test_media_upload_signs_the_request_and_keeps_a_row(cloud):
    p = person()
    r = upload(p, kind="avatar")
    assert r.status_code == 200 and r.json()["url"].startswith("https://res.cloudinary.com/democloud/") and r.json()["kind"] == "avatar"
    assert cloud["data"]["api_key"] == "key123" and cloud["data"]["folder"] == "bricks/avatar" and "secret456" not in str(cloud["data"]) and len(cloud["data"]["signature"]) == 40
    with engine().connect() as conn:
        assert conn.execute(text("select count(*) from media_assets where owner_id = :o"), {"o": p["id"]}).scalar_one() == 1


def test_media_refuses_bad_files(cloud):
    p = person()
    assert upload(p, b"<html>not an image</html>").json()["detail"]["code"] == "not_an_image"
    assert upload(p, PNG + b"0" * (6 * 1024 * 1024)).status_code == 413
    assert upload(p, kind="nonsense").json()["detail"]["code"] == "bad_kind"
    assert client.post("/v1/media/upload", files={"file": ("a.png", PNG)}).status_code == 401


def test_media_is_off_without_settings(monkeypatch):
    for k in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "CLOUDINARY_URL"):
        monkeypatch.delenv(k, raising=False)
    r = upload(person())
    assert r.status_code == 503 and r.json()["detail"]["code"] == "media_off"


def test_cloudinary_url_form_is_understood(monkeypatch):
    for k in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("CLOUDINARY_URL", "cloudinary://k1:s1@mycloud")
    assert media._settings() == {"cloud": "mycloud", "key": "k1", "secret": "s1"}
