"""Spoken languages: a person's list, the one they prefer to talk in, and the rules the agent gets from them."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core import languages
from app.core.db import engine
from app.main import app
from app.modules.agent.declarations import system_prompt

client = TestClient(app)
EMAILS: list[str] = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person() -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}}


def test_the_list_has_23_languages_and_cleans_input():
    assert len(languages.SPOKEN) == 23 and {"en", "hi", "bn", "bho"} <= set(languages.SPOKEN)
    assert languages.clean(["EN", "hi", "xx", "hi", " bho "]) == ["en", "hi", "bho"]


def test_a_person_saves_and_clears_their_languages():
    p = person()
    me = client.get("/v1/me", headers=p["h"]).json()
    assert me["spoken_languages"] == [] and me["comm_language"] is None
    r = client.patch("/v1/me", json={"spoken_languages": ["en", "hi", "bho", "bn", "zz", "hi"], "comm_language": "hi"}, headers=p["h"])
    assert r.status_code == 200 and r.json()["spoken_languages"] == ["en", "hi", "bho", "bn"] and r.json()["comm_language"] == "hi"
    assert client.get("/v1/me", headers=p["h"]).json()["spoken_languages"] == ["en", "hi", "bho", "bn"]
    assert client.patch("/v1/me", json={"comm_language": "xx"}, headers=p["h"]).status_code == 422
    assert client.patch("/v1/me", json={"spoken_languages": None}, headers=p["h"]).json()["spoken_languages"] == []


def test_the_agent_prompt_guesses_only_among_their_languages_and_asks_to_repeat():
    text_ = system_prompt(language="en", name="Ramesh", page=None, spoken=["en", "hi", "bho", "bn"], comm="hi")
    assert "English, Hindi, Bhojpuri, Bengali" in text_ and "main language for talking is Hindi" in text_
    assert "do not guess" in text_ and "say it again" in text_ and "NOT on their list" in text_
    # no list saved: the old behaviour stays
    assert "LANGUAGES." not in system_prompt(language="en", name=None, page=None)


def test_the_agent_asks_free_answers_aloud_instead_of_opening_a_text_box_form():
    p = system_prompt(language="en", name=None, page=None)
    assert "do NOT open a panel with a text box" in p and "always ask aloud" in p and "never ask them to copy or paste a link" in p
