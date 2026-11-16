"""Voice notes: a person can talk instead of typing, on Telegram and on WhatsApp or SMS.
Everything here is mocked - no network call is ever made. The transcript walks the same road as
typed text (the same guard, the same commands, the same agent), and a note that cannot be heard
is met with one kind line asking to say it again or type it."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.channels import core, router as channels_router, telegram
from app.modules.channels import transcribe

client = TestClient(app)
EMAILS: list[str] = []
NUMBERS: list[str] = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})
        for n in NUMBERS:
            conn.execute(text("delete from channel_links where external_id = :n"), {"n": n})


def person() -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"]}


class FakeR:
    """The part of an httpx.Response that transcribe() uses."""

    def __init__(self, status: int = 200, text_out: str = ""):
        self.status_code = status
        self._text = text_out

    def raise_for_status(self):
        if self.status_code >= 400:
            import httpx

            raise httpx.HTTPStatusError(str(self.status_code), request=None, response=None)

    def json(self):
        return {"candidates": [{"content": {"parts": [{"text": self._text}]}}]}


def test_the_listener_writes_down_exactly_what_was_said(monkeypatch):
    seen = {}

    def fake_post(model, body):
        seen["model"], seen["body"] = model, body
        return FakeR(200, "  मैं आज सुबह टहल रहा था  ")

    monkeypatch.setattr(transcribe, "_post", fake_post)
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    out = transcribe.transcribe(b"RIFF-fake-audio", "audio/ogg")
    assert out == "मैं आज सुबह टहल रहा था"  # trimmed, exact words, the speaker's language
    assert "no commentary" in seen["body"]["contents"][0]["parts"][0]["text"]
    assert seen["body"]["contents"][0]["parts"][1]["inlineData"] == {"mimeType": "audio/ogg", "data": "UklGRi1mYWtlLWF1ZGlv"}
    assert "gemini" in seen["model"]


def test_one_busy_model_never_silences_the_listener(monkeypatch):
    tried = []

    def fake_post(model, body):
        tried.append(model)
        return FakeR(500) if len(tried) == 1 else FakeR(200, "I walked this morning")

    monkeypatch.setattr(transcribe, "_post", fake_post)
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    assert transcribe.transcribe(b"audio") == "I walked this morning"
    assert len(tried) == 2


def test_without_a_key_or_without_audio_nobody_is_called(monkeypatch):
    monkeypatch.setattr(transcribe, "_post", lambda *a: (_ for _ in ()).throw(AssertionError("must not be called")))
    monkeypatch.setenv("GEMINI_API_KEY", "")
    assert transcribe.transcribe(b"audio") is None
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    assert transcribe.transcribe(b"") is None


def test_a_telegram_voice_note_is_answered_like_typed_text(monkeypatch):
    p, c = person(), str(uuid.uuid4().int % 10**10)
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "")
    core.handle("telegram", c, f"/start {core.new_link_code(p['id'])['code']}")
    sent, heard = [], []

    monkeypatch.setattr(telegram, "_download", lambda file_id: (b"RIFF-fake-audio", "audio/ogg"))
    monkeypatch.setattr(transcribe, "transcribe", lambda data, mime="audio/ogg": (heard.append((data, mime)), "today")[1])
    monkeypatch.setattr(telegram, "send", lambda chat_id, body: sent.append(body) or True)
    telegram.handle_update({"message": {"chat": {"id": c, "type": "private"},
                                         "voice": {"duration": 9, "file_size": 9000, "file_id": "F1", "mime_type": "audio/ogg"}}})
    assert heard == [(b"RIFF-fake-audio", "audio/ogg")]
    assert len(sent) == 1 and "Did you move today" in sent[0]  # the transcript ran the same brain as typed text


def test_a_note_that_is_too_long_or_too_big_is_not_even_listened_to(monkeypatch):
    sent, downloads = [], []

    monkeypatch.setattr(telegram, "_download", lambda file_id: downloads.append(file_id))
    monkeypatch.setattr(telegram, "send", lambda chat_id, body: sent.append(body) or True)
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "t")
    for m in ({"duration": 121, "file_size": 1000, "file_id": "F1"}, {"duration": 10, "file_size": 5 * 1024 * 1024 + 1, "file_id": "F2"},
              {"duration": 10, "file_size": 1000, "file_id": "F3"}):  # the last one: the file does not come down
        telegram.handle_update({"message": {"chat": {"id": 1, "type": "private"}, "voice": m}})
    assert downloads == ["F3"]  # only the third note reached the download at all
    assert all(transcribe.CANNOT_HEAR in s for s in sent)


def test_an_unreadable_note_gets_one_kind_line(monkeypatch):
    sent = []
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "t")
    monkeypatch.setattr(telegram, "_download", lambda file_id: (b"audio", "audio/ogg"))
    monkeypatch.setattr(transcribe, "transcribe", lambda data, mime="audio/ogg": None)  # the listener heard nothing it could use
    monkeypatch.setattr(telegram, "send", lambda chat_id, body: sent.append(body) or True)
    telegram.handle_update({"message": {"chat": {"id": 1, "type": "private"}, "audio": {"duration": 5, "file_size": 500, "file_id": "F1"}}})
    assert sent == [transcribe.CANNOT_HEAR]


def test_a_whatsapp_voice_note_walks_the_same_road(monkeypatch):
    monkeypatch.setenv("VOICE_PROVIDER", "mock")
    fetched = []

    def fake_get(url, auth=None, timeout=None):
        fetched.append((url, auth))
        return type("R", (), {"status_code": 200, "content": b"RIFF-fake-audio"})()

    monkeypatch.setattr(channels_router.httpx, "get", fake_get)
    monkeypatch.setattr(transcribe, "transcribe", lambda data, mime="audio/ogg": "today")
    monkeypatch.setenv("TWILIO_ACCOUNT_SID", "SID")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "TOKEN")
    said = channels_router._voice_note({"MediaUrl0": "https://api.twilio.com/fake.ogg", "MediaContentType0": "audio/ogg"})
    assert said == "today"
    assert fetched[0][1] == ("SID", "TOKEN")  # Twilio's files sit behind basic auth

    p, n = person(), "+659000" + uuid.uuid4().hex[:4]
    NUMBERS.append(n)
    client.post("/v1/channels/twilio/whatsapp", data={"From": f"whatsapp:{n}", "Body": core.new_link_code(p["id"], "whatsapp")["code"]})
    r = client.post("/v1/channels/twilio/whatsapp", data={"From": f"whatsapp:{n}", "NumMedia": "1",
                                                          "MediaContentType0": "audio/ogg", "MediaUrl0": "https://api.twilio.com/fake.ogg"})
    assert r.status_code == 200 and "Did you move today" in r.text  # the transcript ran the same brain


def test_a_whatsapp_note_that_cannot_be_heard_gets_one_kind_line(monkeypatch):
    monkeypatch.setenv("VOICE_PROVIDER", "mock")
    monkeypatch.setattr(channels_router, "_voice_note", lambda params: "")  # the file came down but nothing usable was heard
    n = "+659000" + uuid.uuid4().hex[:4]
    NUMBERS.append(n)
    r = client.post("/v1/channels/twilio/whatsapp", data={"From": f"whatsapp:{n}", "NumMedia": "1",
                                                          "MediaContentType0": "audio/ogg", "MediaUrl0": "https://api.twilio.com/fake.ogg"})
    assert r.status_code == 200 and transcribe.CANNOT_HEAR in r.text
    r2 = client.post("/v1/channels/twilio/sms", data={"From": n, "NumMedia": "1", "MediaContentType0": "image/jpeg", "MediaUrl0": "https://api.twilio.com/f.jpg"})
    assert transcribe.CANNOT_HEAR in r2.text  # a photo with nothing typed: we cannot listen to it
    r3 = client.post("/v1/channels/twilio/sms", data={"From": n, "NumMedia": "1", "MediaContentType0": "image/jpeg", "Body": "hello"})
    assert "Connect" in r3.text or "Wisdom" in r3.text  # but typed words next to a photo still count
