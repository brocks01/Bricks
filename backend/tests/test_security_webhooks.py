"""Security tests, part 3: the doors. A webhook is answered only with its secret or signature (Telegram
secret in the path, Twilio X-Twilio-Signature); the voice admin key guards the calling endpoints; media
uploads are images of a bounded size and never leak the upload secret; translation refuses batches that
are too large and originals the person may not read."""
import base64
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.voice import twilio as proto

client = TestClient(app)
EMAILS: list[str] = []
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64
TOKEN = "test-twilio-auth-token"


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from media_assets where owner_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from channel_links where user_id in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person(name="Door Person") -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    h = {"Authorization": f"Bearer {s['access_token']}"}
    client.patch("/v1/me", json={"display_name": name}, headers=h)
    return {"h": h, "id": s["user"]["id"]}


# ---- Telegram: the secret in the path is the whole lock ----
def test_the_telegram_webhook_needs_its_secret(monkeypatch):
    monkeypatch.delenv("TELEGRAM_WEBHOOK_SECRET", raising=False)
    assert client.post("/v1/channels/telegram/webhook/anything", json={"update_id": 1}).status_code == 404
    monkeypatch.setenv("TELEGRAM_WEBHOOK_SECRET", "s3cret")
    assert client.post("/v1/channels/telegram/webhook/wrong", json={"update_id": 1}).status_code == 404
    got: list = []
    import app.modules.channels.telegram as telegram

    monkeypatch.setattr(telegram, "handle_update", lambda u: got.append(u))
    assert client.post("/v1/channels/telegram/webhook/s3cret", json={"update_id": 1}).status_code == 200
    assert got == [{"update_id": 1}]


def test_a_link_code_is_only_for_a_known_channel():
    p = person()
    assert client.post("/v1/channels/pigeon/link-code", headers=p["h"]).status_code == 404
    r = client.post("/v1/channels/telegram/link-code", headers=p["h"])
    assert r.status_code == 200 and len(r.json()["code"]) == 8  # the person's own code, made for them


# ---- Twilio chat (WhatsApp and SMS): the request is signed ----
def _sig(path: str, params: dict, token: str = TOKEN, base: str = "http://testserver") -> str:
    """The X-Twilio-Signature the real provider would send for this request."""
    return proto.signature_for(token, base + path, params)


def test_the_twilio_chat_webhook_refuses_an_unsigned_or_forged_request(monkeypatch):
    monkeypatch.setenv("VOICE_PROVIDER", "twilio")
    monkeypatch.setenv("VOICE_PUBLIC_URL", "http://testserver")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", TOKEN)
    monkeypatch.setenv("WISDOM_OPEN_SIGNUP", "false")
    path, params = "/v1/channels/twilio/whatsapp", {"From": "whatsapp:+6591234567", "Body": "hello"}
    assert client.post(path, data=params).status_code == 403  # no signature at all
    assert client.post(path, data=params, headers={"x-twilio-signature": base64.b64encode(b"nope").decode()}).status_code == 403
    assert client.post(path, data={**params, "Body": "forged"}, headers={"x-twilio-signature": _sig(path, params)}).status_code == 403  # signed for other words
    r = client.post(path, data=params, headers={"x-twilio-signature": _sig(path, params)})
    assert r.status_code == 200 and "<Response>" in r.text  # signed: answered in TwiML


def test_a_signed_message_never_makes_an_account_when_sign_up_is_closed(monkeypatch):
    monkeypatch.setenv("VOICE_PROVIDER", "twilio")
    monkeypatch.setenv("VOICE_PUBLIC_URL", "http://testserver")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", TOKEN)
    monkeypatch.setenv("WISDOM_OPEN_SIGNUP", "false")
    path, params = "/v1/channels/twilio/sms", {"From": f"+659{uuid.uuid4().hex[0:8]}", "Body": "hello"}
    r = client.post(path, data=params, headers={"x-twilio-signature": _sig(path, params)})
    assert r.status_code == 200
    with engine().begin() as conn:
        before = conn.execute(text("select count(*) from users where email is null")).scalar_one()
    r2 = client.post(path, data={**params, "Body": "hello again"}, headers={"x-twilio-signature": _sig(path, {**params, "Body": "hello again"})})
    assert r2.status_code == 200
    with engine().begin() as conn:
        after = conn.execute(text("select count(*) from users where email is null")).scalar_one()
    assert after == before  # a stranger knocking on a closed door makes no account


# ---- the voice admin key ----
def test_voice_admin_endpoints_need_the_key(monkeypatch):
    monkeypatch.delenv("VOICE_ADMIN_KEY", raising=False)
    assert client.get("/v1/voice/overview").status_code == 503  # unset = the door is shut
    monkeypatch.setenv("VOICE_ADMIN_KEY", "k3y")
    assert client.get("/v1/voice/overview").status_code == 401
    assert client.get("/v1/voice/calls").status_code == 401
    assert client.post("/v1/voice/calls").status_code == 401
    ok = client.get("/v1/voice/overview", headers={"X-Voice-Admin-Key": "k3y"})
    assert ok.status_code == 200 and "_token" not in ok.text and "AUTH" not in str(ok.json().get("data", {}))


