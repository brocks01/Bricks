from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import service

router = APIRouter(prefix="/v1/media")


@router.get("/status")
def status(_: str = Depends(current_user_id)):
    return {"enabled": service.enabled(), "max_bytes": service.MAX_BYTES}


@router.post("/upload")
async def upload(file: UploadFile = File(...), kind: str = Form("other"), user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    data = await file.read(service.MAX_BYTES + 1)
    try:
        return service.upload(conn, user_id, kind, data)
    except service.MediaError as e:
        return JSONResponse(status_code=e.status, content={"detail": {"code": e.code}})
