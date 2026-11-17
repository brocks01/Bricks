"""The live link: a person's open screens learn that something changed (from a skill, a phone call, another device) and can be told to open a page; presence says who is here."""
import concurrent.futures
import time
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.live import hub, topics
from app.modules.skills import registry

client = TestClient(app)
EMAILS: list[str] = []
POOL = concurrent.futures.ThreadPoolExecutor(max_workers=8)


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person() -> tuple[str, str]:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    return s["user"]["id"], s["access_token"]


class Sock:
    """A test socket that never loses a message: one pending read is kept until it is answered (a plain receive would wait for ever)."""

    def __init__(self, ws):
        self.ws, self.pending = ws, None

    def send_json(self, obj):
        self.ws.send_json(obj)

    def get(self, seconds: float = 5.0) -> dict:
        if self.pending is None:
            self.pending = POOL.submit(self.ws.receive_json)
        got = self.pending.result(timeout=seconds)
        self.pending = None
        return got

    def quiet(self, seconds: float = 0.6) -> bool:
        try:
            self.get(seconds)
            return False
        except concurrent.futures.TimeoutError:
            return True


def recv(ws, seconds: float = 5.0) -> dict:
    return ws.get(seconds)


def nothing_more(ws, seconds: float = 0.6) -> bool:
    return ws.quiet(seconds)


def join(ws, token: str, device: str = "tab-1", page: str = "home.index") -> dict:
    ws.send_json({"type": "auth", "token": token, "device": device, "page": page})
    return recv(ws)


def dial():
    return _Dial()


class _Dial:
    def __enter__(self):
        self.cm = client.websocket_connect("/v1/live")
        return Sock(self.cm.__enter__())

    def __exit__(self, *a):
        return self.cm.__exit__(*a)


def test_a_bad_token_is_refused_and_a_good_one_is_ready():
    with dial() as ws:
        ws.send_json({"type": "auth", "token": "nope"})
        assert recv(ws)["message"] == "unauthorized"
    uid, token = person()
    with dial() as ws:
        assert join(ws, token)["type"] == "ready"
        assert hub.is_live(uid)
    time.sleep(0.3)
    assert not hub.is_live(uid)  # closing the tab ends the presence


def test_presence_shows_the_open_screens_and_the_page_each_is_on():
    uid, token = person()
    h = {"Authorization": f"Bearer {token}"}
    assert client.get("/v1/live/presence", headers=h).json() == {"live": False, "devices": []}
    with dial() as ws:
        join(ws, token, "laptop", "home.index")
        ws.send_json({"type": "page", "page": "calendar.today"})
        ws.send_json({"type": "ping"})
        assert recv(ws)["type"] == "pong"
        p = client.get("/v1/live/presence", headers=h).json()
        assert p["live"] and p["devices"][0]["device"] == "laptop" and p["devices"][0]["page"] == "calendar.today"
        assert registry.run_for_user(uid, "is_app_open", {})["app_open"] is True


def test_a_skill_that_changes_something_tells_every_open_screen_what_to_refresh():
    uid, token = person()
    with dial() as a, dial() as b:
        join(a, token, "phone")
        join(b, token, "laptop")
        registry.run_for_user(uid, "add_goal", {"title": "learn video calling"})  # what a phone call or a chat does
        for ws in (a, b):
            msg = recv(ws)
            assert msg["type"] == "changed" and "grow" in msg["topics"] and "home" in msg["topics"]
        registry.run_for_user(uid, "my_tree", {})  # only looking: no event
        assert nothing_more(a)


def test_a_normal_write_from_the_app_refreshes_the_other_screen():
    uid, token = person()
    h = {"Authorization": f"Bearer {token}"}
    with dial() as ws:
        join(ws, token)
        r = client.post("/v1/skills/checkin_today", json={"args": {"moved": True}}, headers=h)  # a write through the API, as another device would make it
        assert r.status_code == 200
        msg = recv(ws)
        assert msg["type"] == "changed" and "calendar" in msg["topics"]


def test_bursts_arrive_as_one_message_and_other_people_hear_nothing():
    uid, token = person()
    other, other_token = person()
    with dial() as mine, dial() as theirs:
        join(mine, token)
        join(theirs, other_token)
        for _ in range(3):
            hub.changed(uid, ["calendar"])
        msg = recv(mine)
        assert msg["topics"] == ["calendar"]
        assert nothing_more(mine)  # the three were merged into the one
        assert nothing_more(theirs)  # nothing leaks to someone else


def test_show_on_screen_opens_a_known_page_only_when_the_app_is_open():
    uid, token = person()
    assert registry.run_for_user(uid, "show_on_screen", {"screen": "calendar"})["opened"] is False  # app closed: said plainly, nothing queued
    with dial() as ws:
        join(ws, token)
        r = registry.run_for_user(uid, "show_on_screen", {"screen": "my day"})
        assert r["opened"] is True and r["screens_reached"] == 1
        assert recv(ws) == {"type": "open", "page": "calendar.today", "params": {}}
        bad = registry.run_for_user(uid, "show_on_screen", {"screen": "the admin console"})
        assert bad["error"] == "unknown_screen" and "calendar" in " ".join(bad["options"]).lower()
        assert nothing_more(ws)


def test_topics_follow_the_path_and_the_skill():
    assert topics.for_path("/v1/calendar/items") == ["calendar", "home"]
    assert topics.for_path("/v1/auth/verify-code") == [] and topics.for_path("/v1/live/presence") == []
    assert topics.for_skill("add_goal") == ["grow", "home"] and topics.for_skill("a_new_skill") == ["*"]
    assert "wisdom" in topics.for_skill("offer_to_teach")
