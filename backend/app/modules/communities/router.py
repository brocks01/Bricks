import uuid
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import service

router = APIRouter(prefix="/v1/communities")


class CreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    kind: Literal["apartment", "block", "neighbourhood", "club", "other"] = "apartment"
    description: str | None = Field(default=None, max_length=500)
    area_name: str | None = Field(default=None, max_length=120)
    privacy: Literal["open", "invite"] = "invite"


class JoinIn(BaseModel):
    code: str = Field(min_length=4, max_length=20)


class RsvpIn(BaseModel):
    going: bool = True


def _refuse(e: service.CommunityError) -> JSONResponse:
    return JSONResponse(status_code=e.status, content={"detail": {"code": e.code}})


@router.get("/mine")
def mine(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"communities": service.my_communities(conn, user_id)}


@router.post("")
def create(body: CreateIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.create(conn, user_id, body.model_dump())


@router.post("/join")
def join(body: JoinIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.join(conn, user_id, body.code)
    except service.CommunityError as e:
        return _refuse(e)


@router.get("/{community_id}")
def detail(community_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        uuid.UUID(community_id)
    except ValueError:
        return JSONResponse(status_code=404, content={"detail": {"code": "not_found"}})
    try:
        return service.detail(conn, user_id, community_id)
    except service.CommunityError as e:
        return _refuse(e)


@router.post("/activities/{activity_id}/going")
def going(activity_id: str, body: RsvpIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.rsvp(conn, user_id, activity_id, body.going)
    except service.CommunityError as e:
        return _refuse(e)
