"""Have the Bricks number call a phone, for testing without dialling abroad.

    uv run python -m bricks_api.calls.call_me +9198XXXXXXXX          # the call loop
    uv run python -m bricks_api.calls.call_me +9198XXXXXXXX hello    # 0.1's greeting

The call runs the same webhooks as someone calling in (/voice/incoming or /voice/hello at
PUBLIC_BASE_URL), so the backend and the tunnel must be running. The number must be a
verified caller ID while on a trial, and its country must be on in Voice geo permissions.

Needs an upgraded Twilio account: on a trial, calls placed through the API may only run
Twilio's own sample scripts, not our webhooks (calls coming in do run them).
"""

import argparse
import re

from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

from ..config import get_settings

PATHS = {"loop": "/voice/incoming", "hello": "/voice/hello"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("to", help="the phone to call, E.164 (+91..., +65...)")
    parser.add_argument("what", nargs="?", choices=sorted(PATHS), default="loop")
    args = parser.parse_args()
    to = re.sub(r"[\s-]", "", args.to)
    if not re.fullmatch(r"\+\d{8,15}", to):
        parser.error("give the number in E.164, like +919876543210")

    s = get_settings()
    token = s.twilio_auth_token.get_secret_value() if s.twilio_auth_token else ""
    if not (s.twilio_account_sid and token and s.twilio_number):
        raise SystemExit("Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_NUMBER in .env")
    url = s.public_base_url.rstrip("/") + PATHS[args.what]
    try:
        call = Client(s.twilio_account_sid, token).calls.create(
            to=to, from_=s.twilio_number, url=url, method="POST"
        )
    except TwilioRestException as error:
        if "trial" in str(error.msg).lower():
            raise SystemExit(
                "Twilio said no: on a trial account, calls we place can only run Twilio's own"
                " sample scripts. Upgrade the account (Console -> Billing) to call out with"
                " Bricks, or call the Bricks number instead."
            ) from None
        raise SystemExit(f"Twilio said no ({error.code}): {error.msg}") from None
    print(f"Calling ...{to[-3:]} ({args.what}): call {call.sid}, status {call.status}")
    print(f"Twilio will fetch {url} when you pick up.")


if __name__ == "__main__":
    main()
