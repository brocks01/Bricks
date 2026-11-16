from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import service

router = APIRouter(prefix="/v1/wisdom")


class CapsuleIn(BaseModel):
    title: str
    body: str
    kind: str = "social"
    tags: list[str] = Field(default_factory=list)
    source: str = "app"


class OfferIn(BaseModel):
    title: str
    domain: str | None = None
    price_note: str | None = None
    about: str | None = None
    kind: str = "mentoring"
    mode: str = "volunteer"
    availability: str | None = None


class StatusIn(BaseModel):
    status: str


class RequestIn(BaseModel):
    topic: str
    kind: str = "learn"
    about: str | None = None


class AskIn(BaseModel):
    message: str | None = None


class DecideIn(BaseModel):
    accept: bool


class SessionIn(BaseModel):
    minutes: int


def _go(fn, *a):
    try:
        return fn(*a)
    except service.WisdomError as e:
        return JSONResponse(status_code=e.status, content={"detail": {"code": e.code}})


# ---- stories ----
@router.get("/capsules")
def library(q: str | None = None, kind: str | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """The shared stories (the library), newest first."""
    return {"capsules": service.library(conn, user_id, q, kind)}


@router.get("/capsules/mine")
def my_capsules(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"capsules": service.my_capsules(conn, user_id)}


@router.post("/capsules", status_code=201)
def capture(body: CapsuleIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Keep a story, skill or lesson. It is private until the author shares it."""
    return _go(service.capture, conn, user_id, body.model_dump())


@router.post("/capsules/{capsule_id}/share")
def share(capsule_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(service.set_published, conn, user_id, capsule_id, True)


@router.post("/capsules/{capsule_id}/unshare")
def unshare(capsule_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(service.set_published, conn, user_id, capsule_id, False)


@router.delete("/capsules/{capsule_id}")
def remove_capsule(capsule_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(service.remove_capsule, conn, user_id, capsule_id)


# ---- offers ----
@router.get("/offers")
def browse_offers(q: str | None = None, kind: str | None = None, mode: str | None = None, domain: str | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """What experienced people offer. kind=freelance is the paid-work list."""
    return {"offers": service.browse_offers(conn, user_id, q, kind, mode, 30, domain)}


@router.get("/offers/mine")
def my_offers(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"offers": service.my_offers(conn, user_id)}


@router.post("/offers", status_code=201)
def create_offer(body: OfferIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(service.create_offer, conn, user_id, body.model_dump())


@router.patch("/offers/{offer_id}")
def set_offer(offer_id: str, body: StatusIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(service.set_offer_status, conn, user_id, offer_id, body.status)


@router.post("/offers/{offer_id}/ask", status_code=201)
def ask(offer_id: str, body: AskIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(service.ask_offer, conn, user_id, offer_id, body.message)


# ---- requests ----
@router.get("/requests")
def open_requests(q: str | None = None, kind: str | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """What people want to learn, for mentors."""
    return {"requests": service.open_requests(conn, user_id, q, 30, kind)}


@router.get("/requests/mine")
def my_requests(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"requests": service.my_requests(conn, user_id)}


@router.post("/requests", status_code=201)
def create_request(body: RequestIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(service.create_request, conn, user_id, body.model_dump())


@router.post("/requests/{request_id}/close")
def close_request(request_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(service.close_request, conn, user_id, request_id)


@router.post("/requests/{request_id}/answer", status_code=201)
def answer(request_id: str, body: AskIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(service.answer_request, conn, user_id, request_id, body.message)


# ---- introductions ----
@router.get("/connections")
def connections(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"connections": service.my_connections(conn, user_id)}


@router.post("/connections/{connection_id}/decide")
def decide(connection_id: str, body: DecideIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(service.decide, conn, user_id, connection_id, body.accept)


@router.post("/connections/{connection_id}/close")
def close(connection_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(service.close_connection, conn, user_id, connection_id)


@router.post("/connections/{connection_id}/sessions", status_code=201)
def log_session(connection_id: str, body: SessionIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Either side says they talked (minutes). It adds up to 'calls this month, people helped'."""
    return _go(service.log_session, conn, user_id, connection_id, body.minutes)


@router.get("/stats")
def stats(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.stats(conn, user_id)
