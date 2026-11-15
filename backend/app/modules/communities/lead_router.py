"""Routes for the leader tools, votes, the rota and check-in. Included BEFORE the main communities router, because that one has /{community_id}."""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import lead
from .service import CommunityError

router = APIRouter(prefix="/v1/communities")


class VoteIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    options: list[str] = Field(min_length=2, max_length=6)


class BallotIn(BaseModel):
    option_id: str


class RotaIn(BaseModel):
    weekday: int = Field(ge=0, le=6)
    label: str = Field(default="", max_length=80)
    capacity: int = Field(default=3, ge=1, le=20)
    weeks: int = Field(default=4, ge=1, le=8)


class SignupIn(BaseModel):
    on: bool = True


class CheckinIn(BaseModel):
    user_id: str | None = None


def _run(fn, *a):
    try:
        return fn(*a)
    except CommunityError as e:
        return JSONResponse(status_code=e.status, content={"detail": {"code": e.code}})


@router.get("/{cid}/lead")
def lead_view(cid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(lead.lead_view, conn, user_id, cid)


@router.get("/{cid}/vote")
def get_vote(cid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(lambda: {"vote": lead.vote(conn, user_id, cid)})


@router.post("/{cid}/votes")
def start_vote(cid: str, body: VoteIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(lead.start_vote, conn, user_id, cid, body.title, body.options)


@router.post("/votes/{vote_id}/ballot")
def cast(vote_id: str, body: BallotIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(lead.cast, conn, user_id, vote_id, body.option_id)


@router.post("/votes/{vote_id}/close")
def close_vote(vote_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(lead.close_vote, conn, user_id, vote_id)


@router.get("/{cid}/rota")
def rota(cid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(lambda: {"slots": lead.rota(conn, user_id, cid)})


@router.post("/{cid}/rota")
def make_rota(cid: str, body: RotaIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(lead.make_rota, conn, user_id, cid, body.weekday, body.label, body.capacity, body.weeks)


@router.post("/rota/{slot_id}/signup")
def signup(slot_id: str, body: SignupIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(lead.rota_signup, conn, user_id, slot_id, body.on)


@router.post("/activities/{activity_id}/checkin")
def checkin(activity_id: str, body: CheckinIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(lead.check_in, conn, user_id, activity_id, body.user_id)
