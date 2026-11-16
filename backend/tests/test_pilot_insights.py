"""What the pitch promises to show: an interest report for centres (consent, counts only, groups of five), loneliness before and after, pilot numbers, and 'start a group' suggestions."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app

client = TestClient(app)
EMAILS: list[str] = []
AREA = f"Testville {uuid.uuid4().hex[:5]}"


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person(area=AREA, gender="woman", interests="gardening, tai chi", consent=True, referral="Test Employer") -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    h = {"Authorization": f"Bearer {s['access_token']}"}

    def put(section, **answers):
        return client.put(f"/v1/onboarding/{section}", json={"answers": answers}, headers=h)

    put("basics", display_name="Test Person", language="en", age_band="60plus", country="SG", area_name=area, gender=gender, referral=referral)
    put("purpose", roles=["connect"])
    put("consent", privacy=True, terms=True, insights=consent)
    put("rhythm", interests=interests)
    return {"h": h, "id": s["user"]["id"]}


def skill(p, name, /, **args):
    return client.post(f"/v1/skills/{name}", json={"args": args}, headers=p["h"]).json()


def make_admin(p):
    with engine().begin() as conn:
        conn.execute(text("update users set is_platform_admin = true where id = :u"), {"u": p["id"]})


def test_the_report_is_for_admins_only_counts_only_consenters_and_hides_groups_under_five():
    people = [person(gender="man") for _ in range(5)] + [person(interests="chess", gender="woman") for _ in range(2)] + [person(consent=False) for _ in range(3)]
    admin = people[0]
    assert client.get("/v1/insights/interests", params={"area": AREA}, headers=admin["h"]).status_code == 403
    make_admin(admin)
    r = client.get("/v1/insights/interests", params={"area": AREA}, headers=admin["h"]).json()
    assert r["people_counted"] == 7  # the three who did not agree are not counted
    by = {i["interest"]: i for i in r["interests"]}
    assert by["gardening"]["people"] == 5 and by["gardening"]["percent"] == 71 and by["gardening"]["events_last_quarter"] == 0
    assert "You ran 0 gardening events" in by["gardening"]["suggestion"] and "chess" not in by  # only two chose chess: hidden
    assert r["men_percent"] == 71


def test_the_loneliness_check_is_asked_at_the_start_and_again_later_and_the_pilot_shows_the_change():
    people = [person(referral="Ang Mo Kio AAC") for _ in range(5)]
    for p in people:
        r = client.put("/v1/onboarding/wellbeing", json={"answers": {"lack_companionship": "often", "feel_left_out": "often", "feel_isolated": "some_of_the_time"}}, headers=p["h"])
        assert r.status_code == 200
    with engine().begin() as conn:
        assert conn.execute(text("select count(*) from wellbeing_checks where user_id = :u and kind = 'baseline' and score = 8"), {"u": people[0]["id"]}).scalar_one() == 1
        conn.execute(text("update wellbeing_checks set taken_at = now() - interval '100 days' where user_id = any(cast(:ids as uuid[]))"), {"ids": [p["id"] for p in people]})
    for p in people:
        assert skill(p, "wellbeing_check", lack_companionship="hardly_ever", feel_left_out="some_of_the_time", feel_isolated="hardly_ever")["saved"] is True
        assert skill(p, "wellbeing_check", lack_companionship="hardly_ever", feel_left_out="hardly_ever", feel_isolated="hardly_ever")["saved"] is False  # nothing else is due yet
    assert skill(people[0], "wellbeing_check", lack_companionship="never", feel_left_out="x", feel_isolated="y")["error"] == "bad_answer"
    admin = people[0]
    make_admin(admin)
    r = client.get("/v1/insights/pilot", headers=admin["h"]).json()
    assert r["loneliness"]["people"] >= 5 and r["loneliness"]["latest_average"] < r["loneliness"]["start_average"]
    assert any(j["who"] == "ang mo kio aac" and j["people"] >= 5 for j in r["joined_through"])


def test_five_neighbours_who_like_the_same_thing_and_no_group_means_start_one_and_a_group_that_exists_is_offered():
    area = f"Kampong {uuid.uuid4().hex[:5]}"
    group = [person(area=area, interests="pottery") for _ in range(5)]
    me = group[0]
    s = client.get("/v1/suggestions/communities", headers=me["h"]).json()
    pottery = next(x for x in s["suggestions"] if x["interest"] == "pottery")
    assert pottery["nearby_people"] == 4 and pottery["groups"] == [] and pottery["start_one"] is True
    cid = client.post("/v1/communities", json={"name": f"Pottery Circle {uuid.uuid4().hex[:4]}"}, headers=group[1]["h"]).json()["id"]
    with engine().begin() as conn:
        conn.execute(text("update communities set privacy = 'open' where id = :c"), {"c": cid})
    pottery = next(x for x in skill(me, "suggest_for_me")["suggestions"] if x["interest"] == "pottery")
    assert pottery["could_start_one"] is False and pottery["groups"][0]["name"].startswith("Pottery Circle") and pottery["groups"][0]["can_join"] is True
