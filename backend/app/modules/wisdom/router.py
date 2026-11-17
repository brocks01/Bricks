from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import service, teach

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
    proof_field: str | None = None
    proof_years: int | None = None
    proof_where: str | None = None
    topics: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)


class NoteIn(BaseModel):
    note: str | None = None


class MessageIn(BaseModel):
    body: str


class StatusIn(BaseModel):
    status: str


class RequestIn(BaseModel):
    topic: str
    kind: str = "learn"
    about: str | None = None


class AskIn(BaseModel):
    message: str | None = None
    group_name: str | None = None
    learner_count: int | None = None
    topic: str | None = None


class DecideIn(BaseModel):
    accept: bool


class SessionIn(BaseModel):
    minutes: int


class TeachingProfileIn(BaseModel):
    expertise: str | None = None
    bio: str | None = None
    days: str | None = None
    start_time: str | None = None
    end_time: str | None = None


class ScheduleIn(BaseModel):
    title: str
    starts_at: str
    minutes: int = 60
    place: str | None = None


class RescheduleIn(BaseModel):
    starts_at: str


class ReviewIn(BaseModel):
    score: int
    note: str | None = None


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
def browse_offers(q: str | None = None, kind: str | None = None, mode: str | None = None, domain: str | None = None, topic: str | None = None,
                 language: str | None = None, area: str | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """What experienced people offer. kind=freelance is the paid-work list; topic, language and area narrow the search further (area is the mentor's area, so a learner can search their own city)."""
    return {"offers": service.browse_offers(conn, user_id, q, kind, mode, 30, domain, topic, language, area)}


@router.get("/offers/mine")
def my_offers(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"offers": service.my_offers(conn, user_id)}


@router.post("/offers", status_code=201)
def create_offer(body: OfferIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(service.create_offer, conn, user_id, body.model_dump())


@router.post("/offers/{offer_id}/endorse", status_code=201)
def endorse(offer_id: str, body: NoteIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """A learner says thank you: only after a session they had with that mentor, once per offer. Counts, never stars."""
    return _go(service.endorse_offer, conn, user_id, offer_id, body.note)


@router.patch("/offers/{offer_id}")
def set_offer(offer_id: str, body: StatusIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(service.set_offer_status, conn, user_id, offer_id, body.status)


@router.post("/offers/{offer_id}/ask", status_code=201)
def ask(offer_id: str, body: AskIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(service.ask_offer, conn, user_id, offer_id, body.message, body.group_name, body.learner_count, body.topic)


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


@router.get("/connections/{connection_id}/messages")
def messages(connection_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """The first conversation: the messages of one accepted introduction, oldest first. First names only, never a phone number or an email."""
    return {"messages": service.thread(conn, user_id, connection_id)}


@router.post("/connections/{connection_id}/messages", status_code=201)
def send(connection_id: str, body: MessageIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """One short message to the other side. It goes out through the outbox to their preferred channel, never at night."""
    return _go(service.send_message, conn, user_id, connection_id, body.body)


@router.post("/connections/{connection_id}/sessions", status_code=201)
def log_session(connection_id: str, body: SessionIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Either side says they talked (minutes). It adds up to 'calls this month, people helped'."""
    return _go(service.log_session, conn, user_id, connection_id, body.minutes)


# ---- Teach: the teaching profile, sessions and reviews ----
@router.get("/teaching-profile")
def get_teaching_profile(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return teach.teaching_profile(conn, user_id)


@router.patch("/teaching-profile")
def patch_teaching_profile(body: TeachingProfileIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Saves only the fields that are sent; an empty one is cleared. Times as 09:00."""
    return _go(teach.save_teaching_profile, conn, user_id, body.model_dump(exclude_unset=True))


@router.get("/sessions")
def sessions(connection_id: str | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Every session of the person's accepted introductions: coming up first, then the past ones with their reviews."""
    return {"sessions": teach.sessions(conn, user_id, connection_id)}


@router.post("/connections/{connection_id}/schedule", status_code=201)
def schedule(connection_id: str, body: ScheduleIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(teach.schedule, conn, user_id, connection_id, body.model_dump())


@router.post("/sessions/{session_id}/reschedule")
def reschedule(session_id: str, body: RescheduleIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """A new time; both people are told."""
    return _go(teach.reschedule, conn, user_id, session_id, body.starts_at)


@router.post("/sessions/{session_id}/complete")
def complete(session_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """The session happened: it is logged and each person gets one leaf."""
    return _go(teach.complete, conn, user_id, session_id)


@router.post("/sessions/{session_id}/cancel")
def cancel(session_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _go(teach.cancel, conn, user_id, session_id)


@router.post("/sessions/{session_id}/review", status_code=201)
def review(session_id: str, body: ReviewIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """The learner's score from 1 to 5 and a short note, once, after a completed session."""
    return _go(teach.review, conn, user_id, session_id, body.score, body.note)


@router.get("/stats")
def stats(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.stats(conn, user_id)
