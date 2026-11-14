"""Routes for the community rules (cap, explore, leave, family view, requests). Included BEFORE the main communities router, because that one has /{community_id}."""
import uuid
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import rules
from .service import CommunityError

router = APIRouter(prefix="/v1/communities")


class RequestIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    kind: Literal["apartment", "block", "neighbourhood", "club", "other"] = "neighbourhood"
    area_name: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    why: str | None = Field(default=None, max_length=1000)


class DecideIn(BaseModel):
    approve: bool
    note: str | None = Field(default=None, max_length=300)


class ShareIn(BaseModel):
    share: bool


def _is_uuid(v: str) -> bool:
    try:
        uuid.UUID(v)
        return True
    except ValueError:
        return False


def _refuse(e: CommunityError) -> JSONResponse:
    return JSONResponse(status_code=e.status, content={"detail": {"code": e.code}})


@router.get("/limits")
def limits(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return rules.limits(conn, user_id)


@router.get("/explore")
def explore(q: str = "", limit: int = 30, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return rules.explore(conn, user_id, q, limit)


@router.get("/experience")
def experience(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return rules.experience(conn, user_id)


@router.post("/requests")
def request_create(body: RequestIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return rules.request_create(conn, user_id, body.model_dump())
    except CommunityError as e:
        return _refuse(e)


@router.get("/requests/mine")
def my_requests(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"requests": rules.my_requests(conn, user_id)}


@router.get("/requests/review")
def review(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return {"requests": rules.review_list(conn, user_id)}
    except CommunityError as e:
        return _refuse(e)


@router.post("/requests/{request_id}/decide")
def decide(request_id: str, body: DecideIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    if not _is_uuid(request_id):
        return JSONResponse(status_code=404, content={"detail": {"code": "not_found"}})
    try:
        return rules.decide(conn, user_id, request_id, body.approve, body.note)
    except CommunityError as e:
        return _refuse(e)


@router.post("/requests/{request_id}/create")
def create_from_request(request_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    if not _is_uuid(request_id):
        return JSONResponse(status_code=404, content={"detail": {"code": "not_found"}})
    try:
        return rules.create_from_request(conn, user_id, request_id)
    except CommunityError as e:
        return _refuse(e)


@router.post("/{community_id}/join")
def join_open(community_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    if not _is_uuid(community_id):
        return JSONResponse(status_code=404, content={"detail": {"code": "not_found"}})
    try:
        return rules.join_open(conn, user_id, community_id)
    except CommunityError as e:
        return _refuse(e)


@router.post("/{community_id}/leave")
def leave(community_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    if not _is_uuid(community_id):
        return JSONResponse(status_code=404, content={"detail": {"code": "not_found"}})
    try:
        return rules.leave(conn, user_id, community_id)
    except CommunityError as e:
        return _refuse(e)


@router.post("/{community_id}/share")
def share(community_id: str, body: ShareIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    if not _is_uuid(community_id):
        return JSONResponse(status_code=404, content={"detail": {"code": "not_found"}})
    try:
        return rules.set_share(conn, user_id, community_id, body.share)
    except CommunityError as e:
        return _refuse(e)
