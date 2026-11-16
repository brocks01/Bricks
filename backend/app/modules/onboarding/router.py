from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import rules, service

router = APIRouter(prefix="/v1/onboarding")
profile_router = APIRouter(prefix="/v1")


class AnswerIn(BaseModel):
    answers: dict = Field(default_factory=dict)


def _refuse(e: rules.OnboardingError):
    return JSONResponse(status_code=400, content={"detail": {"code": e.code, "message": e.message}})


@router.get("")
def get_state(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Every section that applies to this person, with its questions, what they already answered, and which one is next."""
    return service.state(conn, user_id)


@router.put("/{section}")
def put_answers(section: str, body: AnswerIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Save some or all of one section's answers (any order, in parts). Returns the new state."""
    try:
        return service.answer(conn, user_id, section, body.answers)
    except rules.OnboardingError as e:
        return _refuse(e)


@router.post("/{section}/skip")
def skip_section(section: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.skip(conn, user_id, section)
    except rules.OnboardingError as e:
        return _refuse(e)


@profile_router.get("/profile")
def get_profile(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Who this person is to Wisdom: their roles, the surfaces to show them, and whether setup is finished."""
    return service.profile(conn, user_id)
