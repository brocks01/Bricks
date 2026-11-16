"""Routes for the belonging layer: the days a circle keeps, who is away (only when they chose to share it), what people send for a day
from wherever they are, the circle's stories, and the festival calendar. One router, mounted with the other community routers."""
import uuid
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..communities.service import CommunityError
from ..identity.router import current_user_id
from . import service

router = APIRouter(prefix="/v1")


class DayIn(BaseModel):
    festival_id: str | None = None
    name: str | None = Field(default=None, max_length=80)
    starts_on: str | None = Field(default=None, max_length=10)
    ends_on: str | None = Field(default=None, max_length=10)
    tradition: str | None = Field(default=None, max_length=300)


class PresenceIn(BaseModel):
    status: Literal["here", "away"]
    place: str | None = Field(default=None, max_length=120)
    share: bool | None = None


class ContributionIn(BaseModel):
    day_id: str | None = None
    kind: Literal["blessing", "message", "recipe", "story"] = "message"
    body: str = Field(min_length=1, max_length=1000)
    audio_url: str | None = Field(default=None, max_length=500)


class FestivalIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    tradition: str | None = Field(default=None, max_length=300)
    regions: list[str] = Field(default_factory=list, max_length=20)
    starts_on: str
    ends_on: str | None = None


class ShareIn(BaseModel):
    community_id: str | None = None


def _is_uuid(v: str) -> bool:
    try:
        uuid.UUID(v)
        return True
    except ValueError:
        return False


def _run(fn, *a):
    try:
        return fn(*a)
    except CommunityError as e:
        return JSONResponse(status_code=e.status, content={"detail": {"code": e.code}})


def _no_such() -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": {"code": "not_found"}})


# ---------- our days: what the circle keeps ----------
@router.get("/communities/{cid}/days")
def days(cid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    if not _is_uuid(cid):
        return _no_such()
    return _run(service.coming_days, conn, user_id, cid)


@router.post("/communities/{cid}/days")
def add_day(cid: str, body: DayIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """A leader gives the circle a day to keep: from the festival calendar (its real dates travel with it) or a day of its own."""
    if not _is_uuid(cid):
        return _no_such()
    return _run(service.add_day, conn, user_id, cid, body.model_dump())


@router.delete("/communities/{cid}/days/{day_id}")
def remove_day(cid: str, day_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    if not _is_uuid(cid) or not _is_uuid(day_id):
        return _no_such()
    return _run(service.remove_day, conn, user_id, cid, day_id)


# ---------- presence: here or away, shared only by the person's own choice ----------
@router.get("/communities/{cid}/presence")
def my_presence(cid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """The person's own presence in this circle. Never anyone else's."""
    if not _is_uuid(cid):
        return _no_such()
    return _run(service.presence_of, conn, user_id, cid)


@router.put("/communities/{cid}/presence")
def set_presence(cid: str, body: PresenceIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Say you are away (with where, if you want) or back, and choose whether the circle may see it."""
    if not _is_uuid(cid):
        return _no_such()
    return _run(service.set_presence, conn, user_id, cid, body.status, body.place, body.share)


# ---------- taking part from afar ----------
@router.get("/communities/{cid}/contributions")
def contributions(cid: str, day_id: str | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    if not _is_uuid(cid) or (day_id and not _is_uuid(day_id)):
        return _no_such()
    return _run(service.list_contributions, conn, user_id, cid, day_id)


@router.post("/communities/{cid}/contributions")
def add_contribution(cid: str, body: ContributionIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    if not _is_uuid(cid) or (body.day_id and not _is_uuid(body.day_id)):
        return _no_such()
    return _run(service.add_contribution, conn, user_id, cid, body.day_id, body.kind, body.body, body.audio_url)


@router.post("/communities/contributions/{contribution_id}/hide")
def hide(contribution_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """A leader takes one contribution out of the circle's view (the person's words are kept, not deleted)."""
    if not _is_uuid(contribution_id):
        return _no_such()
    return _run(service.hide_contribution, conn, user_id, contribution_id)


# ---------- the circle's stories ----------
@router.get("/communities/{cid}/stories")
def stories(cid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    if not _is_uuid(cid):
        return _no_such()
    return _run(service.circle_stories, conn, user_id, cid)


@router.post("/wisdom/capsules/{capsule_id}/share-to-circle")
def share_to_circle(capsule_id: str, body: ShareIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Share one of my own stories into a circle I am in; with no community_id it takes it back."""
    if not _is_uuid(capsule_id) or (body.community_id and not _is_uuid(body.community_id)):
        return _no_such()
    return _run(service.share_to_circle, conn, user_id, capsule_id, body.community_id)


# ---------- the festival calendar: platform admins enter the real dates ----------
@router.get("/festivals")
def list_festivals(conn: Connection = Depends(get_conn)):
    return service.festivals(conn)


@router.post("/festivals")
def add_festival(body: FestivalIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.add_festival, conn, user_id, body.model_dump())
