"""Calendar routes. Every route needs the caller's own access token; acting on somebody else's calendar
always re-checks the family access on the server (`service.acting`), never trusting a body field."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import service
from .schemas import (CancelOut, HeartbeatIn, HeartbeatOut, ItemIdOut, ItemIn, ItemOut, ItemPatch, MarkIn, MarkOut, MissedOut, OccurrencesOut, PeopleOut)

router = APIRouter(prefix="/v1/calendar")


def _refuse(e: service.CalendarError):
    return JSONResponse(status_code=e.status, content={"detail": {"code": e.code, **e.extra}})


def _range(from_: str | None, to: str | None) -> tuple[datetime, datetime]:
    """The requested range, defaulted to now-3h .. now+7d, in UTC."""
    now = datetime.now(timezone.utc).replace(microsecond=0)
    try:
        start = datetime.fromisoformat(from_.replace("Z", "+00:00")) if from_ else now - timedelta(hours=3)
        end = datetime.fromisoformat(to.replace("Z", "+00:00")) if to else now + timedelta(days=7)
    except ValueError:
        raise service.CalendarError("validation", 422, field="from,to")
    if start.tzinfo is None or end.tzinfo is None:
        raise service.CalendarError("time_needs_offset", 422)
    return start.astimezone(timezone.utc), end.astimezone(timezone.utc)


@router.get("/people", response_model=PeopleOut)
def people(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"people": service.people(conn, user_id)}


@router.get("/occurrences", response_model=OccurrencesOut)
def occurrences(person_id: str | None = None, from_: str | None = Query(default=None, alias="from"),
                to: str | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        start, end = _range(from_, to)
        return {"occurrences": service.occurrences(conn, user_id, person_id, start, end, include_events=True)}
    except service.CalendarError as e:
        return _refuse(e)


@router.post("/items", response_model=ItemIdOut)
def create_item(body: ItemIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.create_item(conn, user_id, **body.model_dump())
    except service.CalendarError as e:
        return _refuse(e)


@router.post("/heartbeat", response_model=HeartbeatOut)
def heartbeat(body: HeartbeatIn | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """The app is open. A hint for the reminder loop, and the person's own time zone."""
    try:
        return service.heartbeat(conn, user_id, body.tz_offset_min if body else None)
    except service.CalendarError as e:
        return _refuse(e)


@router.get("/missed", response_model=MissedOut)
def missed(person_id: str | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return {"missed": service.missed(conn, user_id, person_id)}
    except service.CalendarError as e:
        return _refuse(e)


@router.get("/items/{item_id}", response_model=ItemOut)
def item_detail(item_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.item_detail(conn, user_id, item_id)
    except service.CalendarError as e:
        return _refuse(e)


@router.patch("/items/{item_id}", response_model=ItemIdOut)
def update_item(item_id: str, body: ItemPatch, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.update_item(conn, user_id, item_id, **body.model_dump(exclude_unset=True))
    except service.CalendarError as e:
        return _refuse(e)


@router.delete("/items/{item_id}", response_model=CancelOut)
def cancel_item(item_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.cancel_item(conn, user_id, item_id)
    except service.CalendarError as e:
        return _refuse(e)


@router.post("/items/{item_id}/mark", response_model=MarkOut)
def mark(item_id: str, body: MarkIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.mark(conn, user_id, item_id, body.occurs_at, body.status)
    except service.CalendarError as e:
        return _refuse(e)


@router.delete("/items/{item_id}/mark", response_model=MarkOut)
def unmark(item_id: str, occurs_at: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    try:
        return service.unmark(conn, user_id, item_id, occurs_at)
    except service.CalendarError as e:
        return _refuse(e)
