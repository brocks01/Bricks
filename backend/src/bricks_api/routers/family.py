"""Family adds a parent (S9) and sees whether they've said yes (S10).

The parent's account only becomes active once they say yes (ON-5). That yes
normally comes from WhatsApp or SMS (the WhatsApp lane calls `accept_invite`);
the app's "they said yes" control is a demo-only shortcut.
"""

from typing import Any

from fastapi import APIRouter, HTTPException

from ..db import Conn
from ..deps import CtxDep, not_found
from ..ids import new_id
from ..schemas import FamilyInvite, NewFamilyInvite
from ..timeutil import iso

router = APIRouter(tags=["family"])


def _invite(row: dict[str, Any]) -> FamilyInvite:
    return FamilyInvite(
        id=row["id"],
        senior_name=row["senior_name"],
        senior_phone=row["senior_phone"],
        relation=row["relation"],
        language=row["language"],
        interests=list(row["interests"]),
        add_me_to_safe_circle=row["add_me_to_safe_circle"],
        status=row["status"],
        senior_id=row["senior_id"],
        created_at=iso(row["created_at"]),
    )


@router.get("/family/invites")
async def list_invites(ctx: CtxDep) -> list[FamilyInvite]:
    rows = await (
        await ctx.conn.execute(
            "select * from family_invites where family_id = %s order by created_at desc",
            (ctx.user_id,),
        )
    ).fetchall()
    return [_invite(r) for r in rows]


@router.post("/family/invite", status_code=201)
async def create_invite(body: NewFamilyInvite, ctx: CtxDep) -> FamilyInvite:
    row = await (
        await ctx.conn.execute(
            "insert into family_invites (id, family_id, senior_name, senior_phone, relation,"
            " language, interests, add_me_to_safe_circle, created_at)"
            " values (%s, %s, %s, %s, %s, %s, %s, %s, %s) returning *",
            (
                new_id("inv"),
                ctx.user_id,
                body.senior_name,
                body.senior_phone,
                body.relation,
                body.language,
                list(body.interests),
                body.add_me_to_safe_circle,
                ctx.now,
            ),
        )
    ).fetchone()
    assert row
    # Sending the WhatsApp/SMS invite is the WhatsApp lane's job (docs/06).
    return _invite(row)


async def accept_invite(conn: Conn, invite_id: str) -> dict[str, Any] | None:
    """The parent said yes: make (or link) their account, the family link and Safe Circle."""
    invite = await (
        await conn.execute("select * from family_invites where id = %s for update", (invite_id,))
    ).fetchone()
    if not invite or invite["status"] == "accepted":
        return invite
    senior = await (
        await conn.execute("select id from users where phone = %s", (invite["senior_phone"],))
    ).fetchone()
    if senior:
        senior_id = senior["id"]
        await conn.execute("update users set status = 'active' where id = %s", (senior_id,))
    else:
        senior_id = new_id("u")
        await conn.execute(
            "insert into users (id, name, phone, language, languages, interests, onboarded_by,"
            " status) values (%s, %s, %s, %s, %s, %s, 'family', 'active')",
            (
                senior_id,
                invite["senior_name"],
                invite["senior_phone"],
                invite["language"],
                [invite["language"]],
                invite["interests"],
            ),
        )
    await conn.execute(
        "insert into family_links (senior_id, family_id, relation, status)"
        " values (%s, %s, %s, 'accepted')"
        " on conflict (senior_id, family_id) do update set status = 'accepted'",
        (senior_id, invite["family_id"], invite["relation"]),
    )
    if invite["add_me_to_safe_circle"]:
        await conn.execute(
            "insert into safe_circle (id, user_id, helper_id, name, phone, is_family, order_no)"
            " select %(id)s, %(senior)s, u.id, u.name, u.phone, true,"
            "   coalesce((select max(order_no) + 1 from safe_circle where user_id = %(senior)s), 0)"
            " from users u where u.id = %(family)s"
            " and not exists(select 1 from safe_circle where user_id = %(senior)s"
            "   and helper_id = %(family)s)"
            " and (select count(*) from safe_circle where user_id = %(senior)s) < 5",
            {"id": new_id("sc"), "senior": senior_id, "family": invite["family_id"]},
        )
    return await (
        await conn.execute(
            "update family_invites set status = 'accepted', senior_id = %s where id = %s"
            " returning *",
            (senior_id, invite_id),
        )
    ).fetchone()


@router.post("/invites/{invite_id}/accept")
async def accept(invite_id: str, ctx: CtxDep) -> FamilyInvite:
    owner = await (
        await ctx.conn.execute("select family_id from family_invites where id = %s", (invite_id,))
    ).fetchone()
    if not owner or owner["family_id"] != ctx.user_id:
        raise not_found(f"invite {invite_id}")
    if not ctx.settings.demo_mode:
        raise HTTPException(403, "Your parent says yes on their own phone.")
    row = await accept_invite(ctx.conn, invite_id)
    assert row
    return _invite(row)
