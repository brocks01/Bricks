from fastapi import APIRouter, Depends
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
def run_skill(name: str, body: RunIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Runs one skill as the signed-in person. A refusal is a normal answer ({"error": code}), not an HTTP error, so every channel treats it the same way."""
    return registry.run(conn, user_id, name, body.args)
