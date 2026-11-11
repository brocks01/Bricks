from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import service

router = APIRouter(prefix="/v1/explore")


class SaveIn(BaseModel):
    saved: bool = True


class ProgressIn(BaseModel):
    percent: int = Field(ge=0, le=100)


class InterestsIn(BaseModel):
    categories: list[str] = Field(max_length=12)


def _refuse(e: service.ExploreError) -> JSONResponse:
    return JSONResponse(status_code=e.status, content={"detail": {"code": e.code}})


@router.get("/home")
def home(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.home(conn, user_id)


@router.get("/categories")
def categories(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"categories": service.categories(conn, user_id)}


@router.get("/items")
def items(category: str | None = None, q: str | None = None, limit: int = 50, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return {"items": service.items(conn, user_id, category, q, limit)}
    except service.ExploreError as e:
        return _refuse(e)


@router.get("/mine")
def mine(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.mine(conn, user_id)


@router.get("/interests")
def get_interests(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"categories": service.get_interests(conn, user_id)}


@router.put("/interests")
def put_interests(body: InterestsIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"categories": service.set_interests(conn, user_id, body.categories)}


@router.get("/items/{item_id}")
def one(item_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.item(conn, user_id, item_id)
    except service.ExploreError as e:
        return _refuse(e)


@router.post("/items/{item_id}/save")
def save(item_id: str, body: SaveIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.set_saved(conn, user_id, item_id, body.saved)
    except service.ExploreError as e:
        return _refuse(e)


@router.post("/items/{item_id}/progress")
def progress(item_id: str, body: ProgressIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.set_progress(conn, user_id, item_id, body.percent)
    except service.ExploreError as e:
        return _refuse(e)
