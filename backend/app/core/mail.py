"""One email service for the whole backend. The sign-in code is the first mail; later mails (event reminders, receipts) use the same send().

Provider, in this order:
  1. Brevo over its REST API: set ONE variable, BREVO_API_KEY (a key that starts with xkeysib-). The sender is taken from EMAIL_FROM if you set it;
     otherwise the first active sender in the Brevo account is used (Brevo only sends from a sender you verified there).
  2. Any SMTP server: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM.
  3. Neither (local work): nothing is sent and a notice is logged WITHOUT the code.

The look is the plain white transactional style from the Jambagrad email module: one voice for every mail, no marketing chrome, no tracking on
security mail. Failures never leak the key. A daily cap protects the free tier (EMAIL_DAILY_LIMIT, default 300, Brevo's free plan)."""
import logging
import os
import smtplib
import time
from email.message import EmailMessage
from html import escape

import httpx

from .config import get_settings

log = logging.getLogger("bricks.mail")
BREVO = "https://api.brevo.com/v3"
BRAND = "Bricks"


class MailError(Exception):
    """The mail could not be sent. `code` is a machine word; the message never contains a key."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


_sender: dict | None = None
_sender_at = 0.0


def configured() -> bool:
    return bool(os.environ.get("BREVO_API_KEY", "").strip() or get_settings().smtp_host)


def daily_limit() -> int:
    try:
        return int(os.environ.get("EMAIL_DAILY_LIMIT", "300"))
    except ValueError:
        return 300


def _brevo_headers() -> dict:
    return {"api-key": os.environ["BREVO_API_KEY"].strip(), "accept": "application/json", "content-type": "application/json"}


def _brevo_sender() -> dict:
    """EMAIL_FROM if set, else the first active sender of the Brevo account (cached for an hour)."""
    global _sender, _sender_at
    want = (get_settings().email_from or "").strip()
    if want:
        return {"email": want, "name": BRAND}
    if _sender and time.monotonic() - _sender_at < 3600:
        return _sender
    try:
        r = httpx.get(f"{BREVO}/senders", headers=_brevo_headers(), timeout=10)
        r.raise_for_status()
        senders = [x for x in r.json().get("senders", []) if x.get("active", True) and x.get("email")]
    except httpx.HTTPError as e:
        log.warning("brevo senders lookup failed: %s", type(e).__name__)
        raise MailError("sender_unavailable") from e
    if not senders:
        raise MailError("no_sender")  # add and verify a sender in the Brevo account first
    _sender, _sender_at = {"email": senders[0]["email"], "name": BRAND}, time.monotonic()
    return _sender


def code_email(code: str, minutes: int) -> tuple[str, str, str]:
    """(subject, html, text) of the sign-in code mail."""
    subject = f"Your {BRAND} code: {code}"
    text = f"Your {BRAND} sign-in code is {code}.\nIt works for {minutes} minutes. If you did not ask for it, you can ignore this email.\n\n{BRAND}. This is an automated message; do not reply."
    html = (
        '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>'
        f"<title>{escape(subject)}</title></head>"
        '<body style="margin:0;background:#fff;color:#3c4043;font-family:Roboto,Arial,Helvetica,sans-serif;line-height:1.6">'
        '<div style="max-width:480px;margin:32px auto;padding:0 24px">'
        f'<div style="font-size:14px;font-weight:500;color:#1B7F3B;margin-bottom:24px">{BRAND}</div>'
        '<div style="font-size:15px;margin-bottom:12px">Your sign-in code is</div>'
        f'<div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#16202A;margin:8px 0 16px">{escape(code)}</div>'
        f'<div style="font-size:13px;color:#5f6368;margin:16px 0">It works for {minutes} minutes. If you did not ask for it, you can ignore this email.</div>'
        '<hr style="border:none;border-top:1px solid #dadce0;margin:24px 0"/>'
        f'<div style="font-size:12px;color:#5f6368">This is an automated message. Do not reply.<br/>&copy; {time.gmtime().tm_year} {BRAND}</div>'
        "</div></body></html>"
    )
    return subject, html, text


def send(to: str, subject: str, html: str, text: str) -> bool:
    """Sends one mail. True if sent, False if no provider is set up, MailError if a provider refused or could not be reached."""
    if os.environ.get("BREVO_API_KEY", "").strip():
        sender = _brevo_sender()
        try:
            r = httpx.post(f"{BREVO}/smtp/email", headers=_brevo_headers(), timeout=12,
                           json={"sender": sender, "to": [{"email": to}], "subject": subject, "htmlContent": html, "textContent": text})
        except httpx.HTTPError as e:
            log.warning("brevo send failed: %s", type(e).__name__)
            raise MailError("unreachable") from e
        if r.status_code >= 300:
            why = {401: "bad_key", 402: "no_credit", 403: "forbidden", 429: "rate_limited"}.get(r.status_code, f"refused_{r.status_code}")
            log.warning("brevo refused the mail: %s (%s)", r.status_code, str((r.json() if r.content else {}).get("message", ""))[:120])
            raise MailError(why)
        return True
    s = get_settings()
    if s.smtp_host:
        msg = EmailMessage()
        msg["Subject"], msg["From"], msg["To"] = subject, s.email_from or s.smtp_user, to
        msg.set_content(text)
        msg.add_alternative(html, subtype="html")
        try:
            with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=15) as smtp:
                smtp.starttls()
                if s.smtp_user:
                    smtp.login(s.smtp_user, s.smtp_password)
                smtp.send_message(msg)
        except (OSError, smtplib.SMTPException) as e:
            log.warning("smtp send failed: %s", type(e).__name__)
            raise MailError("unreachable") from e
        return True
    log.warning("No email provider configured: mail to %s not sent (set BREVO_API_KEY).", to)
    return False


def send_login_code(email: str, code: str, minutes: int) -> bool:
    subject, html, text = code_email(code, minutes)
    return send(email, subject, html, text)
