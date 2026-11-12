"""Organisations onboard members by QR (iteration 3.2, docs/02b S11).

Staff make the organisation, add a list of people, then show the QR (or share the
WhatsApp join link). A member who scans it joins, and their row says Joined. Staff
only ever see names and statuses, never health cards or Safe Circles.
"""

import secrets
from datetime import timedelta
from typing import Any

from fastapi import APIRouter

from ..deps import Ctx, CtxDep, not_found
from ..ids import new_id
from ..repo import user_row
from ..schemas import NewOrg, Org, OrgDetail, OrgJoined, OrgMember, OrgPeopleIn
from ..timeutil import iso, iso_opt

router = APIRouter(tags=["orgs"])

# Invited this long ago and still not in: someone should call them (S11 "Needs help").
NEEDS_HELP_AFTER = timedelta(days=3)
# No 0/O or 1/I: the code is also read out and typed.
CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _code() -> str:
    return "".join(secrets.choice(CODE_LETTERS) for _ in range(6))


def _org(row: dict[str, Any]) -> Org:
    return Org(id=row["id"], name=row["name"], verified=row["verified"], join_code=row["join_code"])


def _member(ctx: Ctx, row: dict[str, Any]) -> OrgMember:
    if row["status"] == "joined":
        status = "joined"
    elif ctx.now - row["invited_at"] >= NEEDS_HELP_AFTER:
        status = "needs_help"
    else:
        status = "invited"
    return OrgMember(
        id=row["id"],
        name=row["name"],
        status=status,
        invited_at=iso(row["invited_at"]),
        joined_at=iso_opt(row["joined_at"]),
    )


async def _own_org(ctx: Ctx, org_id: str) -> dict[str, Any]:
    row = await (
        await ctx.conn.execute(
            "select * from orgs where id = %s and admin_id = %s", (org_id, ctx.user_id)
        )
    ).fetchone()
    if not row:
        raise not_found(f"organisation {org_id}")
    return row


async def _detail(ctx: Ctx, org: dict[str, Any]) -> OrgDetail:
    rows = await (
        await ctx.conn.execute(
            "select * from org_members where org_id = %s"
            " order by (status = 'joined'), invited_at, name",
            (org["id"],),
        )
    ).fetchall()
    members = [_member(ctx, r) for r in rows]
    # Who needs a call first, then who's waiting, then who's in.
    order = {"needs_help": 0, "invited": 1, "joined": 2}
    members.sort(key=lambda m: order[m.status])
    return OrgDetail(**_org(org).model_dump(), members=members)


@router.post("/orgs", status_code=201)
async def create_org(body: NewOrg, ctx: CtxDep) -> OrgDetail:
    row = await (
        await ctx.conn.execute(
            "insert into orgs (id, name, admin_id, join_code, created_at)"
            " values (%s, %s, %s, %s, %s) returning *",
            (new_id("org"), body.name.strip(), ctx.user_id, _code(), ctx.now),
        )
    ).fetchone()
    assert row
    return await _detail(ctx, row)


@router.get("/orgs/mine")
async def my_orgs(ctx: CtxDep) -> list[Org]:
    """The organisations this member runs (Settings shows them to staff only)."""
    rows = await (
        await ctx.conn.execute(
            "select * from orgs where admin_id = %s order by created_at", (ctx.user_id,)
        )
    ).fetchall()
    return [_org(r) for r in rows]


@router.get("/orgs/{org_id}")
async def get_org(org_id: str, ctx: CtxDep) -> OrgDetail:
    return await _detail(ctx, await _own_org(ctx, org_id))


@router.post("/orgs/{org_id}/members/bulk")
async def add_people(org_id: str, body: OrgPeopleIn, ctx: CtxDep) -> OrgDetail:
    """Upload a list: each person is Invited until they scan or tap the link.
    Someone already on the list (same phone) isn't added twice."""
    org = await _own_org(ctx, org_id)
    for p in body.people:
        await ctx.conn.execute(
            "insert into org_members (id, org_id, name, phone, invited_at)"
            " values (%s, %s, %s, %s, %s) on conflict do nothing",
            (new_id("om"), org_id, p.name.strip(), p.phone, ctx.now),
        )
    return await _detail(ctx, org)


@router.post("/orgs/join/{code}")
async def join_org(code: str, ctx: CtxDep) -> OrgJoined:
    """A member scanned the QR (or tapped the link): they're in."""
    org = await (
        await ctx.conn.execute("select * from orgs where join_code = %s", (code.upper(),))
    ).fetchone()
    if not org:
        raise not_found(f"join code {code}")
    me = await user_row(ctx.conn, ctx.user_id)
    assert me
    # Already on the list: by account, or invited by their phone number.
    row = await (
        await ctx.conn.execute(
            "select id from org_members where org_id = %(o)s"
            " and (user_id = %(me)s or (user_id is null and phone = %(phone)s))"
            " order by (user_id = %(me)s) desc nulls last limit 1",
            {"o": org["id"], "me": ctx.user_id, "phone": me["phone"]},
        )
    ).fetchone()
    if row:
        await ctx.conn.execute(
            "update org_members set user_id = %s, status = 'joined',"
            " joined_at = coalesce(joined_at, %s) where id = %s",
            (ctx.user_id, ctx.now, row["id"]),
        )
    else:
        await ctx.conn.execute(
            "insert into org_members (id, org_id, user_id, name, phone, status, invited_at,"
            " joined_at) values (%s, %s, %s, %s, %s, 'joined', %s, %s)",
            (
                new_id("om"),
                org["id"],
                ctx.user_id,
                me["preferred_name"] or me["name"],
                me["phone"],
                ctx.now,
                ctx.now,
            ),
        )
    return OrgJoined(name=org["name"], verified=org["verified"])
