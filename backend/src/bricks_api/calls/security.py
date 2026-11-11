"""Every call webhook must be signed by Twilio (X-Twilio-Signature)."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request
from twilio.request_validator import RequestValidator

from ..config import Settings


def public_url(settings: Settings, request: Request) -> str:
    """The URL Twilio signed: our public address + path + query (ngrok rewrites the host)."""
    url = settings.public_base_url.rstrip("/") + request.url.path
    if request.url.query:
        url += "?" + request.url.query
    return url


async def twilio_form(request: Request) -> dict[str, str]:
    """The webhook's form fields, or 403 if Twilio didn't sign them."""
    settings: Settings = request.app.state.settings
    form = await request.form()
    params = {k: str(v) for k, v in form.items()}
    if not settings.twilio_validate_signature:
        return params
    token = settings.twilio_auth_token
    if token is None or not token.get_secret_value():
        raise HTTPException(500, "TWILIO_AUTH_TOKEN not set")
    signature = request.headers.get("X-Twilio-Signature", "")
    validator = RequestValidator(token.get_secret_value())
    if not validator.validate(public_url(settings, request), params, signature):
        raise HTTPException(403, "Invalid Twilio signature")
    return params


TwilioForm = Annotated[dict[str, str], Depends(twilio_form)]
