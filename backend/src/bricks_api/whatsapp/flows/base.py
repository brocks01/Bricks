"""What every flow gets: the database, the member, their language and a way to reply."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from ...db import Conn
from ...deps import Ctx
from ...timeutil import local_date
from ..i18n import t
from ..models import Inbound, Outbound, SendResult, Text
from ..service import Contact, WhatsApp
from ..speech import Speech


@dataclass
class Turn:
    wa: WhatsApp
    speech: Speech
    conn: Conn
    msg: Inbound
    contact: Contact
    user: dict[str, Any] | None
    now: datetime
    voice: bool = False  # the text came from a voice note
    sent: list[SendResult] = field(default_factory=list)

    @property
    def phone(self) -> str:
        return self.msg.phone

    @property
    def lang(self) -> str:
        return str(self.user["language"]) if self.user else "en"

    @property
    def name(self) -> str:
        return display_name(self.user) if self.user else ""

    @property
    def today(self) -> str:
        return local_date(self.now).isoformat()

    @property
    def twilio(self) -> bool:
        return self.contact.route == "twilio"

    def ctx(self) -> Ctx:
        assert self.user, "only for members"
        return Ctx(conn=self.conn, user_id=self.user["id"], now=self.now, settings=self.wa.settings)

    def t(self, key: str, **values: object) -> str:
        return t(self.lang, key, **values)

    async def reply(self, key: str, **values: object) -> SendResult:
        return await self.say(Text(self.t(key, **values)))

    async def reply_text(self, body: str) -> SendResult:
        return await self.say(Text(body))

    async def say(self, out: Outbound) -> SendResult:
        # A reply to something they sent, so it goes out even when they've paused messages.
        result = await self.wa.send(self.conn, self.phone, out, lang=self.lang, urgent=True)
        self.sent.append(result)
        return result

    async def reload_user(self) -> None:
        if self.contact.user_id:
            self.user = await (
                await self.conn.execute(
                    "select * from users where id = %s", (self.contact.user_id,)
                )
            ).fetchone()


def display_name(user: dict[str, Any]) -> str:
    """What we call them: their chosen name, else their first name. Chinese names
    start with the family name ("Tan Mei Ling"), so those are said in full."""
    name = str(user["name"])
    if user.get("preferred_name"):
        return str(user["preferred_name"])
    return name if user.get("language") == "zh" else name.split(" ")[0]


def member_ctx(wa: WhatsApp, conn: Conn, user_id: str, now: datetime) -> Ctx:
    return Ctx(conn=conn, user_id=user_id, now=now, settings=wa.settings)
