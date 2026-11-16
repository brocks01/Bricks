from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import Connection

from ...core.db import get_conn
from ..communities import rules as comm_rules
from ..identity.router import current_user_id
from . import service

router = APIRouter(prefix="/v1")


def _admin_only(conn: Connection, user_id: str):
    return None if comm_rules.is_admin(conn, user_id) else JSONResponse(status_code=403, content={"detail": {"code": "admin_only"}})


@router.get("/insights/interests")
def interests(area: str | None = None, user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """For a centre: what people near it chose against what it ran. Counts only; groups under five are hidden. Platform admins only."""
    return _admin_only(conn, user_id) or service.interest_report(conn, area)


@router.get("/insights/pilot")
def pilot(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """The pilot's numbers: who joined and through whom, men's share, mentor matches and calls, loneliness before and after. Platform admins only."""
    return _admin_only(conn, user_id) or service.pilot_report(conn)


@router.get("/suggestions/communities")
def suggestions(user_id: str = Depends(current_user_id), conn: Connection = Depends(get_conn)):
    """For the signed-in person: groups that match what they enjoy, and 'five people near you like the same thing, start a group'."""
    return service.suggest_communities(conn, user_id)
