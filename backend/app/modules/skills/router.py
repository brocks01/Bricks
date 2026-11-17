from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import registry

router = APIRouter(prefix="/v1/skills")


class RunIn(BaseModel):
    args: dict = Field(default_factory=dict)


@router.get("")
def list_skills(_: str = Depends(current_user_id)):
    return {"skills": registry.listing()}


@router.post("/{name}")
def run_skill(name: str, body: RunIn, request: Request, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Runs one skill as the signed-in person. A refusal is a normal answer ({"error": code}), not an HTTP error, so every channel treats it the same way."""
    result = registry.run(conn, user_id, name, body.args)
    if isinstance(result, dict) and result.get("error"):
        request.state.live_quiet = True  # nothing was changed: the live link must not tell anyone to refresh
    return result
