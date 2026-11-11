"""In-app agent tests: tool declarations, and the live socket with a fake model (no network, no money)."""
import asyncio
import json
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.agent import router as agent_router
from app.modules.agent.declarations import declarations, system_prompt

client = TestClient(app)
EMAILS: list[str] = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake")
    agent_router._active.clear()
    agent_router._recent.clear()


def token() -> str:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    return client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()["access_token"]


# the app's real tool shapes (see app/src/agent/tools.ts)
TOOLS = [
    {"name": "tree", "description": "List a level", "inputSchema": {"type": "object", "properties": {"path": {"type": "string"}}, "required": [], "additionalProperties": False}},
    {"name": "read", "description": "Read the page", "inputSchema": {"type": "object", "properties": {}, "required": [], "additionalProperties": False}},
    {"name": "fill", "description": "Fill", "inputSchema": {"type": "object", "properties": {"path": {"type": "string"}, "value": {}}, "required": ["path", "value"], "additionalProperties": False}},
    {"name": "run", "description": "Run", "inputSchema": {"type": "object", "properties": {"skill": {"type": "string"}, "input": {"type": "object"}}, "required": ["skill"], "additionalProperties": False}},
    {"name": "bad name!", "description": "x", "inputSchema": {"type": "object"}},
]


def test_declarations_fit_gemini():
    d = {x["name"]: x for x in declarations(TOOLS)}
    assert "bad name!" not in d
    assert "parameters" not in d["read"]  # no fields: no parameters at all
    assert d["tree"]["parameters"]["properties"]["path"]["type"] == "STRING" and "additionalProperties" not in json.dumps(d)
    assert d["fill"]["parameters"]["properties"]["value"]["type"] == "STRING" and d["fill"]["parameters"]["required"] == ["path", "value"]
    assert d["run"]["parameters"]["properties"]["input"]["type"] == "STRING"  # empty object -> JSON text


def test_prompt_follows_language_and_keeps_rules():
    p = system_prompt(language="hi", name="Asha", page="me.index")
    assert "Hindi" in p and "Asha" in p and "me.index" in p and "Never claim to be a person" in p and "Coming soon" in p


def test_unauthorized_is_refused():
    with client.websocket_connect("/v1/agent/live") as ws:
        ws.send_text(json.dumps({"type": "auth", "token": "nope", "tools": []}))
        assert json.loads(ws.receive_text()) == {"type": "error", "message": "unauthorized"}


class FakeLive:
    """Stands in for Gemini Live: greets, asks for a tool, and says goodbye when it gets the result."""

    def __init__(self, cfg, *, voice, system_prompt, tools):
        self.frames, self.system_prompt, self.tools, self.pushed = asyncio.Queue(), system_prompt, tools, []

    async def open(self):
        self.frames.put_nowait({"type": "ready"})

    def push(self, f):
        self.pushed.append(f)
        if f.get("text") == "open my profile":
            self.frames.put_nowait({"type": "inputText", "text": "open my profile"})
            self.frames.put_nowait({"type": "toolCall", "id": "c1", "name": "open", "args": {"path": "me.index"}})
        if f.get("toolResponse"):
            self.frames.put_nowait({"type": "audio", "data": "AAAA"})
            self.frames.put_nowait({"type": "text", "text": "Opened."})
            self.frames.put_nowait({"type": "turn"})

    async def close(self, reason="closed"):
        self.frames.put_nowait({"type": "done"})

    async def __aiter__(self):
        while True:
            f = await self.frames.get()
            yield f
            if f["type"] == "done":
                return


def test_a_talk_with_a_tool_call(monkeypatch):
    monkeypatch.setattr(agent_router, "LiveSession", FakeLive)
    with client.websocket_connect("/v1/agent/live") as ws:
        ws.send_text(json.dumps({"type": "auth", "token": token(), "page": "home.index", "tools": TOOLS}))
        assert json.loads(ws.receive_text())["type"] == "ready"
        ws.send_text(json.dumps({"type": "text", "text": "open my profile"}))
        seen = [json.loads(ws.receive_text()), json.loads(ws.receive_text())]
        assert seen[0] == {"type": "text", "role": "person", "text": "open my profile"}
        assert seen[1] == {"type": "toolCall", "id": "c1", "name": "open", "args": {"path": "me.index"}}
        ws.send_text(json.dumps({"type": "toolResult", "id": "c1", "name": "open", "response": {"opened": "me.index"}}))
        types = [json.loads(ws.receive_text())["type"] for _ in range(3)]
        assert types == ["audio", "text", "turn"]
        ws.send_text(json.dumps({"type": "end"}))


def test_a_new_talk_replaces_the_old_one(monkeypatch):
    monkeypatch.setattr(agent_router, "LiveSession", FakeLive)
    tk = token()
    with client.websocket_connect("/v1/agent/live") as a:
        a.send_text(json.dumps({"type": "auth", "token": tk, "tools": []}))
        assert json.loads(a.receive_text())["type"] == "ready"
        with client.websocket_connect("/v1/agent/live") as b:
            b.send_text(json.dumps({"type": "auth", "token": tk, "tools": []}))
            assert json.loads(b.receive_text())["type"] == "ready"  # not refused: the person is never locked out
            b.send_text(json.dumps({"type": "end"}))


def test_web_tools_run_on_the_server_and_are_not_relayed(monkeypatch):
    """The model asks for a web search: the server runs it (the key stays here), tells the app which line to show, and answers the model."""
    ran = []

    async def fake_run(name, args, memo):
        ran.append((name, args))
        return {"results": [{"id": 1, "title": "t", "snippet": "s", "source": "example.com"}]}

    class SearchLive(FakeLive):
        def push(self, f):
            self.pushed.append(f)
            if f.get("text") == "weather?":
                self.frames.put_nowait({"type": "toolCall", "id": "w1", "name": "web_search", "args": {"query": "weather in Singapore"}})
            if f.get("toolResponse"):
                self.frames.put_nowait({"type": "text", "text": "It is warm."})
                self.frames.put_nowait({"type": "turn"})

    monkeypatch.setattr(agent_router, "LiveSession", SearchLive)
    monkeypatch.setattr(agent_router.web, "run", fake_run)
    with client.websocket_connect("/v1/agent/live") as ws:
        ws.send_text(json.dumps({"type": "auth", "token": token(), "tools": TOOLS}))
        assert json.loads(ws.receive_text())["type"] == "ready"
        ws.send_text(json.dumps({"type": "text", "text": "weather?"}))
        seen = [json.loads(ws.receive_text()) for _ in range(3)]
        assert seen[0] == {"type": "tool", "text": "web_search: weather in Singapore"}  # shown to the person, never sent to the app to run
        assert seen[1] == {"type": "text", "role": "agent", "text": "It is warm."} and seen[2]["type"] == "turn"
        ws.send_text(json.dumps({"type": "end"}))
    assert ran == [("web_search", {"query": "weather in Singapore"})]


def test_declarations_include_the_web_tools():
    names = [d["name"] for d in agent_router.web.declarations(agent_router.SERVER_TOOLS)]
    assert names == ["web_search", "read_page"]
