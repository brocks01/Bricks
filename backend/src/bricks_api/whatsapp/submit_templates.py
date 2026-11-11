"""Submits our WhatsApp templates to Meta, or shows their approval status (iteration 1.2).

    uv run python -m bricks_api.whatsapp.submit_templates            # submit any missing
    uv run python -m bricks_api.whatsapp.submit_templates --status   # the tracker
    uv run python -m bricks_api.whatsapp.submit_templates --only daily_checkin

Every template in `templates.DEFS` goes in as UTILITY, in en / ms / zh_CN / ta,
with sample values and the STOP footer. Ones that already exist are skipped, so
it's safe to run again after fixing a rejection (delete the rejected one first in
WhatsApp Manager, or rename it).
"""

import argparse
import asyncio
import re
import sys
from typing import Any

import httpx

from ..config import Settings, get_settings
from .providers import META_LANGUAGE
from .templates import DEFS, FOOTER


def component_list(name: str, lang: str) -> list[dict[str, Any]]:
    d = DEFS[name]
    body: dict[str, Any] = {"type": "BODY", "text": d.body[lang]}
    if d.params:
        body["example"] = {"body_text": [d.examples]}
    return [
        body,
        {"type": "FOOTER", "text": FOOTER[lang]},
        {
            "type": "BUTTONS",
            "buttons": [{"type": "QUICK_REPLY", "text": b} for b in d.buttons[lang]],
        },
    ]


async def existing(client: httpx.AsyncClient, base: str) -> dict[tuple[str, str], dict[str, Any]]:
    found: dict[tuple[str, str], dict[str, Any]] = {}
    url: str | None = (
        f"{base}/message_templates?fields=name,language,status,category,rejected_reason&limit=100"
    )
    while url:
        r = await client.get(url)
        r.raise_for_status()
        data = r.json()
        for t in data.get("data", []):
            found[(t["name"], t["language"])] = t
        url = data.get("paging", {}).get("next")
    return found


async def main(settings: Settings, status_only: bool, only: str | None) -> int:
    token = settings.meta_wa_token
    if not token or not settings.meta_wa_waba_id:
        print("Set META_WA_TOKEN and META_WA_WABA_ID in backend/.env first.")
        return 1
    base = f"https://graph.facebook.com/{settings.meta_graph_version}/{settings.meta_wa_waba_id}"
    headers = {"Authorization": f"Bearer {token.get_secret_value()}"}
    async with httpx.AsyncClient(headers=headers, timeout=30) as client:
        have = await existing(client, base)
        names = [only] if only else list(DEFS)
        failed = 0
        for name in names:
            row = []
            for lang, code in META_LANGUAGE.items():
                current = have.get((name, code))
                if current or status_only:
                    state = current["status"] if current else "-"
                    if current and current.get("rejected_reason") not in (None, "NONE"):
                        state += f" ({current['rejected_reason']})"
                    row.append(f"{code}: {state}")
                    continue
                category = "UTILITY"
                for _ in range(2):
                    r = await client.post(
                        f"{base}/message_templates",
                        json={
                            "name": name,
                            "language": code,
                            "category": category,
                            "components": component_list(name, lang),
                        },
                    )
                    error = {} if r.is_success else r.json().get("error", {})
                    message = str(error.get("error_user_msg") or error.get("message", r.text))
                    # Meta may move a template to another category (e.g. MARKETING), and
                    # all of a template's languages must share it: retry with that one.
                    moved = re.search(r"associated with this template, ([A-Z_]+)", message)
                    if r.is_success or not moved:
                        break
                    category = moved.group(1)
                if r.is_success:
                    row.append(f"{code}: submitted as {category} ({r.json().get('status', '?')})")
                else:
                    failed += 1
                    row.append(f"{code}: FAILED {re.sub(r'\\s+', ' ', message)[:120]}")
            print(f"{name:24} " + " | ".join(row))
        return 1 if failed else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0] if __doc__ else "")
    parser.add_argument("--status", action="store_true", help="only show what Meta has")
    parser.add_argument("--only", choices=sorted(DEFS), help="one template")
    args = parser.parse_args()
    sys.exit(asyncio.run(main(get_settings(), args.status, args.only)))
