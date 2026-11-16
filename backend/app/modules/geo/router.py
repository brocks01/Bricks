"""Map pictures for a community or an event. No sign-in (an image tag cannot send one), so these show only what a card already shows: the place.
Only a STORED address is ever drawn, never a free-text query, so nobody can use our Maps key through us."""
import uuid

from fastapi import APIRouter, Depends, Response
from sqlalchemy import Connection, text

from ...core.db import get_conn
from . import service

router = APIRouter(prefix="/v1/geo")
CACHE = "public, max-age=2592000"  # 30 days


def _uuid(v: str) -> bool:
    try:
        uuid.UUID(v)
        return True
    except ValueError:
        return False


def _png(address: str | None) -> Response:
    png = service.map_png(address)
    if not png:
        return Response(status_code=404)
    return Response(content=png, media_type="image/png", headers={"Cache-Control": CACHE})


@router.get("/map/community/{community_id}.png")
def community_map(community_id: str, conn: Connection = Depends(get_conn)):
    if not _uuid(community_id):
        return Response(status_code=404)
    a = conn.execute(text("select coalesce(nullif(trim(address), ''), area_name) from communities where id = :c and status = 'active' and hidden_at is null"),
                     {"c": community_id}).scalar()
    return _png(a)


@router.get("/map/event/{event_id}.png")
def event_map(event_id: str, conn: Connection = Depends(get_conn)):
    if not _uuid(event_id):
        return Response(status_code=404)
    a = conn.execute(text("select coalesce(nullif(trim(address), ''), nullif(trim(concat_ws(', ', venue_name, area_name)), '')) from market_events where id = :e and status = 'scheduled'"),
                     {"e": event_id}).scalar()
    return _png(a)
