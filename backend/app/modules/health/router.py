from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import service

router = APIRouter(prefix="/v1/health")
Blood = Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]


class CheckinIn(BaseModel):
    moved: bool
    feeling: int | None = Field(default=None, ge=1, le=5)


class WalkIn(BaseModel):
    started_at: datetime
    duration_s: int = Field(ge=10, le=86400)
    moving_s: int = Field(ge=0, le=86400)
    distance_m: int = Field(ge=0, le=200000)
    steps: int = Field(ge=0, le=200000)


class CardIn(BaseModel):
    blood_group: Blood | None = None
    conditions: str | None = Field(default=None, max_length=600)
    medicines: str | None = Field(default=None, max_length=600)
    allergies: str | None = Field(default=None, max_length=300)
    contact_name: str | None = Field(default=None, max_length=80)
    contact_phone: str | None = Field(default=None, max_length=30)


class HelpIn(BaseModel):
    message: str | None = Field(default=None, max_length=300)


def _run(fn, *a, **k):
    try:
        return fn(*a, **k)
    except service.HealthError as e:
        return JSONResponse(status_code=e.status, content={"detail": {"code": e.code}})


@router.get("/status")
def status(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.status(conn, user_id)


@router.post("/checkin")
def checkin(body: CheckinIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.checkin(conn, user_id, body.moved, body.feeling)


@router.get("/summary")
def summary(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.summary(conn, user_id)


@router.get("/walks")
def walks(limit: int = 30, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.list_walks(conn, user_id, limit)


@router.post("/walks")
def save_walk(body: WalkIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    b = body.model_dump()
    if b["started_at"].tzinfo is None:
        b["started_at"] = b["started_at"].replace(tzinfo=timezone.utc)
    return _run(service.save_walk, conn, user_id, b)


@router.delete("/walks/{walk_id}")
def delete_walk(walk_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.delete_walk, conn, user_id, walk_id)


@router.get("/card")
def card(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.get_card(conn, user_id)


@router.put("/card")
def put_card(body: CardIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.put_card(conn, user_id, body.model_dump())


@router.post("/help")
def send_help(body: HelpIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.send_help, conn, user_id, body.message)


@router.get("/help/inbox")
def help_inbox(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"alerts": service.help_inbox(conn, user_id)}


@router.post("/help/{alert_id}/close")
def close_help(alert_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.close_help, conn, user_id, alert_id)
