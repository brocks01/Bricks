"""The translation API. All four routes need a signed-in person; the permission on every item is the
original's own (a community membership check inside service), so a translation is only ever reachable by
someone who can already read the content it came from."""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import service
from .schemas import BatchIn, BatchOut, MeIn, MeOut, TextIn, TranslationOut

router = APIRouter(prefix="/v1")


def _refuse(e: service.TranslateError) -> JSONResponse:
    return JSONResponse(status_code=e.status, content={"detail": {"code": e.code, **e.extra}})


@router.post("/translate/batch", response_model=BatchOut)
def batch(body: BatchIn, conn: Connection = Depends(get_conn), user_id: str = Depends(current_user_id)) -> BatchOut | JSONResponse:
    """Translate stored content. The server loads each original itself from the database - the client never
    sends the text of something that is already saved - and refuses the whole request if any item is not
    readable by this person."""
    try:
        items = [i.model_dump() for i in body.items]
        return BatchOut(items=[TranslationOut(**a) for a in service.batch(conn, user_id, items, body.target)])
    except service.TranslateError as e:
        return _refuse(e)


@router.post("/translate/text", response_model=TranslationOut)
def text(body: TextIn, conn: Connection = Depends(get_conn), user_id: str = Depends(current_user_id)) -> TranslationOut | JSONResponse:
    """Free text the person has not saved yet (a draft preview). Same protections, counted against their
    day, never stored."""
    try:
        return TranslationOut(**service.draft(conn, user_id, body.text, body.target, body.source))
    except service.TranslateError as e:
        return _refuse(e)


@router.get("/me/translation", response_model=MeOut)
def get_me(conn: Connection = Depends(get_conn), user_id: str = Depends(current_user_id)) -> MeOut | JSONResponse:
    try:
        return MeOut(**service.preferences(conn, user_id))
    except service.TranslateError as e:
        return _refuse(e)


@router.put("/me/translation", response_model=MeOut)
def put_me(body: MeIn, conn: Connection = Depends(get_conn), user_id: str = Depends(current_user_id)) -> MeOut | JSONResponse:
    try:
        return MeOut(**service.set_preferences(conn, user_id, body.model_dump()))
    except service.TranslateError as e:
        return _refuse(e)
