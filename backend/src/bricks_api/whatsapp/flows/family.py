"""Family: the invite a parent says yes to (iteration 1.3 §3.2), and the missed
check-in alert with [Call] [I'll check] (iteration 2.2 §3.3).

No account becomes active without the parent's own Yes (ON-5).
"""

from typing import Any

from ...db import Conn
from ...routers.family import accept_invite
from .. import templates
from ..i18n import t
from ..models import Text
from ..service import WhatsApp
from .base import Turn, display_name


async def send_invite(wa: WhatsApp, conn: Conn, invite_id: str) -> bool:
    """`welcome_invite_family` to the parent, in the language the family picked."""
    row = await (
        await conn.execute(
            "select i.*, u.name as family_name from family_invites i"
            " join users u on u.id = i.family_id where i.id = %s",
            (invite_id,),
        )
    ).fetchone()
    if not row or row["status"] != "invited":
        return False
    msg = templates.build(
        "welcome_invite_family",
        row["language"],
        [row["senior_name"], row["family_name"]],
        [f"invite:yes:{invite_id}", f"invite:no:{invite_id}"],
    )
    phone = row["senior_phone"]
    return (await wa.send(conn, phone, msg, lang=row["language"])).ok


async def pending_invite(conn: Conn, phone: str) -> dict[str, Any] | None:
    return await (
        await conn.execute(
            "select * from family_invites where senior_phone = %s and status = 'invited'"
            " order by created_at desc limit 1",
            (phone,),
        )
    ).fetchone()


async def accept(turn: Turn, invite_id: str) -> None:
    invite = await (
        await turn.conn.execute(
            "select i.*, u.name as family_name, u.phone as family_phone, u.language as family_lang"
            " from family_invites i join users u on u.id = i.family_id where i.id = %s",
            (invite_id,),
        )
    ).fetchone()
    # Only the invited number can say yes for itself.
    if not invite or invite["senior_phone"] != turn.phone:
        await turn.reply("invite_gone")
        return
    first_yes = invite["status"] == "invited"
    row = await accept_invite(turn.conn, invite_id)
    assert row and row["senior_id"]
    senior_id = row["senior_id"]
    await turn.conn.execute(
        "update users set channel_pref = 'whatsapp' where id = %s", (senior_id,)
    )
    await turn.wa.link_user(turn.conn, turn.phone, senior_id)
    await turn.wa.opt_in(turn.conn, turn.phone)
    turn.contact.user_id = senior_id
    await turn.reload_user()
    await turn.wa.clear_session(turn.conn, turn.phone)
    family_first = str(invite["family_name"]).split(" ")[0]
    await turn.reply("invite_yes", name=turn.name, family=family_first)
    if first_yes and invite["family_phone"]:
        # The app's S10 shows it too; this reaches family on WhatsApp if their window is open.
        await turn.wa.send(
            turn.conn,
            invite["family_phone"],
            Text(t(invite["family_lang"], "family_joined", name=turn.name)),
            lang=invite["family_lang"],
        )


async def decline(turn: Turn, invite_id: str) -> None:
    """No: nothing is made, and no more messages (the invite stays open)."""
    invite = await (
        await turn.conn.execute("select * from family_invites where id = %s", (invite_id,))
    ).fetchone()
    await turn.wa.clear_session(turn.conn, turn.phone)
    lang = invite["language"] if invite and invite["senior_phone"] == turn.phone else turn.lang
    await turn.say(Text(t(lang, "invite_no")))


async def send_missed_checkin(wa: WhatsApp, conn: Conn, senior: dict[str, Any]) -> int:
    """Ladder step 3: tell family (accepted links, with a phone). Returns how many."""
    family = await (
        await conn.execute(
            "select u.id, u.phone, u.language from family_links l"
            " join users u on u.id = l.family_id"
            " where l.senior_id = %s and l.status = 'accepted' and u.phone is not null",
            (senior["id"],),
        )
    ).fetchall()
    sent = 0
    for f in family:
        msg = templates.build(
            "family_missed_checkin",
            f["language"],
            [display_name(senior)],
            [f"fam:call:{senior['id']}", f"fam:check:{senior['id']}"],
        )
        sent += (await wa.send(conn, f["phone"], msg, lang=f["language"], urgent=True)).ok
    return sent


async def _linked_senior(turn: Turn, senior_id: str) -> dict[str, Any] | None:
    """The senior, if this number belongs to their family."""
    return await (
        await turn.conn.execute(
            "select s.* from users s join family_links l on l.senior_id = s.id"
            " join users f on f.id = l.family_id"
            " where s.id = %s and f.phone = %s and l.status = 'accepted'",
            (senior_id, turn.phone),
        )
    ).fetchone()


async def call_senior(turn: Turn, senior_id: str) -> None:
    senior = await _linked_senior(turn, senior_id)
    if senior and senior["phone"]:
        await turn.reply("tap_to_call", name=senior["name"], phone=senior["phone"])


async def will_check(turn: Turn, senior_id: str) -> None:
    senior = await _linked_senior(turn, senior_id)
    if senior:
        await turn.reply("family_check_ack", name=display_name(senior))
