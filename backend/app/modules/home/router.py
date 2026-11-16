"""Home: one call that pulls the small facts from the other tabs together, so the Home screen is one request. The dated things (calendar items, events, bookings) come from
/v1/calendar/occurrences, which already holds every commitment; this adds the counts and the check-in."""
from fastapi import APIRouter, Depends
from sqlalchemy import Connection

from ...core.db import get_conn
from ..communities import rules
from ..health import service as health
from ..identity.router import current_user_id
from ..market import service as market
from . import service

router = APIRouter(prefix="/v1/home")


@router.get("/summary")
def summary(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    return {
        "health": health.summary(conn, user_id),
        "communities": rules.limits(conn, user_id),
        "market": market.summary(conn, user_id),
        "help_alerts": len(health.help_inbox(conn, user_id)),  # open "I need help" alerts from my family
    }


@router.get("/upcoming")
def upcoming(limit: int = 50, days: int = 30, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """The person's upcoming events from Communities, the Marketplace and Wisdom, soonest first: from a few hours ago to `days` ahead (30, at most 92)."""
    return service.upcoming(conn, user_id, limit, days)
