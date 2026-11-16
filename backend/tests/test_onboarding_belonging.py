"""Onboarding extras: the opt-in belonging questions (used only to offer circles that fit, never shown outside a circle), the kind gender question with its honest reason,
and this person's own quiet hours. All three are optional: a person may answer, skip, or leave them for later."""
import uuid
from datetime import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.onboarding import rules, service

client = TestClient(app)
EMAILS: list[str] = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
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


def section_state(h, sid):
    return next(s for s in client.get("/v1/onboarding", headers=h).json()["sections"] if s["id"] == sid)


def next_part(uid):
    from app.modules.skills import registry

    return registry.run_for_user(uid, "onboarding_next", {})


# ---------- belonging: opt-in, never inferred, never shown outside a circle ----------
def test_belonging_is_an_optional_part_that_can_be_answered_in_parts_or_skipped():
    uid, h = person()
    b = section_state(h, "belonging")
    assert b["required"] is False and b["done"] is False
    assert [q["key"] for q in b["questions"]] == ["from_state", "from_place", "from_language", "keeps", "lives_now"]
    assert put(h, "belonging", from_state="Bihar").json()["completed"] is False  # answering this part never finishes the setup on its own
    assert section_state(h, "belonging")["questions"][0]["answer"] == "Bihar"
    assert put(h, "belonging", keeps=["festivals", "faith"], lives_now="Bedok").status_code == 200
    b = section_state(h, "belonging")
    assert b["done"] is True and next(q for q in b["questions"] if q["key"] == "keeps")["answer"] == ["festivals", "faith"]
    assert put(h, "belonging", keeps=["moon festivals"]).json()["detail"]["code"] == "bad_answer"  # only the three they can keep
    assert put(h, "belonging", hometown="Katihar").json()["detail"]["code"] == "unknown_question"
    sk = client.post("/v1/onboarding/belonging/skip", headers=h).json()
    assert next(s for s in sk["sections"] if s["id"] == "belonging")["skipped"] is True


def test_belonging_answers_rank_circles_for_the_person_and_are_never_shown_to_anyone_else():
    uid, h = person()
    circles = [
        {"id": "chess", "circle": "interest", "name": "Chess players", "area_name": "Toa Payoh", "description": "We play chess on Tuesdays"},
        {"id": "bihar", "circle": "origin", "name": "Bihar and Jharkhand together", "area_name": "Little India", "description": "People from Bihar"},
        {"id": "bedok", "circle": "place", "name": "Bedok neighbours", "area_name": "Bedok", "description": "The street where we live"},
    ]
    # nobody has answered yet: the caller's own order is kept, nothing is guessed
    assert [c["id"] for c in rules.rank_circles({}, circles)] == ["chess", "bihar", "bedok"]
    assert [c["id"] for c in rules.rank_circles(None, circles)] == ["chess", "bihar", "bedok"]
    put(h, "belonging", from_state="Bihar", from_place="Katihar", from_language="Hindi", keeps=["festivals"], lives_now="Bedok")
    with engine().connect() as conn:
        ranked = service.rank_circles(conn, uid, circles)
    assert [c["id"] for c in ranked] == ["bihar", "bedok", "chess"]  # from Bihar (and keeps its festivals), lives in Bedok; the chess club fits neither
    # the answers stay the person's own: no other screen hands them out
    assert "Bihar" not in client.get("/v1/profile", headers=h).text and "Katihar" not in client.get("/v1/profile", headers=h).text
    assert "Bihar" not in client.get("/v1/me", headers=h).text and "Katihar" not in client.get("/v1/me", headers=h).text


def test_the_agent_can_save_and_skip_the_belonging_part_too():
    uid, h = person()
    from app.modules.skills import registry

    assert registry.run_for_user(uid, "save_answer", {"section": "belonging", "field": "from_state", "value": "Tamil Nadu"})["saved"] == "from_state"
    assert registry.run_for_user(uid, "save_answer", {"section": "belonging", "field": "keeps", "value": "traditions"})["saved"] == "keeps"
    assert registry.run_for_user(uid, "skip_section", {"section": "belonging"})["skipped"] == "belonging"


# ---------- the gender question: clear, kind, with the honest reason, skippable ----------
def test_the_gender_question_says_why_it_is_asked_and_can_be_left_out():
    uid, h = person()
    gender = next(q for q in section_state(h, "basics")["questions"] if q["key"] == "gender")
    assert gender["required"] is False and gender["answer"] is None
    assert "men only" in gender["why"] and "women only" in gender["why"] and "leave this out" in gender["why"]
    said = next(q for q in next_part(uid)["questions"] if q["field"] == "gender")
    assert said["why"] and said["needed"] is False  # the agent knows the reason too, and that it can be skipped
    # the needed answers are given without ever answering it, and the setup simply moves on
    assert client.put("/v1/onboarding/basics", json={"answers": {"display_name": "Meena Iyer", "language": "ta", "age_band": "60plus", "country": "IN"}}, headers=h).json()["completed"] is False
    assert next_part(uid)["section"] == "purpose"
    assert put(h, "basics", gender="woman").status_code == 200  # answered later, still by choice
    assert next(q for q in section_state(h, "basics")["questions"] if q["key"] == "gender")["answer"] == "woman"


# ---------- quiet hours: this person's own, with the environment default when they set none ----------
def test_quiet_hours_are_the_persons_own_and_fall_back_to_the_default_when_not_set():
    uid, h = person()
    with engine().connect() as conn:
        assert service.quiet_hours(conn, uid) is None  # WISDOM_QUIET applies until they say otherwise
    assert put(h, "channels", quiet_from="21:30", quiet_to="07:00").status_code == 200
    with engine().connect() as conn:
        assert service.quiet_hours(conn, uid) == (time(21, 30), time(7, 0))
    assert put(h, "channels", quiet_from="evening").json()["detail"]["code"] == "bad_answer"  # a time, or not at all
    put(h, "channels", preferred_channel="telegram")
    with engine().connect() as conn:
        assert service.quiet_hours(conn, uid) == (time(21, 30), time(7, 0))  # the other answers of the part stay as they were


# ---------- the first minute: a friend asking, never a form ----------
def test_the_agents_hint_is_short_enough_for_the_memory_and_asks_one_question_at_a_time():
    uid, h = person()
    with engine().begin() as conn:
        hint = service.hint(conn, uid)
    assert len(hint) <= 380  # the memory keeps only this much of it
    assert "only just arrived" in hint and "ask what to call them" in hint
    assert "ONE question" in hint and "never a list" in hint and "(needed)" in hint
    put(h, "purpose", roles=["share"])
    with engine().begin() as conn:
        hint = service.hint(conn, uid)
    assert len(hint) <= 380 and "share what I know" in hint and "About you" in hint
    client.put("/v1/onboarding/basics", json={"answers": {"display_name": "Kavita Rao", "language": "hi", "age_band": "60plus", "country": "IN"}}, headers=h)
    client.put("/v1/onboarding/consent", json={"answers": {"privacy": True, "terms": True}}, headers=h)
    with engine().begin() as conn:
        hint = service.hint(conn, uid)
    assert len(hint) <= 380 and "optional; they can skip it" in hint  # the only parts left are ones they may skip
