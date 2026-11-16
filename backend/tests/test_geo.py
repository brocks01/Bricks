"""Maps and distance: the cache, the fallbacks without a key, the map pictures, and the key never leaking. Google is never called: the two fetches are faked."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.geo import service as geo

client = TestClient(app)
EMAILS: list[str] = []
KEY = "test-maps-key-never-shown"
PNG = b"\x89PNG\r\n\x1a\nfake"


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        conn.execute(text("delete from geo_places where key like 'geo test %'"))
        for e in EMAILS:
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


@pytest.fixture
def calls(monkeypatch, tmp_path):
    """Fakes both Google calls and counts them; the picture cache goes to a temporary folder."""
    seen = {"geocode": 0, "static": 0}

    def fake_geocode(address):
        seen["geocode"] += 1
        if "nowhere" in address:
            return {"status": "ZERO_RESULTS", "results": []}
        return {"status": "OK", "results": [{"geometry": {"location": {"lat": 1.3508, "lng": 103.8485}}}]}

    def fake_static(address):
        seen["static"] += 1
        return PNG

    monkeypatch.setattr(geo, "_fetch_geocode", fake_geocode)
    monkeypatch.setattr(geo, "_fetch_static", fake_static)
    monkeypatch.setattr(geo, "CACHE_DIR", tmp_path)
    return seen


def person() -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"]}


def community(address: str | None) -> str:
    lead = person()
    cid = client.post("/v1/communities", json={"name": f"Geo Test {uuid.uuid4().hex[:6]}", "privacy": "open"}, headers=lead["h"]).json()["id"]
    with engine().begin() as conn:
        conn.execute(text("update communities set address = :a, area_name = null where id = :c"), {"a": address, "c": cid})
    return cid


def test_locate_caches_a_found_place_and_a_miss(monkeypatch, calls):
    monkeypatch.setenv("GOOGLE_MAPS_API_KEY", KEY)
    with engine().begin() as conn:
        a = geo.locate(conn, "Geo Test 1  Bishan   Road")
        b = geo.locate(conn, "geo test 1 bishan road")  # the same address, written differently: from the cache
        assert a == b == (1.3508, 103.8485)
        assert geo.locate(conn, "geo test nowhere at all") is None
        assert geo.locate(conn, "geo test nowhere at all") is None  # the miss is kept too
    assert calls["geocode"] == 2


def test_without_a_key_nothing_is_called_and_nothing_breaks(monkeypatch, calls):
    monkeypatch.delenv("GOOGLE_MAPS_API_KEY", raising=False)
    with engine().begin() as conn:
        assert geo.locate(conn, "geo test 2 toa payoh") is None
        assert geo.locate(conn, "") is None and geo.locate(conn, None) is None
    cid = community("Geo Test 2 Toa Payoh Central")
    assert client.get(f"/v1/geo/map/community/{cid}.png").status_code == 404
    assert calls == {"geocode": 0, "static": 0}


def test_distance_is_right_for_two_known_points():
    bishan, tampines = (1.3508, 103.8485), (1.3536, 103.9452)
    assert 10.5 < geo.distance_km(bishan, tampines) < 11.0
    assert geo.distance_km(bishan, bishan) == 0


def test_map_picture_from_a_stored_address_is_cached_and_never_shows_the_key(monkeypatch, calls):
    monkeypatch.setenv("GOOGLE_MAPS_API_KEY", KEY)
    cid = community("Geo Test 3 Ang Mo Kio Avenue 6")
    r = client.get(f"/v1/geo/map/community/{cid}.png")
    assert r.status_code == 200 and r.content == PNG and r.headers["content-type"] == "image/png" and "max-age" in r.headers["cache-control"]
    assert client.get(f"/v1/geo/map/community/{cid}.png").content == PNG
    assert calls["static"] == 1  # the second picture came from the cache
    assert KEY not in r.text and KEY not in str(r.headers)


def test_map_refuses_bad_ids_missing_addresses_and_hidden_communities(monkeypatch, calls):
    monkeypatch.setenv("GOOGLE_MAPS_API_KEY", KEY)
    assert client.get("/v1/geo/map/community/not-a-uuid.png").status_code == 404
    assert client.get(f"/v1/geo/map/community/{uuid.uuid4()}.png").status_code == 404
    assert client.get(f"/v1/geo/map/event/{uuid.uuid4()}.png").status_code == 404
    assert client.get(f"/v1/geo/map/community/{community(None)}.png").status_code == 404
    hidden = community("Geo Test 4 Woodlands")
    with engine().begin() as conn:
        conn.execute(text("update communities set hidden_at = now() where id = :c"), {"c": hidden})
    assert client.get(f"/v1/geo/map/community/{hidden}.png").status_code == 404
    assert calls["static"] == 0
