"""The owner's new onboarding steps: the interests step (fixed keys, on the account, readable from GET /v1/me and GET /v1/profile),
the ten-second voice intro (a field on the account, sound accepted by the media module), the daily check-in switch's state,
the demo sign-in code flag, and taking an optional answer back off. Every part stays optional and skippable."""
import uuid
from datetime import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.media import service as media

client = TestClient(app)
EMAILS: list[str] = []
TAG = uuid.uuid4().hex[:6]


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        conn.execute(text("delete from media_assets where url like :u"), {"u": f"%{TAG}%"})
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person():
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    return s["user"]["id"], {"Authorization": f"Bearer {s['access_token']}"}


def put(h, section, **answers):
    return client.put(f"/v1/onboarding/{section}", json={"answers": answers}, headers=h)


# ---------- the interests step, right after "What you want here" ----------
def test_the_interests_step_comes_after_what_you_want_and_saves_to_the_account():
    uid, h = person()
    put(h, "basics", display_name="Lakshmi Nair", language="en", age_band="60plus", country="SG")
    assert client.get("/v1/onboarding", headers=h).json()["next"]["id"] == "purpose"
    put(h, "purpose", roles=["connect"])
    nxt = client.get("/v1/onboarding", headers=h).json()["next"]
    assert nxt["id"] == "interests" and nxt["required"] is False  # its own step, and skippable
    assert put(h, "interests", interests=["walking", "music", "klingon"]).json()["detail"]["code"] == "bad_answer"  # only the eight fixed keys
    assert put(h, "interests", hobbies=["chess"]).json()["detail"]["code"] == "unknown_question"
    assert put(h, "interests", interests=["walking", "chess", "gardening"]).status_code == 200
    # readable from GET /v1/me and GET /v1/profile, in the same fixed keys (Communities and Marketplace read them there)
    assert client.get("/v1/me", headers=h).json()["interests"] == ["walking", "chess", "gardening"]
    assert client.get("/v1/profile", headers=h).json()["interests"] == ["walking", "chess", "gardening"]
    # the older rhythm question is untouched: free text, its own section
    rhythm = next(s for s in client.get("/v1/onboarding", headers=h).json()["sections"] if s["id"] == "rhythm")
    assert "interests" in [q["key"] for q in rhythm["questions"]]
    # skipped in one tap: the step is left behind and nothing about finishing changes
    st = client.post("/v1/onboarding/interests/skip", headers=h).json()
    assert next(s for s in st["sections"] if s["id"] == "interests")["skipped"] is True
    assert st["next"]["id"] == "consent"
    assert client.post("/v1/onboarding/consent/skip", headers=h).json()["detail"]["code"] == "cannot_skip"  # the needed parts still stand


def test_taking_an_optional_answer_back_off_sends_null_and_the_default_returns():
    uid, h = person()
    assert put(h, "channels", quiet_from="21:30", quiet_to="07:00").status_code == 200
    with engine().connect() as conn:
        from app.modules.onboarding import service

        assert service.quiet_hours(conn, uid) == (time(21, 30), time(7, 0))
    cleared = put(h, "channels", quiet_from=None, quiet_to=None)
    assert cleared.status_code == 200
    with engine().connect() as conn:
        assert service.quiet_hours(conn, uid) is None  # back to the WISDOM_QUIET default
    assert put(h, "consent", privacy=None).json()["detail"]["code"] == "bad_answer"  # a NEEDED answer never clears


# ---------- the ten-second voice intro ----------
def test_the_voice_intro_address_lives_on_the_account_and_must_be_https():
    uid, h = person()
    assert client.get("/v1/me", headers=h).json()["voice_intro_url"] is None
    url = f"https://res.cloudinary.com/demo/video/upload/{TAG}/voice.m4a"
    assert client.patch("/v1/me", json={"voice_intro_url": url}, headers=h).json()["voice_intro_url"] == url
    assert client.get("/v1/me", headers=h).json()["voice_intro_url"] == url
    assert client.get("/v1/profile", headers=h).json()["voice_intro"] == url
    bad = client.patch("/v1/me", json={"voice_intro_url": "http://someone.example/clip.m4a"}, headers=h)
    assert bad.status_code == 422  # only https, and never another person's address scheme
    assert client.patch("/v1/me", json={"voice_intro_url": None}, headers=h).json()["voice_intro_url"] is None


