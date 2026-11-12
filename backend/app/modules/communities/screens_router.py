import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import screens
from .service import CommunityError

router = APIRouter(prefix="/v1/communities")


class ActivityIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    category: str | None = Field(default=None, max_length=60)
    starts_at: datetime
    ends_at: datetime | None = None
    location: str | None = Field(default=None, max_length=160)
    capacity: int | None = Field(default=None, gt=0, le=10000)


class InitiativeIn(BaseModel):
    title: str = Field(min_length=2, max_length=80)
    summary: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=1500)
    current_plan: str | None = Field(default=None, max_length=300)


class JoinedIn(BaseModel):
    joined: bool = True


class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=500)


class LikeIn(BaseModel):
    liked: bool = True


def _call(ids: list[str], fn, *args, wrap: str | None = None):
    """Runs one screens function; a malformed id is a 404 and a refusal is returned (not raised) so database changes are kept."""
    try:
        for i in ids:
            uuid.UUID(i)
        out = fn(*args)
    except ValueError:
        return JSONResponse(status_code=404, content={"detail": {"code": "not_found"}})
    except CommunityError as e:
        return JSONResponse(status_code=e.status, content={"detail": {"code": e.code}})
    return {wrap: out} if wrap else out


@router.get("/activities/{activity_id}")
def activity_detail(activity_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _call([activity_id], screens.activity_detail, conn, user_id, activity_id)


@router.get("/initiatives/{initiative_id}")
def initiative_detail(initiative_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _call([initiative_id], screens.initiative_detail, conn, user_id, initiative_id)


@router.post("/initiatives/{initiative_id}/join")
def initiative_join(initiative_id: str, body: JoinedIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _call([initiative_id], screens.join_initiative, conn, user_id, initiative_id, body.joined)


@router.get("/updates/{announcement_id}")
def update_detail(announcement_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _call([announcement_id], screens.update_detail, conn, user_id, announcement_id)


@router.post("/updates/{announcement_id}/comments")
def update_comment(announcement_id: str, body: CommentIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _call([announcement_id], screens.comment_on_update, conn, user_id, announcement_id, body.body)


@router.post("/updates/{announcement_id}/like")
def update_like(announcement_id: str, body: LikeIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _call([announcement_id], screens.like_update, conn, user_id, announcement_id, body.liked)


@router.get("/{community_id}/activities")
def activities(community_id: str, when: str = "upcoming", category: str | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _call([community_id], screens.list_activities, conn, user_id, community_id, when, category, wrap="activities")


@router.get("/{community_id}/activity-categories")
def categories(community_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _call([community_id], screens.activity_categories, conn, user_id, community_id, wrap="categories")


@router.post("/{community_id}/activities")
def activity_create(community_id: str, body: ActivityIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _call([community_id], screens.create_activity, conn, user_id, community_id, body.model_dump())


@router.get("/{community_id}/members")
def members(community_id: str, q: str | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _call([community_id], screens.list_members, conn, user_id, community_id, q, wrap="members")


@router.get("/{community_id}/invite")
def invite(community_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _call([community_id], screens.invite_info, conn, user_id, community_id)


@router.get("/{community_id}/initiatives")
def initiatives(community_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _call([community_id], screens.list_initiatives, conn, user_id, community_id, wrap="initiatives")


@router.post("/{community_id}/initiatives")
def initiative_create(community_id: str, body: InitiativeIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _call([community_id], screens.create_initiative, conn, user_id, community_id, body.model_dump())
