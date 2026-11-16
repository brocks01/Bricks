"""Onboarding: one set of steps in the backend, answered from the app (REST) or by the agent on a call or chat (skills), conditional on what the person wants here."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.skills import registry

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


def sk(uid, name, **a):
    return registry.run_for_user(uid, name, a)


def ids(state):
    return [s["id"] for s in state["sections"]]


def test_a_new_person_starts_with_the_required_parts_only():
    _, h = person()
    st = client.get("/v1/onboarding", headers=h).json()
    assert ids(st) == ["basics", "purpose", "consent", "channels", "rhythm", "wellbeing"] and st["completed"] is False
    assert st["next"]["id"] == "basics" and st["next"]["required"] is True


def test_role_parts_appear_only_for_the_roles_chosen():
    _, h = person()
    put(h, "purpose", roles=["learn", "help"])
    got = ids(client.get("/v1/onboarding", headers=h).json())
    assert "help" in got and "share" not in got and "care" not in got and "access" not in got
    put(h, "purpose", roles=["connect", "share", "care"])
    got = ids(client.get("/v1/onboarding", headers=h).json())
    assert {"share", "care", "access"} <= set(got) and "help" not in got


def test_surfaces_follow_the_profile_so_a_young_learner_gets_wisdom_not_the_community_tabs():
    _, h = person()
    assert client.get("/v1/profile", headers=h).json()["roles_chosen"] is False
    put(h, "basics", display_name="Aarav Nair", language="en", age_band="under40", country="SG")
    p = client.get("/v1/profile", headers=h).json()
    assert p["roles"] == ["learn", "help"] and p["roles_chosen"] is False  # the age picks a start until they choose
    put(h, "purpose", roles=["learn", "help"])
    p = client.get("/v1/profile", headers=h).json()
    assert p["roles_chosen"] and "wisdom_learn" in p["surfaces"] and "wisdom_help" in p["surfaces"]
    assert "community" not in p["surfaces"] and "markets" not in p["surfaces"] and "home" in p["surfaces"]
    put(h, "purpose", roles=["connect", "share"])
    p = client.get("/v1/profile", headers=h).json()
    assert "community" in p["surfaces"] and "wisdom_share" in p["surfaces"] and "wisdom_learn" not in p["surfaces"]


def test_answers_are_checked_and_saved_to_the_account():
    _, h = person()
    assert put(h, "basics", language="klingon").json()["detail"]["code"] == "bad_answer"
    assert put(h, "basics", favourite="blue").json()["detail"]["code"] == "unknown_question"
    assert put(h, "share", field="x").json()["detail"]["code"] == "no_such_section"
    put(h, "basics", display_name="Meena Iyer", language="ta", age_band="60plus", country="IN", area_name="Adyar", spoken_languages="Tamil, English")
    me = client.get("/v1/me", headers=h).json()
    assert me["display_name"] == "Meena Iyer" and me["language"] == "ta" and me["age_band"] == "60plus" and me["area_name"] == "Adyar"
    assert put(h, "channels", phone="not a number").json()["detail"]["code"] == "bad_answer"


def test_it_finishes_only_when_the_required_parts_are_done_and_consent_needs_a_yes():
    _, h = person()
    put(h, "basics", display_name="Ravi", language="en", age_band="60plus", country="SG")
    assert put(h, "purpose", roles=["connect"]).json()["completed"] is False
    assert put(h, "consent", privacy=True, terms=False).json()["completed"] is False
    assert put(h, "consent", terms=True).json()["completed"] is True
    assert client.get("/v1/profile", headers=h).json()["onboarded"] is True
    assert client.post("/v1/onboarding/basics/skip", headers=h).json()["detail"]["code"] == "cannot_skip"
    st = client.post("/v1/onboarding/rhythm/skip", headers=h).json()
    assert "rhythm" not in [s["id"] for s in st["sections"] if not s["done"] and not s["skipped"]]


def test_the_whole_setup_can_be_done_by_the_agents_skills_on_a_call_or_chat():
    uid, h = person()
    first = sk(uid, "onboarding_next")
    assert first["section"] == "basics" and {q["field"] for q in first["questions"]} >= {"display_name", "language", "age_band", "country"}
    for f, v in (("display_name", "Kavita Rao"), ("language", "hi"), ("age_band", "60plus"), ("country", "IN")):
        assert sk(uid, "save_answer", section="basics", field=f, value=v)["saved"] == f
    assert sk(uid, "save_answer", section="basics", field="language", value="elvish")["error"] == "bad_answer"
    assert sk(uid, "onboarding_next")["section"] == "purpose"
    assert sk(uid, "save_answer", section="purpose", field="roles", value="stay connected, share")["error"] == "bad_answer"
    assert sk(uid, "save_answer", section="purpose", field="roles", value="connect, share")["saved"] == "roles"
    assert sk(uid, "save_answer", section="consent", field="privacy", value="yes")["error"] == "use_give_consent"
    assert sk(uid, "give_consent", which="privacy")["error"] == "needs_confirmation"
    assert sk(uid, "give_consent", which="privacy", confirmed=True)["consented"] == "privacy"
    done = sk(uid, "give_consent", which="terms", confirmed=True)
    assert done["setup_finished"] is True
    assert sk(uid, "my_profile")["onboarded"] is True and "wisdom_share" in sk(uid, "my_profile")["surfaces"]
    # the app sees exactly what the call saved
    assert client.get("/v1/onboarding", headers=h).json()["completed"] is True and client.get("/v1/me", headers=h).json()["language"] == "hi"
    assert sk(uid, "skip_section", section="rhythm")["skipped"] == "rhythm"


def test_the_agent_knows_what_to_ask_next_and_why_the_person_is_here():
    from app.modules.channels import memory

    uid, h = person()
    assert "setup is not finished" in memory.context(uid)
    put(h, "purpose", roles=["share"])
    ctx = memory.context(uid)
    assert "share what I know" in ctx and "About you" in ctx
