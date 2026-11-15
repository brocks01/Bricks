from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection

from ...core.db import get_conn
from ..identity.router import current_user_id
from . import service

router = APIRouter(prefix="/v1/market")
Category = Literal["crafts", "cooking", "teaching", "repair", "music", "wellness", "advice", "storytelling", "other"]
Tier = Literal["basic", "skilled", "expert"]


class ListingIn(BaseModel):
    title: str = Field(min_length=3, max_length=80)
    category: Category = "other"
    tier: Tier = "skilled"
    description: str | None = Field(default=None, max_length=1500)
    experience_years: int = Field(default=0, ge=0, le=70)
    proof_text: str | None = Field(default=None, max_length=1000)
    proof_links: list[str] = Field(default_factory=list, max_length=5)
    rate_per_hour: float | None = Field(default=None, ge=0, le=1000)
    area_name: str | None = Field(default=None, max_length=120)


class ListingPatch(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=80)
    category: Category | None = None
    tier: Tier | None = None
    description: str | None = Field(default=None, max_length=1500)
    experience_years: int | None = Field(default=None, ge=0, le=70)
    proof_text: str | None = Field(default=None, max_length=1000)
    rate_per_hour: float | None = Field(default=None, ge=0, le=1000)
    area_name: str | None = Field(default=None, max_length=120)
    status: Literal["active", "paused"] | None = None


class BookingIn(BaseModel):
    starts_at: datetime
    hours: float = Field(default=1, gt=0, le=24)
    note: str | None = Field(default=None, max_length=500)
    community_id: str | None = None


class DecideIn(BaseModel):
    accept: bool


class EndorseIn(BaseModel):
    note: str | None = Field(default=None, max_length=200)


class StallIn(BaseModel):
    selling: str = Field(min_length=2, max_length=200)
    slot: str = Field(default='whole', pattern='^(first|second|whole)$')
    helper_name: str | None = Field(default=None, max_length=60)


def _refuse(e: service.MarketError) -> JSONResponse:
    return JSONResponse(status_code=e.status, content={"detail": {"code": e.code}})


def _run(fn, *a, **k):
    try:
        return fn(*a, **k)
    except service.MarketError as e:
        return _refuse(e)


@router.get("/guide")
def guide(tier: Tier = "skilled"):
    return service.guide(tier)


@router.get("/listings")
def listings(q: str = "", category: str | None = None, mine: bool = False, limit: int = 40, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    r = _run(service.list_listings, conn, user_id, q, category, mine, limit)
    return r if isinstance(r, JSONResponse) else {"listings": r, "categories": list(service.CATEGORIES)}


@router.post("/listings")
def create(body: ListingIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.create_listing, conn, user_id, body.model_dump())


@router.get("/listings/{listing_id}")
def one(listing_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.get_listing, conn, user_id, listing_id)


@router.patch("/listings/{listing_id}")
def update(listing_id: str, body: ListingPatch, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.update_listing, conn, user_id, listing_id, body.model_dump())


@router.delete("/listings/{listing_id}")
def archive(listing_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.archive_listing, conn, user_id, listing_id)


@router.post("/listings/{listing_id}/bookings")
def book(listing_id: str, body: BookingIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    b = body.model_dump()
    if b["starts_at"].tzinfo is None:
        b["starts_at"] = b["starts_at"].replace(tzinfo=timezone.utc)
    return _run(service.request_booking, conn, user_id, listing_id, b)


@router.post("/listings/{listing_id}/endorse")
def endorse(listing_id: str, body: EndorseIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.endorse, conn, user_id, listing_id, body.note)


@router.get("/bookings")
def bookings(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {"bookings": service.list_bookings(conn, user_id)}


@router.post("/bookings/{booking_id}/decide")
def decide(booking_id: str, body: DecideIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.decide, conn, user_id, booking_id, body.accept)


@router.post("/bookings/{booking_id}/cancel")
def cancel(booking_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.cancel, conn, user_id, booking_id)


@router.post("/bookings/{booking_id}/complete")
def complete(booking_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.complete, conn, user_id, booking_id)


@router.get("/stalls/{activity_id}")
def stalls(activity_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.list_stalls, conn, user_id, activity_id)


@router.post("/stalls/{activity_id}")
def reserve(activity_id: str, body: StallIn, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.reserve_stall, conn, user_id, activity_id, body.selling, body.helper_name, body.slot)


@router.delete("/stalls/{activity_id}")
def cancel_stall(activity_id: str, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return _run(service.cancel_stall, conn, user_id, activity_id)


@router.get("/summary")
def summary(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return service.summary(conn, user_id)
