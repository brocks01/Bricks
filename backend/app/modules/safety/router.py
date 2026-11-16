"""The safety module's door: report something, see my reports, block a person; admins review."""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import service

router = APIRouter(prefix="/v1")


class ReportIn(BaseModel):
    target_kind: str
    target_id: str
    reason: str
    note: str | None = Field(default=None, max_length=500)


class ResolveIn(BaseModel):
    action: str


class BlockIn(BaseModel):
    person_id: str


def _refuse(e: service.SafetyError) -> JSONResponse:
    return JSONResponse(status_code=e.status, content={"detail": {"code": e.code, **e.extra}})


@router.post("/reports", status_code=201)
def file_report(body: ReportIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.report(conn, user_id, body.target_kind, body.target_id, body.reason, body.note)
    except service.SafetyError as e:
        return _refuse(e)


@router.get("/reports/mine")
def reports_mine(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"reports": service.my_reports(conn, user_id)}


@router.get("/admin/reports")
def admin_reports(status: str | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return {"reports": service.admin_reports(conn, user_id, status)}
    except service.SafetyError as e:
        return _refuse(e)


@router.post("/admin/reports/{report_id}/resolve")
def resolve_report(report_id: str, body: ResolveIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.resolve(conn, user_id, report_id, body.action)
    except service.SafetyError as e:
        return _refuse(e)


@router.post("/blocks", status_code=201)
def make_block(body: BlockIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.block(conn, user_id, body.person_id)
    except service.SafetyError as e:
        return _refuse(e)


@router.get("/blocks")
def blocks_mine(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"blocks": service.my_blocks(conn, user_id)}


@router.delete("/blocks/{person_id}")
def remove_block(person_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.unblock(conn, user_id, person_id)
    except service.SafetyError as e:
        return _refuse(e)
