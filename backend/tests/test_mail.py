"""Email tests with a fake Brevo (no network, nothing sent)."""
import uuid

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core import mail
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset(monkeypatch):
    monkeypatch.setattr(mail, "_sender", None)
    monkeypatch.delenv("EMAIL_FROM", raising=False)
    monkeypatch.setenv("BREVO_API_KEY", "xkeysib-test")


class FakeBrevo:
    def __init__(self, status=201, senders=None):
        self.status, self.senders, self.sent = status, senders if senders is not None else [{"email": "hello@bricks.test", "active": True}], []

    def get(self, url, headers=None, timeout=None):
        assert headers["api-key"] == "xkeysib-test" and url.endswith("/senders")
        return httpx.Response(200, json={"senders": self.senders}, request=httpx.Request("GET", url))

    def post(self, url, headers=None, json=None, timeout=None):
        self.sent.append(json)
        return httpx.Response(self.status, json={"messageId": "<x>"} if self.status < 300 else {"message": "nope"}, request=httpx.Request("POST", url))


def test_code_email_has_the_code_and_no_tracking():
    subject, html, text = mail.code_email("123456", 10)
    assert "123456" in subject and "123456" in html and "123456" in text and "<img" not in html and "http" not in html.replace("https://", "")


def test_brevo_send_uses_the_first_active_sender_when_email_from_is_not_set(monkeypatch):
    fake = FakeBrevo()
    monkeypatch.setattr(mail.httpx, "get", fake.get)
    monkeypatch.setattr(mail.httpx, "post", fake.post)
    assert mail.send_login_code("asha@example.com", "654321", 10) is True
    m = fake.sent[0]
    assert m["sender"] == {"email": "hello@bricks.test", "name": "Bricks"} and m["to"] == [{"email": "asha@example.com"}] and "654321" in m["htmlContent"]


def test_email_from_wins_and_needs_no_lookup(monkeypatch):
    monkeypatch.setenv("EMAIL_FROM", "me@bricks.test")
    fake = FakeBrevo()
    monkeypatch.setattr(mail.httpx, "get", lambda *a, **k: (_ for _ in ()).throw(AssertionError("no lookup expected")))
    monkeypatch.setattr(mail.httpx, "post", fake.post)
    mail.send_login_code("asha@example.com", "111111", 10)
    assert fake.sent[0]["sender"]["email"] == "me@bricks.test"


def test_refusals_are_named_and_never_contain_the_key(monkeypatch):
    for status, why in [(401, "bad_key"), (402, "no_credit"), (429, "rate_limited"), (400, "refused_400")]:
        monkeypatch.setattr(mail, "_sender", None)
        fake = FakeBrevo(status=status)
        monkeypatch.setattr(mail.httpx, "get", fake.get)
        monkeypatch.setattr(mail.httpx, "post", fake.post)
        with pytest.raises(mail.MailError) as e:
            mail.send_login_code("a@example.com", "000000", 10)
        assert e.value.code == why and "xkeysib" not in str(e.value)


def test_no_verified_sender_is_a_clear_error(monkeypatch):
    fake = FakeBrevo(senders=[])
    monkeypatch.setattr(mail.httpx, "get", fake.get)
    with pytest.raises(mail.MailError) as e:
        mail.send_login_code("a@example.com", "000000", 10)
    assert e.value.code == "no_sender"


def test_no_provider_means_not_sent(monkeypatch):
    monkeypatch.delenv("BREVO_API_KEY")
    monkeypatch.setattr(mail, "get_settings", lambda: type("S", (), {"smtp_host": "", "email_from": ""})())
    assert mail.send_login_code("a@example.com", "000000", 10) is False


def test_sign_in_request_reports_a_failed_send(monkeypatch):
    fake = FakeBrevo(status=401)
    monkeypatch.setattr(mail.httpx, "get", fake.get)
    monkeypatch.setattr(mail.httpx, "post", fake.post)
    r = client.post("/v1/auth/request-code", json={"email": f"mailfail-{uuid.uuid4().hex[:8]}@example.com"})
    assert r.status_code == 502 and r.json()["detail"]["code"] == "email_failed" and "xkeysib" not in r.text


def test_the_daily_cap_stops_new_codes(monkeypatch):
    monkeypatch.setenv("EMAIL_DAILY_LIMIT", "0")
    r = client.post("/v1/auth/request-code", json={"email": f"cap-{uuid.uuid4().hex[:8]}@example.com"})
    assert r.status_code == 503 and r.json()["detail"]["code"] == "email_busy"


def test_resend_send_over_rest_when_only_a_resend_key_is_set(monkeypatch):
    monkeypatch.delenv("BREVO_API_KEY", raising=False)
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("EMAIL_FROM", "hello@bricks.test")
    sent = []

    def post(url, headers=None, json=None, timeout=None):
        sent.append((url, headers, json))
        return httpx.Response(200, json={"id": "x"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(mail.httpx, "post", post)
    assert mail.configured() and mail.send_login_code("asha@example.com", "246810", 10) is True
    url, headers, body = sent[0]
    assert url == "https://api.resend.com/emails" and headers["Authorization"] == "Bearer re_test"
    assert body["from"] == "Bricks <hello@bricks.test>" and body["to"] == ["asha@example.com"] and "246810" in body["html"]


def test_resend_needs_a_sender_and_names_its_refusals(monkeypatch):
    monkeypatch.delenv("BREVO_API_KEY", raising=False)
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.delenv("EMAIL_FROM", raising=False)
    monkeypatch.setattr(mail, "get_settings", lambda: type("S", (), {"email_from": "", "smtp_host": ""})())
    with pytest.raises(mail.MailError) as e:
        mail.send("a@b.test", "s", "h", "t")
    assert e.value.code == "no_sender"
    monkeypatch.setattr(mail, "get_settings", lambda: type("S", (), {"email_from": "hello@bricks.test", "smtp_host": ""})())
    monkeypatch.setattr(mail.httpx, "post", lambda *a, **k: httpx.Response(403, json={"message": "domain"}, request=httpx.Request("POST", "https://x")))
    with pytest.raises(mail.MailError) as e:
        mail.send("a@b.test", "s", "h", "t")
    assert e.value.code == "forbidden" and "re_test" not in str(e.value)
