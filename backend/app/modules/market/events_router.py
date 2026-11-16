from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import attendance, events, milestones
from .service import MarketError

router = APIRouter(prefix="/v1/market")


class EventIn(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    venue_name: str = Field(min_length=2, max_length=120)
    venue_kind: str = Field(default="mall", pattern="^(mall|community_centre|other)$")
    address: str | None = Field(default=None, max_length=200)
    area_name: str | None = Field(default=None, max_length=120)
    starts_at: datetime
    ends_at: datetime | None = None
    stalls_total: int = Field(default=12, ge=0, le=200)
    repeat: str | None = Field(default=None, pattern="^(none|weekly|monthly)$")  # a weekly or a monthly market day
    repeat_days: list[int] | None = None
    week_of_month: int | None = None  # monthly: 1 to 4 or -1, "the first Sunday of the month"
    until: date | None = None
    host_id: str | None = None  # who runs it: an Active Ageing Centre, a mall, a community centre, an organisation
    kind: str = "market_day"  # market_day, volunteer, gig, show or activity
    intents: list[str] = Field(default_factory=lambda: ["earn", "enjoy"])  # what a person can do there: earn, contribute, volunteer, enjoy
    interests: list[str] = Field(default_factory=list)  # what it is about: walking, taichi, cooking, chess, music, gardening, teaching, tech
    external_url: str | None = Field(default=None, max_length=300)
    external_ref: str | None = Field(default=None, max_length=120)  # the host's own id for it: importing the same one again updates it


class GoingIn(BaseModel):
    going: bool = True
    community_id: str | None = None


class PlanIn(BaseModel):
    on: bool = True


class StallIn(BaseModel):
    selling: str = Field(min_length=2, max_length=200)
    kind: str = Field(default="goods", pattern="^(goods|skill)$")
    helper_name: str | None = Field(default=None, max_length=60)
    slot: str = Field(default="whole", pattern="^(first|second|whole)$")


class MilestoneIn(BaseModel):
    community_id: str
    title: str = Field(min_length=2, max_length=200)
    due_on: date | None = None  # "four weeks of herbs": the day this small step should be done by


class AttendanceIn(BaseModel):
    attended: bool
    source: str = Field(default="app", pattern="^(app|agent)$")


class TickIn(BaseModel):
    done: bool = True


def _run(fn, *a):
    try:
        return fn(*a)
    except MarketError as e:
        return JSONResponse(status_code=e.status, content={"detail": {"code": e.code}})


@router.get("/events")
def list_events(limit: int = 10, intent: str | None = None, area: str | None = None, kind: str | None = None, q: str | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """What is happening near a person. Filter by what they want to do there (intent: earn, contribute, volunteer, enjoy), the area, the kind, and words (q)."""
    return {"events": events.list_events(conn, user_id, limit, intent, area, kind, q)}


@router.get("/events/recommended")
def recommended(q: str | None = None, limit: int = 20, intent: str | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Upcoming events the person is not going to yet, best first: shared interests, nearness to where they live, and soon. Each says how far and why."""
    return {"events": attendance.recommended(conn, user_id, q, limit, intent)}


@router.get("/mine")
def my_market_days(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """The person's market days: coming up, waiting for "Did you go?", and answered (the last 30 days)."""
    return attendance.mine(conn, user_id)


@router.get("/attendance/summary")
def attendance_summary(start: datetime | None = Query(default=None, alias="from"), end: datetime | None = Query(default=None, alias="to"), user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Platform admins: going, went, didn't go and no answer per event and in total. Counts only, never names."""
    return _run(attendance.summary, conn, user_id, start, end)


@router.get("/events/{eid}")
def get_event(eid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(events.get_event, conn, user_id, eid)


@router.post("/events/{eid}/going")
def going(eid: str, body: GoingIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(events.set_going, conn, user_id, eid, body.going, body.community_id)


@router.post("/events/{eid}/attendance")
def mark_attendance(eid: str, body: AttendanceIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """After the day: "I went" (attended true) or "I didn't go". Only for someone who said they were going, from the start to 30 days after. Can be changed."""
    return _run(attendance.mark, conn, user_id, eid, body.attended, body.source)


@router.delete("/events/{eid}/attendance")
def undo_attendance(eid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(attendance.unmark, conn, user_id, eid)


@router.get("/events/{eid}/attendance-summary")
def event_attendance_summary(eid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Counts for one event: platform admins, and that event's host's owners and editors. Never names."""
    return _run(attendance.event_summary, conn, user_id, eid)


@router.post("/events/{eid}/communities/{cid}")
def plan(eid: str, cid: str, body: PlanIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(events.plan_community, conn, user_id, eid, cid, body.on)


@router.post("/events/{eid}/stall")
def take_stall(eid: str, body: StallIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(events.take_stall, conn, user_id, eid, body.selling, body.helper_name, body.slot, body.kind)


@router.delete("/events/{eid}/stall")
def cancel_stall(eid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(events.cancel_stall, conn, user_id, eid)


@router.get("/community-events/{cid}")
def for_community(cid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(lambda *_: {"events": events.for_community(conn, user_id, cid)})


@router.post("/events", status_code=201)
def create_event(body: EventIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Make a market day, once or repeating weekly or monthly. Platform admins only."""
    return _run(events.create_event, conn, user_id, body.model_dump())


@router.post("/events/{eid}/end-series")
def end_event_series(eid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Stop a repeating market day: no more are made and the coming ones are cancelled. Platform admins only."""
    return _run(events.end_series, conn, user_id, eid)


# ---------- the circle's weekly steps toward its stall ----------
@router.get("/events/{eid}/milestones")
def list_milestones(eid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """The steps the circles of mine that planned this visit are ticking off (members only), and whether I may add one (I lead one of them)."""
    return _run(milestones.list_for, conn, user_id, eid)


@router.post("/events/{eid}/milestones", status_code=201)
def add_milestone(eid: str, body: MilestoneIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """A Community Lead of a circle that planned this visit sets one small step toward the stall (a date to do it by is optional)."""
    return _run(milestones.add, conn, user_id, eid, body.community_id, body.title, body.due_on)


@router.post("/events/{eid}/milestones/{mid}/tick")
def tick_milestone(eid: str, mid: str, body: TickIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Tick a step off (or back on). Anyone in that circle may: it is the circle's plan, not one person's list."""
    return _run(milestones.tick, conn, user_id, eid, mid, body.done)


@router.delete("/events/{eid}/milestones/{mid}")
def delete_milestone(eid: str, mid: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """A Community Lead of that circle takes one step back out."""
    return _run(milestones.remove, conn, user_id, eid, mid)
