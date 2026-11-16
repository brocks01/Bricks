"""Hosts: who runs things. An Active Ageing Centre, a mall, a community centre or an organisation. Wisdom is not the event provider or a community creator: it brings people to what hosts run.
Platform admins create hosts for now; a host's own owners and editors list, make, edit and cancel its opportunities and import its communities."""
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection, text

from ...core.db import get_conn
from ..communities import rules as comm_rules
from ..identity.router import current_user_id
from ..market.events_router import EventIn
from ..market.service import MarketError
from . import service
from .service import HostError

router = APIRouter(prefix="/v1/hosts")


class HostIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    kind: str = Field(default="organisation", pattern="^(aac|mall|community_centre|organisation|other)$")
    area_name: str | None = Field(default=None, max_length=120)
    address: str | None = Field(default=None, max_length=200)
    website: str | None = Field(default=None, max_length=200)


class MemberIn(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    role: str = Field(default="editor", pattern="^(owner|editor)$")


class EventPatch(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    venue_name: str | None = Field(default=None, min_length=2, max_length=120)
    venue_kind: str | None = Field(default=None, pattern="^(mall|community_centre|other)$")
    address: str | None = Field(default=None, max_length=200)
    area_name: str | None = Field(default=None, max_length=120)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    stalls_total: int | None = Field(default=None, ge=0, le=200)
    cover_url: str | None = Field(default=None, max_length=300)
    kind: str | None = None  # market_day, volunteer, gig, show or activity
    intents: list[str] | None = None  # what a person can do there: earn, contribute, volunteer, enjoy
    external_url: str | None = Field(default=None, max_length=300)


class CommunityIn(BaseModel):
    external_ref: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    area_name: str | None = Field(default=None, max_length=120)
    circle: str | None = Field(default=None, pattern="^(origin|faith|place|life|interest)$")
    audience: str | None = Field(default=None, pattern="^(all|men|women)$")


def _run(fn, *a):
    try:
        return fn(*a)
    except (HostError, MarketError) as e:
        return JSONResponse(status_code=e.status, content={"detail": {"code": e.code}})


@router.get("")
def list_hosts(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    rows = conn.execute(text("select id, name, kind, area_name, address, website from hosts order by name limit 200")).all()
    return {"hosts": [{"id": str(r.id), "name": r.name, "kind": r.kind, "area_name": r.area_name, "address": r.address, "website": r.website} for r in rows]}


@router.post("", status_code=201)
def create_host(body: HostIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Add a host (platform admins only)."""
    if not comm_rules.is_admin(conn, user_id):
        return JSONResponse(status_code=403, content={"detail": {"code": "not_admin"}})
    r = conn.execute(text("insert into hosts (name, kind, area_name, address, website, created_by) values (:n, :k, :a, :ad, :w, :u) returning id"),
                     {"n": body.name.strip(), "k": body.kind, "a": body.area_name, "ad": body.address, "w": body.website, "u": user_id}).one()
    return {"id": str(r.id)}


# ---------- the host's own people ----------
@router.get("/mine")
def mine(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """The hosts this person works for (a platform admin sees every host). The app shows "My host" only when this is not empty."""
    return {"hosts": service.my_hosts(conn, user_id)}


@router.get("/{host_id}/members")
def members(host_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Who works on this host (members only; names and roles)."""
    return _run(service.list_members, conn, user_id, host_id)


@router.post("/{host_id}/members", status_code=201)
def add_member(host_id: str, body: MemberIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """A platform admin adds the first owner by email; an owner adds editors. Editors may not add anyone."""
    return _run(service.add_member, conn, user_id, host_id, body.email, body.role)


# ---------- this host's opportunities ----------
@router.get("/{host_id}/events")
def list_host_events(host_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """What is coming up at this host, with going counts and who took a stall (members only)."""
    return _run(lambda *_: {"events": service.host_events(conn, user_id, host_id)})


@router.post("/{host_id}/events", status_code=201)
def create_host_event(host_id: str, body: EventIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Make an opportunity at this host: same fields and validation as the platform admin's form, once or repeating weekly or monthly (owners and editors)."""
    return _run(service.create_event, conn, user_id, host_id, body.model_dump())


@router.patch("/{host_id}/events/{event_id}")
def edit_host_event(host_id: str, event_id: str, body: EventPatch, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Edit one of this host's opportunities (only the fields sent). Another host's event is a 404."""
    return _run(service.edit_event, conn, user_id, host_id, event_id, body.model_dump(exclude_unset=True))


@router.post("/{host_id}/events/{event_id}/cancel")
def cancel_host_event(host_id: str, event_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Cancel one of this host's opportunities: it stops being shown to people."""
    return _run(service.cancel_event, conn, user_id, host_id, event_id)


@router.post("/{host_id}/events/{event_id}/end-series")
def end_host_series(host_id: str, event_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Stop a repeating opportunity of this host for good: no more are made and the coming ones are cancelled."""
    return _run(service.end_series, conn, user_id, host_id, event_id)


@router.post("/{host_id}/communities", status_code=201)
def import_host_community(host_id: str, body: CommunityIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """Bring in a community this host already runs. Safe to run again: the same external reference updates the same community (members only)."""
    return _run(service.import_community, conn, user_id, host_id, body.model_dump())