def test_the_media_module_accepts_real_sound_and_refuses_it_without_cloudinary(monkeypatch):
    # what the phone records (m4a) and what the browser records (webm), read from the bytes themselves
    m4a = b"\x00\x00\x00\x20ftypM4A " + b"\x00" * 32
    webm = b"\x1a\x45\xdf\xa3" + b"\x00" * 32
    assert media.sniff_audio(m4a) == "m4a" and media.sniff_audio(webm) == "webm"
    assert media.sniff_audio(b"OggS" + b"\x00" * 32) == "ogg"
    assert media.sniff_audio(b"RIFF\x00\x00\x00\x00WAVE" + b"\x00" * 8) == "wav"
    assert media.sniff_audio(b"ID3\x04" + b"\x00" * 32) == "mp3"
    assert media.sniff_audio(b"\xff\xd8\xff" + b"\x00" * 32) is None  # a picture is not a sound
    assert media.sniff(m4a) is None

    _, h = person()
    monkeypatch.setattr(media, "_settings", lambda: None)  # no Cloudinary configured
    off = client.post("/v1/media/upload", files={"file": ("intro.m4a", m4a, "audio/mp4")}, data={"kind": "voice_intro"}, headers=h)
    assert off.status_code == 503 and off.json()["detail"]["code"] == "media_off"  # the app says plainly it could not be saved now

    sent = {}

    class _Res:
        status_code = 200

        def json(self):
            return {"secure_url": f"http://res.cloudinary.com/demo/{TAG}/voice.m4a", "public_id": f"{TAG}/voice", "bytes": 4096}

    def _post(url, **kwargs):
        sent["url"] = url
        return _Res()

    monkeypatch.setattr(media, "_settings", lambda: {"cloud": "demo", "key": "k", "secret": "s"})
    monkeypatch.setattr(media.httpx, "post", _post)
    ok = client.post("/v1/media/upload", files={"file": ("intro.m4a", m4a, "audio/mp4")}, data={"kind": "voice_intro"}, headers=h)
    assert ok.status_code == 200 and ok.json()["url"].startswith("https://") and ok.json()["kind"] == "voice_intro"
    assert sent["url"].endswith("/video/upload")  # Cloudinary keeps sound under its video resource type
    bad = client.post("/v1/media/upload", files={"file": ("intro.m4a", m4a, "audio/mp4")}, data={"kind": "avatar"}, headers=h)
    assert bad.status_code == 415  # a sound is not an avatar


# ---------- the daily check-in switch can show where it stands ----------
def test_the_checkin_state_read_and_the_switch_through_the_skills():
    uid, h = person()
    off = client.get("/v1/onboarding/checkin", headers=h).json()
    assert off == {"enabled": False, "time": None, "family_notify": False}
    from app.modules.skills import registry

    on = registry.run_for_user(uid, "set_daily_checkin", {"time": "09:30", "family_notify": True, "confirmed": True})
    assert on["daily_checkin"] == "on" and on["at"] == "09:30"
    got = client.get("/v1/onboarding/checkin", headers=h).json()
    assert got == {"enabled": True, "time": "09:30", "family_notify": True}
    assert registry.run_for_user(uid, "stop_daily_checkin", {})["daily_checkin"] == "off"
    assert client.get("/v1/onboarding/checkin", headers=h).json()["enabled"] is False


# ---------- the demo sign-in code ----------
def test_the_demo_flag_shows_the_code_even_through_a_tunnel_and_off_keeps_it_hidden(monkeypatch):
    tunnel = {"x-forwarded-for": "203.0.113.9"}
    hidden, h1 = person()  # a fresh email each time: the per-address rate limit is untouched
    monkeypatch.setenv("DEMO_SIGNIN_OTP", "on")
    e2 = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(e2)
    shown = client.post("/v1/auth/request-code", json={"email": e2}, headers=tunnel).json()
    assert shown["sent"] is True and len(shown["dev_code"]) == 6  # on a demo deployment the screen shows the code
    monkeypatch.delenv("DEMO_SIGNIN_OTP")
    e3 = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(e3)
    off = client.post("/v1/auth/request-code", json={"email": e3}, headers=tunnel).json()
    assert off["sent"] is True and off["dev_code"] is None  # default: a public caller never sees it
