"""POST /assistant/turn: Buddy's brain for the app (voice 2.1). Contract: assistant/contract.py.

The phone and WhatsApp handlers call `assistant.orchestrator.turn()` directly.
"""

from fastapi import APIRouter

from ..assistant.contract import TurnIn, TurnOut
from ..assistant.orchestrator import turn
from ..deps import CtxDep

router = APIRouter(tags=["assistant"])


@router.post("/assistant/turn")
async def assistant_turn(body: TurnIn, ctx: CtxDep) -> TurnOut:
    return await turn(ctx, body)
