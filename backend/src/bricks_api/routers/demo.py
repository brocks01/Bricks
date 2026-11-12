"""Demo controls (iteration 2.3): reset to the seeded story, and the accounts the
stage demo switches between. Only on a demo server (DEMO_MODE): on any other
server these routes don't exist (404), so they can never wipe real data.
"""

import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from ..db import Conn
from ..deps import get_conn
from ..schemas import DemoAccount, DemoReset
from ..seed import DEMO_ACCOUNTS, seed

router = APIRouter(tags=["demo"])


def _demo_only(request: Request) -> None:
    if not request.app.state.settings.demo_mode:
        raise HTTPException(404, "Not found")


@router.post("/demo/reset")
async def reset_demo(request: Request, conn: Annotated[Conn, Depends(get_conn)]) -> DemoReset:
    """Wipes everything and seeds the demo story again, dated from now."""
    _demo_only(request)
    started = time.monotonic()
    await seed(
        conn, request.app.state.settings, request.app.state.clock(), request.app.state.storage
    )
    return DemoReset(seconds=round(time.monotonic() - started, 2))


@router.get("/demo/accounts")
async def demo_accounts(
    request: Request, conn: Annotated[Conn, Depends(get_conn)]
) -> list[DemoAccount]:
    """Who the demo can be signed in as (sent back in the X-Demo-User header).
    Only accounts in the database: one seeded before an account was added gets
    it on the next reset."""
    _demo_only(request)
    ids = [uid for uid, _, _ in DEMO_ACCOUNTS]
    rows = await (await conn.execute("select id from users where id = any(%s)", (ids,))).fetchall()
    present = {str(row["id"]) for row in rows}
    return [
        DemoAccount(id=uid, name=name, role=role)
        for uid, name, role in DEMO_ACCOUNTS
        if uid in present
    ]
