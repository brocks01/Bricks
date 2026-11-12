"""Shared test setup.

No test may ever send a REAL email. The tests make throw-away people (test-xxxx@example.com); with the owner's mail login in `.env` they used to be
mailed for real, hard-bounced, used up the daily credit and hurt the sender's reputation. So every test runs with the SMTP connection replaced by a
recorder and the mail keys removed; tests that exercise the mail code (test_mail.py) fake the network themselves."""
import pytest

from app.core import mail


class _NoSmtp:
    """Stands in for smtplib.SMTP: accepts everything, sends nothing, remembers what it was asked to send."""

    sent: list = []

    def __init__(self, *a, **k):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def starttls(self, *a, **k):
        return (220, b"ok")

    def login(self, *a, **k):
        return (235, b"ok")

    def send_message(self, msg, *a, **k):
        _NoSmtp.sent.append(msg)
        return {}


@pytest.fixture(autouse=True)
def never_send_real_mail(monkeypatch):
    monkeypatch.delenv("BREVO_API_KEY", raising=False)
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.setattr(mail.smtplib, "SMTP", _NoSmtp)
    _NoSmtp.sent.clear()
    yield