def test_the_voice_webhooks_check_the_signature_when_twilio_is_the_provider(monkeypatch):
    monkeypatch.setenv("VOICE_PROVIDER", "twilio")
    monkeypatch.setenv("VOICE_PUBLIC_URL", "http://testserver")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", TOKEN)
    for path in ("/twilio/voice", "/twilio/incoming", "/twilio/status"):
        assert client.post(path, data={"CallSid": "CA1", "From": "+6591234567"}).status_code == 403


# ---- media ----
def test_media_upload_needs_sign_in():
    assert client.post("/v1/media/upload", files={"file": ("a.png", PNG, "image/png")}).status_code == 401


def test_media_off_without_cloud_settings(monkeypatch):
    p = person()
    for k in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "CLOUDINARY_URL"):
        monkeypatch.delenv(k, raising=False)
    r = client.post("/v1/media/upload", files={"file": ("a.png", PNG, "image/png")}, headers=p["h"])
    assert r.status_code == 503 and r.json()["detail"]["code"] == "media_off"


def _cloud_on(monkeypatch):
    monkeypatch.setenv("CLOUDINARY_CLOUD_NAME", "cloud")
    monkeypatch.setenv("CLOUDINARY_API_KEY", "key")
    monkeypatch.setenv("CLOUDINARY_API_SECRET", "secret")


def test_media_upload_checks_kind_size_and_true_type(monkeypatch):
    p = person()
    _cloud_on(monkeypatch)
    assert client.post("/v1/media/upload", files={"file": ("a.png", PNG, "image/png")}, data={"kind": "not_a_kind"}, headers=p["h"]).status_code == 400
    assert client.post("/v1/media/upload", files={"file": ("a.png", b"x" * (5 * 1024 * 1024 + 1), "image/png")}, data={"kind": "avatar"}, headers=p["h"]).status_code == 413
    r = client.post("/v1/media/upload", files={"file": ("a.png", b"<html>not really</html>", "image/png")}, data={"kind": "avatar"}, headers=p["h"])
    assert r.status_code == 415  # the name says png; the bytes say no


def test_media_upload_answers_its_own_fields_never_the_secret(monkeypatch):
    p = person()
    _cloud_on(monkeypatch)
    import app.modules.media.service as media

    def fake_post(url, **kw):
        sent = str(kw.get("data", {})) + str(kw.get("files", {}))
        assert "secret" not in sent or "signature" in sent  # the secret itself never travels in the open body
        import httpx as _h

        return _h.Response(200, json={"secure_url": "https://res.cloudinary.com/demo/image/upload/v1/test.png", "public_id": "p1", "width": 1, "height": 1, "bytes": 70})

    monkeypatch.setattr(media.httpx, "post", fake_post)
    r = client.post("/v1/media/upload", files={"file": ("a.png", PNG, "image/png")}, data={"kind": "avatar"}, headers=p["h"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["url"].startswith("https://") and "secret" not in str(body) and "api_key" not in str(body)


# ---- translation ----
def test_translation_needs_a_target_language_it_offers():
    p = person()
    assert client.post("/v1/translate/text", json={"text": "hello", "target": "zz"}, headers=p["h"]).status_code == 422
    assert client.post("/v1/translate/text", json={"text": "x" * 4001, "target": "ms"}, headers=p["h"]).status_code == 422  # bounded input


def test_translation_refuses_a_batch_that_is_too_large():
    p = person()
    items = [{"type": "announcement", "id": str(uuid.uuid4()), "field": "title"} for _ in range(51)]
    r = client.post("/v1/translate/batch", json={"items": items, "target": "ms"}, headers=p["h"])
    assert r.status_code == 422


def test_a_translation_reaches_only_people_who_may_read_the_original():
    a, b = person("Ann Au"), person("Bee Outsider")
    cid = client.post("/v1/communities", json={"name": "Translation Gate Test"}, headers=a["h"]).json()["id"]
    with engine().begin() as conn:
        aid = conn.execute(text("insert into announcements (community_id, author_id, title, body) values (:c, :a, :t, :b) returning id"),
                           {"c": cid, "a": a["id"], "t": "Kopi morning", "b": "This Saturday at the void deck, everyone welcome."}).scalar_one()
    r = client.post("/v1/translate/batch", json={"items": [{"type": "announcement", "id": str(aid), "field": "title"}], "target": "ms"}, headers=b["h"])
    assert r.status_code == 403 and r.json()["detail"]["code"] == "not_readable"
    mine = client.post("/v1/translate/batch", json={"items": [{"type": "announcement", "id": str(aid), "field": "title"}], "target": "ms"}, headers=a["h"])
    assert mine.status_code == 200 and mine.json()["items"][0]["text"] == "Kopi morning"
    unknown = client.post("/v1/translate/batch", json={"items": [{"type": "announcement", "id": str(uuid.uuid4()), "field": "title"}], "target": "ms"}, headers=a["h"])
    assert unknown.status_code == 404
