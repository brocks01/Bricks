"""Hosts: who runs things. An Active Ageing Centre, a mall, a community centre or an organisation. Wisdom is not the event provider or a community creator: it brings people to what hosts run.
Platform admins create hosts for now; communities and opportunities are brought in under a host."""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import Connection, text

from ...core.db import get_conn
from ..communities import rules as comm_rules
from ..identity.router import current_user_id

router = APIRouter(prefix="/v1/hosts")


class HostIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    kind: str = Field(default="organisation", pattern="^(aac|mall|community_centre|organisation|other)$")
    area_name: str | None = Field(default=None, max_length=120)
    address: str | None = Field(default=None, max_length=200)
    website: str | None = Field(default=None, max_length=200)


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
