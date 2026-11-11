from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import service

router = APIRouter(prefix="/v1/grow")


class AspirationIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    category: Literal["travel", "hobby", "health", "family", "own"] = "own"
    note: str | None = Field(default=None, max_length=500)


class DoneIn(BaseModel):
    done: bool = True


class ReadingIn(BaseModel):
    kind: Literal["heart_rate", "sleep_hours", "weight_kg", "blood_pressure"]
    value: float = Field(gt=0, le=1000)
    value2: float | None = Field(default=None, gt=0, le=1000)


class ActivityIn(BaseModel):
    kind: Literal["walk", "jog", "yoga", "exercise", "other"] = "walk"
    minutes: int = Field(ge=1, le=600)
    on: date | None = None


class ContributionIn(BaseModel):
    community_id: str
    kind: Literal["time", "skill", "goods", "money"] = "time"
    description: str = Field(min_length=2, max_length=300)
    hours: float | None = Field(default=None, gt=0, le=200)


def _refuse(e: service.GrowError) -> JSONResponse:
    return JSONResponse(status_code=e.status, content={"detail": {"code": e.code}})


def _run(fn, *a):
    try:
        return fn(*a)
    except service.GrowError as e:
        return _refuse(e)


@router.get("/progress")
def progress(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.progress(conn, user_id)


@router.get("/aspirations")
def aspirations(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"aspirations": service.aspirations(conn, user_id)}


@router.post("/aspirations")
def add_aspiration(body: AspirationIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.add_aspiration, conn, user_id, body.title, body.category, body.note)


@router.post("/aspirations/{aid}/done")
def aspiration_done(aid: str, body: DoneIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.set_aspiration_done, conn, user_id, aid, body.done)


@router.delete("/aspirations/{aid}")
def aspiration_delete(aid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.delete_aspiration, conn, user_id, aid)


@router.get("/health")
def health(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.health(conn, user_id)


@router.post("/health/readings")
def add_reading(body: ReadingIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.add_reading, conn, user_id, body.kind, body.value, body.value2)


@router.delete("/health/readings/{rid}")
def reading_delete(rid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.delete_reading, conn, user_id, rid)


@router.get("/activity")
def activity(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.activity(conn, user_id)


@router.post("/activity")
def add_activity(body: ActivityIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.add_activity, conn, user_id, body.kind, body.minutes, body.on)


@router.delete("/activity/{aid}")
def activity_delete(aid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.delete_activity, conn, user_id, aid)


@router.get("/contributions")
def contributions(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.contributions(conn, user_id)


@router.post("/contributions")
def add_contribution(body: ContributionIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.add_contribution, conn, user_id, body.community_id, body.kind, body.description, body.hours)
