from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import rules, service

router = APIRouter(prefix="/v1/nodes")


class AttachIn(BaseModel):
    type: str
    title: str = Field(min_length=1, max_length=200)
    parent_id: str = ""
    kind: str = Field(default="", max_length=40)
    description: str = Field(default="", max_length=1000)
    requires: list[str] = []
    badge: dict | None = None


class RenameIn(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    kind: str | None = Field(default=None, max_length=40)


class MoveIn(BaseModel):
    new_parent_id: str


class BadgeIn(BaseModel):
    badge: dict
    v: int | None = None


class RequiresIn(BaseModel):
    requires: list[str] = []


def _run(fn, *a, **k):
    try:
        return fn(*a, **k)
    except rules.NodeError as e:
        return JSONResponse(status_code=e.status, content={"detail": {"code": e.code, "message": e.message}})


@router.get("/tree")
def tree(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.tree(conn, user_id)


@router.post("")
def attach(body: AttachIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.attach, conn, user_id, body.type, body.title, body.parent_id, body.kind, body.description, body.requires, body.badge)


@router.get("/{nid}")
def get(nid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.get, conn, user_id, nid)


@router.get("/{nid}/children")
def children(nid: str, limit: int = 50, after: int = -1, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.children, conn, user_id, nid, limit, after)


@router.get("/{nid}/path")
def path(nid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(lambda: {"path": service.path_of(conn, user_id, nid)})


@router.patch("/{nid}")
def rename(nid: str, body: RenameIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.rename, conn, user_id, nid, body.title, body.description, body.kind)


@router.post("/{nid}/move")
def move(nid: str, body: MoveIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.move, conn, user_id, nid, body.new_parent_id)


@router.post("/{nid}/archive")
def archive(nid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.archive, conn, user_id, nid)


@router.post("/{nid}/badge")
def badge(nid: str, body: BadgeIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.set_badge, conn, user_id, nid, body.badge, body.v)


@router.post("/{nid}/requires")
def requires(nid: str, body: RequiresIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.set_requires, conn, user_id, nid, body.requires)
