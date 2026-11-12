"""After a walk recorded in the app: a short well-done on WhatsApp (iteration 3.2 §2.2).

Only for WhatsApp members whose 24-hour window is open (a free-form message);
the weekly progress card covers everyone else.
"""

from ...db import Conn
from ...schemas import WalkSummary
from ..i18n import t
from ..models import Text
from ..service import WhatsApp
from .base import display_name


async def send_walk_summary(wa: WhatsApp, conn: Conn, user_id: str, walk: WalkSummary) -> bool:
    user = await (
        await conn.execute(
            "select * from users where id = %s and channel_pref = 'whatsapp' and phone is not null",
            (user_id,),
        )
    ).fetchone()
    if not user:
        return False
    contact = await wa.contact(conn, user["phone"])
    if not contact or contact.opt_out or not wa.window_open(contact):
        return False
    lang = user["language"]
    body = t(
        lang,
        "walk_summary",
        name=display_name(user),
        title=t(lang, f"walk_{walk.time_of_day}"),
        km=f"{walk.distance_m / 1000:.1f}",
        minutes=round(walk.moving_s / 60),
    )
    return (await wa.send(conn, user["phone"], Text(body), lang=lang)).ok
