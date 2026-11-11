"""Translation tests: against the real local database (own throw-away people, communities and
announcements, removed afterwards) with a fake provider, so nothing here ever calls a real service."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.translation import providers, service

client = TestClient(app)
PEOPLE: list[str] = []
COMMUNITIES: list[str] = []
ANNOUNCEMENTS: list[str] = []

# The real provider list, captured before any test replaces it with a fake.
_REAL_CONFIGURED = providers.configured


class Fake:
    """Answers in the shape a provider must: same length, same order, markers copied across untouched."""

    name = "fake"
    pairs = None

    def __init__(self, target_tag: str = "xx", detect_lang: str = "hi"):
        self.translates = 0
        self.detects = 0
        self.target_tag = target_tag
        self.detect_lang = detect_lang

    def translate(self, texts, source, target):
        self.translates += 1
        return [f"[{self.target_tag}] {t}" for t in texts]

    def detect(self, texts):
        self.detects += 1
        return [self.detect_lang] * len(texts)


class Broken(Fake):
    def translate(self, texts, source, target):
        self.translates += 1
        raise providers.ProviderError("unreachable")

    def detect(self, texts):
        raise providers.ProviderError("unreachable")


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        # content_id is a uuid column, so the ids are cast before they are compared.
        conn.execute(text("delete from translations where content_id::text = any(:a)"), {"a": ANNOUNCEMENTS})
        conn.execute(text("delete from translation_usage where user_id in (select id from users where email like 'tr-%')"))
        for cid in COMMUNITIES:
            conn.execute(text("delete from announcements where community_id = :c"), {"c": cid})
            conn.execute(text("delete from activities where community_id = :c"), {"c": cid})
            conn.execute(text("delete from memberships where community_id = :c"), {"c": cid})
            conn.execute(text("delete from communities where id = :c"), {"c": cid})
        for e in PEOPLE:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


@pytest.fixture(autouse=True)
def no_real_provider(monkeypatch):
    """Every test gets a fake provider; nothing in this file may reach the network."""
    fake = Fake()
    monkeypatch.setattr(providers, "configured", lambda: [fake])
    return fake


def person(name: str = "Ankit Kumar") -> dict:
    email = f"tr-{uuid.uuid4().hex[:10]}@example.com"
    PEOPLE.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    client.patch("/v1/me", json={"display_name": name}, headers={"Authorization": f"Bearer {s['access_token']}"})
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"]}


def announcement(p: dict, body: str = "The garden is open on Sunday.", title: str = "Garden",
                 source_lang: str | None = "en") -> str:
    """A community of their own plus one announcement in it, so the membership check has something to say."""
    cid = client.post("/v1/communities", json={"name": f"Test Block {uuid.uuid4().hex[:6]}"}, headers=p["h"]).json()["id"]
    COMMUNITIES.append(cid)
    with engine().begin() as conn:
        aid = str(conn.execute(
            text("insert into announcements (community_id, author_id, title, body, source_lang) "
                 "values (:c, :a, :t, :b, :s) returning id"),
            {"c": cid, "a": p["id"], "t": title, "b": body, "s": source_lang},
        ).one().id)
    ANNOUNCEMENTS.append(aid)
    return aid


def ask(p: dict, aid: str, target: str = "hi", field: str = "body"):
    return client.post("/v1/translate/batch", json={"items": [{"type": "announcement", "id": aid, "field": field}],
                                                    "target": target}, headers=p["h"])


# --------------------------------------------------------------------------- what never moves
def test_split_keeps_every_character():
    long = ("The garden will be open on Sunday and everyone is welcome to come along and help. " * 9).strip()
    parts = service.split(long)
    assert len(parts) > 1 and "".join(parts) == long
    assert all(len(p) <= service.SENTENCE + 40 for p in parts) or len(long) < service.SENTENCE


def test_protect_wraps_what_must_not_move():
    body = "Come at 6:00 AM on Sun, 16 Nov to https://bricks.app/a and ping @ravi, 42 people, 62% \U0001f44d"
    masked, slots = service.protect(body, ("Ravi Sharma",))
    assert "https://bricks.app/a" not in masked and "@ravi" not in masked
    assert "6:00 AM" not in masked and "Sun, 16 Nov" not in masked and "42" not in masked
    assert "\U0001f44d" not in masked and "\ue000" in masked
    assert service.restore(masked, slots) == body
    assert service._intact(masked, len(slots)) is True


def test_a_damaged_marker_is_spotted():
    body = "See https://bricks.app/a now"
    masked, slots = service.protect(body, ())
    assert service._intact(masked, len(slots)) is True
    assert service._intact(masked.replace("\ue0000\ue001", ""), len(slots)) is False


# --------------------------------------------------------------------------- the happy path
def test_translation_comes_back_and_is_cached(no_real_provider):
    p = person()
    aid = announcement(p)
    first = ask(p, aid).json()["items"][0]
    assert first["status"] == "ok" and first["cached"] is False and first["text"].startswith("[xx] ")
    assert first["source_lang"] == "en" and first["target_lang"] == "hi"
    assert no_real_provider.translates == 1

    again = ask(p, aid).json()["items"][0]
    assert again["status"] == "ok" and again["cached"] is True and again["text"] == first["text"]
    assert no_real_provider.translates == 1, "the same text and pair must never be translated twice"


def test_the_same_item_asked_twice_in_one_request_is_translated_once(no_real_provider):
    p = person()
    aid = announcement(p)
    out = client.post("/v1/translate/batch",
                      json={"items": [{"type": "announcement", "id": aid, "field": "body"}] * 2, "target": "hi"},
                      headers=p["h"]).json()["items"]
    assert out[0]["text"] == out[1]["text"] and no_real_provider.translates == 1


def test_the_reader_language_gives_the_original_without_a_call(no_real_provider):
    p = person()
    aid = announcement(p, body="The garden is open on Sunday.")
    out = ask(p, aid, target="en").json()["items"][0]
    assert out["status"] == "original" and out["cached"] is False
    assert out["text"] == "The garden is open on Sunday." and no_real_provider.translates == 0


def test_detection_is_used_once_and_then_remembered(no_real_provider):
    p = person()
    aid = announcement(p, body="Kali bataayi thi sab log aa jaiye.", source_lang=None)
    first = ask(p, aid).json()["items"][0]
    assert first["source_lang"] == "hi" and no_real_provider.detects == 1
    with engine().begin() as conn:
        stored = conn.execute(text("select source_lang from announcements where id = :i"), {"i": aid}).scalar_one()
    assert stored == "hi", "a detected language belongs on the original, so it is only ever asked once"

    # The first ask was in the detected language itself, so it returned the original without a call; this
    # one needs a real translation, but still no second detection.
    assert ask(p, aid, target="bn").json()["items"][0]["status"] == "ok"
    assert no_real_provider.detects == 1 and no_real_provider.translates == 1


# --------------------------------------------------------------------------- permission inherits the original
def test_only_a_member_can_get_a_translation():
    owner, outsider = person(), person()
    aid = announcement(owner)
    assert ask(owner, aid).status_code == 200
    refused = ask(outsider, aid)
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == "not_readable"


def test_unknown_type_field_and_language_are_rejected():
    p = person()
    aid = announcement(p)
    assert ask(p, aid).status_code == 200
    bad = lambda body: client.post("/v1/translate/batch", json=body, headers=p["h"])
    assert bad({"items": [{"type": "secret", "id": aid, "field": "body"}], "target": "hi"}).status_code == 422
    assert bad({"items": [{"type": "announcement", "id": aid, "field": "pinned"}], "target": "hi"}).status_code == 422
    assert bad({"items": [{"type": "announcement", "id": aid, "field": "body"}], "target": "kl"}).status_code == 422
    assert bad({"items": [{"type": "announcement", "id": "not-a-uuid", "field": "body"}], "target": "hi"}).status_code == 422
    assert bad({"items": [{"type": "announcement", "id": aid, "field": "body"}] * 51, "target": "hi"}).status_code == 422
    assert bad({"items": [], "target": "hi"}).status_code == 422


def test_a_missing_announcement_is_a_404():
    p = person()
    r = ask(p, str(uuid.uuid4()))
    assert r.status_code == 404 and r.json()["detail"]["code"] == "not_found"


# --------------------------------------------------------------------------- editing invalidates
def test_editing_the_original_invalidates_its_translation(no_real_provider):
    p = person()
    aid = announcement(p)
    assert ask(p, aid).json()["items"][0]["cached"] is False
    assert ask(p, aid).json()["items"][0]["cached"] is True
    assert no_real_provider.translates == 1

    with engine().begin() as conn:
        assert service.bump_version(conn, "announcement", aid) == 2
        stale = conn.execute(text("select status from translations where content_id = :i"), {"i": aid}).all()
    assert [r.status for r in stale] == ["stale"], "an old translation is never served as current again"

    after = ask(p, aid).json()["items"][0]
    assert after["cached"] is False and no_real_provider.translates == 2
    with engine().begin() as conn:
        rows = conn.execute(text("select content_version, status from translations where content_id = :i order by content_version"),
                            {"i": aid}).all()
    assert [(r.content_version, r.status) for r in rows] == [(1, "stale"), (2, "ok")]


# --------------------------------------------------------------------------- when it cannot be done
def test_when_every_provider_fails_the_original_comes_back(monkeypatch):
    monkeypatch.setattr(providers, "configured", lambda: [Broken()])
    p = person()
    aid = announcement(p)
    out = ask(p, aid).json()["items"][0]
    assert out["status"] == "unavailable" and out["cached"] is False
    assert out["text"] == "The garden is open on Sunday."


def test_a_failing_provider_falls_through_to_the_next_one(monkeypatch):
    first, second = Broken(), Fake(target_tag="bn")
    monkeypatch.setattr(providers, "configured", lambda: [first, second])
    p = person()
    aid = announcement(p)
    out = ask(p, aid).json()["items"][0]
    assert out["status"] == "ok" and out["text"].startswith("[bn] ")
    assert first.translates == 1 and second.translates == 1


def test_private_content_never_reaches_a_third_party(monkeypatch):
    # No private table exists yet, so the rule is tested against one added for the length of the test.
    monkeypatch.setitem(service.KINDS, "note", service.Kind("announcements", ("title",), private=True))
    p = person()
    aid = announcement(p, title="Keep this between us")
    out = client.post("/v1/translate/batch", json={"items": [{"type": "note", "id": aid, "field": "title"}],
                                                   "target": "hi"}, headers=p["h"]).json()["items"][0]
    assert out["status"] == "private" and out["text"] == "Keep this between us"


def test_private_content_will_use_the_local_engine_when_there_is_one(monkeypatch):
    local = Fake(target_tag="local")
    local.name = "local"
    monkeypatch.setattr(providers, "configured", lambda: [Fake(), local])
    assert [p.name for p in service._allowed(True)] == ["local"]
    assert [p.name for p in service._allowed(False)] == ["fake", "local"]


def test_a_daily_limit_is_a_clean_refusal(monkeypatch):
    monkeypatch.setenv("TRANSLATE_DAILY_CHARS_PER_USER", "5")
    p = person()
    aid = announcement(p, body="This announcement is far longer than five characters.")
    r = ask(p, aid)
    assert r.status_code == 429
    assert r.json()["detail"]["code"] == "daily_user_limit" and r.json()["detail"]["limit"] == 5


# --------------------------------------------------------------------------- the person's own choice
def test_auto_translate_is_on_and_can_be_switched_off():
    p = person()
    assert client.get("/v1/me/translation", headers=p["h"]).json() == {"auto": True, "target": "en"}
    assert client.put("/v1/me/translation", json={"auto": False}, headers=p["h"]).json() == {"auto": False, "target": "en"}
    assert client.put("/v1/me/translation", json={"target": "ta"}, headers=p["h"]).json() == {"auto": False, "target": "ta"}
    assert client.put("/v1/me/translation", json={}, headers=p["h"]).json() == {"auto": False, "target": "ta"}
    assert client.put("/v1/me/translation", json={"target": "kl"}, headers=p["h"]).status_code == 422
    assert client.get("/v1/me/translation", headers=person()["h"]).json()["auto"] is True


def test_free_text_is_counted_but_never_stored(no_real_provider):
    p = person()
    with engine().begin() as conn:
        before = conn.execute(text("select count(*) from translations")).scalar_one()
    r = client.post("/v1/translate/text", json={"text": "Hello everyone", "target": "hi", "source": "en"}, headers=p["h"])
    out = r.json()
    assert out["status"] == "ok" and out["id"] is None and out["field"] is None
    assert out["text"].startswith("[xx] ") and out["cached"] is False
    assert no_real_provider.translates == 1
    with engine().begin() as conn:
        after = conn.execute(text("select count(*) from translations")).scalar_one()
    assert after == before, "a draft preview is never written to the cache"


# --------------------------------------------------------------------------- providers
def test_gemini_answers_are_read_as_a_json_array(monkeypatch):
    """Gemini must be asked for strict JSON of the same length and order, and must keep the key in a header."""
    seen = {}

    class Resp:
        status_code = 200

        def __init__(self, payload):
            self._p = payload

        def json(self):
            return self._p

    def post(url, **kw):
        seen["url"] = url
        seen["headers"] = kw.get("headers") or {}
        seen["body"] = kw.get("json") or {}
        text_out = seen["body"].get("contents")[0]["parts"][0]["text"]
        return Resp({"candidates": [{"content": {"parts": [{"text": "[" + ", ".join(f'"{t}"' for t in
                   [f"[x] {s}" for s in __import__("json").loads(text_out)]) + "]"}]}}]})

    monkeypatch.setattr(providers.httpx, "post", post)
    p = providers.GeminiProvider("FAKE-KEY-NOT-A-SECRET", "gemini-2.5-flash", 5)
    out = p.translate(["Hello", "Namaste"], "en", "hi")
    assert out == ["[x] Hello", "[x] Namaste"]
    assert seen["url"].startswith("https://generativelanguage.googleapis.com/")
    assert "key=" not in seen["url"], "the key must never travel in a URL a log could keep"
    assert seen["headers"]["x-goog-api-key"] == "FAKE-KEY-NOT-A-SECRET"
    assert seen["body"]["generationConfig"]["responseSchema"]["type"] == "ARRAY"


def test_google_and_local_providers_answer_in_order(monkeypatch):
    class Resp:
        status_code = 200

        def __init__(self, payload):
            self._p = payload

        def json(self):
            return self._p

    monkeypatch.setattr(providers.httpx, "post",
                        lambda url, **kw: Resp({"data": {"translations": [{"translatedText": "Namaste"},
                                                                          {"translatedText": "Kaise ho"}]}}))
    g = providers.GoogleCloudProvider("FAKE", 5)
    assert g.translate(["Hello", "How are you"], "en", "hi") == ["Namaste", "Kaise ho"]

    monkeypatch.setattr(providers.httpx, "post", lambda url, **kw: Resp({"translations": ["Namaste"]}))
    assert providers.LocalProvider("http://localhost:9000/api/translate/batch", 5).translate(["Hello"], "en", "hi") == ["Namaste"]


def test_a_provider_is_skipped_when_it_is_not_set_up(monkeypatch):
    """A provider named in the settings without its key is skipped, not an error."""
    monkeypatch.setattr(providers, "configured", _REAL_CONFIGURED)
    monkeypatch.setenv("TRANSLATE_PROVIDERS", "gemini,google,local")
    for name in ("GEMINI_API_KEY", "GOOGLE_TRANSLATE_API_KEY", "LOCAL_TRANSLATE_URL"):
        monkeypatch.delenv(name, raising=False)
    assert [p.name for p in providers.configured()] == []
    monkeypatch.setenv("LOCAL_TRANSLATE_URL", "http://localhost:9000/api/translate/batch")
    assert [p.name for p in providers.configured()] == ["local"]
