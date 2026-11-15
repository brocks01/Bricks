from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import events
from .service import MarketError

router = APIRouter(prefix="/v1/market")


class GoingIn(BaseModel):
    going: bool = True
    community_id: str | None = None


class PlanIn(BaseModel):
    on: bool = True


class StallIn(BaseModel):
    selling: str = Field(min_length=2, max_length=200)
    kind: str = Field(default="goods", pattern="^(goods|skill)$")
    helper_name: str | None = Field(default=None, max_length=60)
    slot: str = Field(default="whole", pattern="^(first|second|whole)$")


def _run(fn, *a):
    try:
        return fn(*a)
    except MarketError as e:
        return JSONResponse(status_code=e.status, content={"detail": {"code": e.code}})


@router.get("/events")
def list_events(limit: int = 10, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"events": events.list_events(conn, user_id, limit)}


@router.get("/events/{eid}")
def get_event(eid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(events.get_event, conn, user_id, eid)


@router.post("/events/{eid}/going")
def going(eid: str, body: GoingIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(events.set_going, conn, user_id, eid, body.going, body.community_id)


@router.post("/events/{eid}/communities/{cid}")
def plan(eid: str, cid: str, body: PlanIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(events.plan_community, conn, user_id, eid, cid, body.on)


@router.post("/events/{eid}/stall")
def take_stall(eid: str, body: StallIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(events.take_stall, conn, user_id, eid, body.selling, body.helper_name, body.slot, body.kind)


@router.delete("/events/{eid}/stall")
def cancel_stall(eid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(events.cancel_stall, conn, user_id, eid)


@router.get("/community-events/{cid}")
def for_community(cid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(lambda *_: {"events": events.for_community(conn, user_id, cid)})
