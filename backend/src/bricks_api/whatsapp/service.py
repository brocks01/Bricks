"""Sending and the per-number state: contacts, the 24-hour window, sessions, logs.

The sending rule (docs/06 §5.2):
- Inside the 24-hour window (they wrote to us in the last 24 h), we send the
  interactive free-form message: buttons and lists, no approval needed.
- Outside it, Meta needs an approved template. Twilio's sandbox can't send
  those, so there the free-form message is tried (and fails if the window is shut).
- Twilio has no buttons: choices become a numbered list ("1. Yes"), and we keep
  the payloads so a reply of "1" works like a tap.
"""

import logging
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, cast

import httpx
from psycopg.types.json import Jsonb
from psycopg_pool import AsyncConnectionPool

from ..config import Settings
from ..db import Conn
from .i18n import t
from .models import (
    Buttons,
    Choice,
    ListMenu,
    LocationRequest,
    Outbound,
    Route,
    SendResult,
    Template,
    Text,
)
from .providers import Meta, Twilio

log = logging.getLogger("bricks.whatsapp")

WINDOW = timedelta(hours=24) - timedelta(minutes=5)  # a little margin for clock skew
SESSION_TTL = timedelta(minutes=30)


@dataclass
class Contact:
    phone: str
    user_id: str | None
    route: Route
    last_inbound_at: datetime | None
    opt_out: bool
    choices: list[dict[str, str]]
    profile_name: str | None = None


class WhatsApp:
    def __init__(
        self,
        settings: Settings,
        pool: AsyncConnectionPool,
        client: httpx.AsyncClient,
        clock: Callable[[], datetime],
    ) -> None:
        self.settings = settings
        self.pool = pool
        self.clock = clock
        self.meta = Meta(settings, client)
        self.twilio = Twilio(settings, client)

    @asynccontextmanager
    async def connection(self) -> AsyncIterator[Conn]:
        """A pooled connection (one transaction, committed on success)."""
        async with self.pool.connection() as conn:
            yield cast(Conn, conn)

    @property
    def default_route(self) -> Route:
        return "meta" if self.meta.configured else "twilio"

    def provider(self, route: Route) -> Meta | Twilio:
        return self.meta if route == "meta" else self.twilio

    # ---------- Contacts ----------

    async def contact(self, conn: Conn, phone: str) -> Contact | None:
        row = await (
            await conn.execute("select * from wa_contacts where phone = %s", (phone,))
        ).fetchone()
        if not row:
            return None
        return Contact(
            phone=row["phone"],
            user_id=row["user_id"],
            route=row["route"],
            last_inbound_at=row["last_inbound_at"],
            opt_out=row["opt_out"],
            choices=list(row["choices"] or []),
            profile_name=row["profile_name"],
        )

    async def touch(self, conn: Conn, phone: str, route: Route, profile_name: str) -> Contact:
        """They wrote to us: the window opens, and replies go back on this route."""
        await conn.execute(
            "insert into wa_contacts (phone, route, profile_name, last_inbound_at, user_id)"
            " values (%(p)s, %(r)s, nullif(%(n)s, ''), %(now)s,"
            "   (select id from users where phone = %(p)s))"
            " on conflict (phone) do update set route = excluded.route,"
            "   last_inbound_at = excluded.last_inbound_at,"
            "   profile_name = coalesce(excluded.profile_name, wa_contacts.profile_name),"
            "   user_id = coalesce(wa_contacts.user_id, excluded.user_id)",
            {"p": phone, "r": route, "n": profile_name, "now": self.clock()},
        )
        contact = await self.contact(conn, phone)
        assert contact
        return contact

    async def link_user(self, conn: Conn, phone: str, user_id: str) -> None:
        await conn.execute(
            "insert into wa_contacts (phone, route, user_id) values (%s, %s, %s)"
            " on conflict (phone) do update set user_id = excluded.user_id",
            (phone, self.default_route, user_id),
        )

    async def set_opt_out(self, conn: Conn, phone: str, opt_out: bool) -> None:
        await conn.execute("update wa_contacts set opt_out = %s where phone = %s", (opt_out, phone))

    async def opt_in(self, conn: Conn, phone: str) -> None:
        await conn.execute(
            "update wa_contacts set opted_in_at = coalesce(opted_in_at, %s), opt_out = false"
            " where phone = %s",
            (self.clock(), phone),
        )

    def window_open(self, contact: Contact | None) -> bool:
        return bool(
            contact and contact.last_inbound_at and self.clock() - contact.last_inbound_at < WINDOW
        )

    # ---------- Sessions ----------

    async def session(self, conn: Conn, phone: str) -> dict[str, Any] | None:
        row = await (
            await conn.execute(
                "select flow, step, data from wa_sessions where phone = %s and expires_at > %s",
                (phone, self.clock()),
            )
        ).fetchone()
        return dict(row) if row else None

    async def set_session(
        self, conn: Conn, phone: str, flow: str, step: str, data: dict[str, Any] | None = None
    ) -> None:
        await conn.execute(
            "insert into wa_sessions (phone, flow, step, data, expires_at)"
            " values (%s, %s, %s, %s, %s)"
            " on conflict (phone) do update set flow = excluded.flow, step = excluded.step,"
            "   data = excluded.data, expires_at = excluded.expires_at",
            (phone, flow, step, Jsonb(data or {}), self.clock() + SESSION_TTL),
        )

    async def clear_session(self, conn: Conn, phone: str) -> None:
        await conn.execute("delete from wa_sessions where phone = %s", (phone,))

    # ---------- Idempotency and logs ----------

    async def first_time(self, conn: Conn, message_id: str) -> bool:
        """True the first time we see a message id (webhooks are retried)."""
        row = await (
            await conn.execute(
                "insert into wa_seen (message_id) values (%s) on conflict do nothing"
                " returning message_id",
                (message_id,),
            )
        ).fetchone()
        return row is not None

    async def log(
        self,
        conn: Conn,
        phone: str,
        direction: str,
        route: str,
        kind: str,
        result: SendResult | None = None,
        user_id: str | None = None,
    ) -> None:
        await conn.execute(
            "insert into messages_log (phone, user_id, direction, route, kind, ok, provider_id,"
            " error, at) values (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                phone,
                user_id,
                direction,
                route,
                kind,
                result.ok if result else True,
                result.provider_id if result else None,
                (result.error or "")[:500] if result else None,
                self.clock(),
            ),
        )

    # ---------- Sending ----------

    async def send(
        self, conn: Conn, phone: str, msg: Outbound, *, lang: str = "en", urgent: bool = False
    ) -> SendResult:
        """Sends one message the right way for this number (see the module docstring).

        Paused numbers (STOP) only get `urgent` messages: SOS alerts and family alerts.
        """
        contact = await self.contact(conn, phone)
        route: Route = contact.route if contact else self.default_route
        user_id = contact.user_id if contact else None
        if contact and contact.opt_out and not urgent:
            result = SendResult(ok=False, error="opted out", kind="skipped")
            await self.log(conn, phone, "out", route, "skipped", result, user_id)
            return result

        if isinstance(msg, Template):
            use_template = route == "meta" and not self.window_open(contact)
            kind = f"template:{msg.name}" if use_template else f"freeform:{msg.name}"
            out: Outbound = msg if use_template else msg.fallback
        else:
            kind, out = type(msg).__name__.lower(), msg

        provider = self.provider(route)
        if not provider.configured:
            result = SendResult(ok=False, error=f"{route} isn't configured")
        elif route == "twilio":
            text, choices = self.as_text(out, lang)
            await conn.execute(
                "update wa_contacts set choices = %s where phone = %s",
                (Jsonb([{"id": c.id, "title": c.title} for c in choices]), phone),
            )
            result = await provider.send(phone, Text(text))
        else:
            result = await provider.send(phone, out)
        result.kind = kind
        if not result.ok:
            log.warning("WhatsApp send failed (%s, %s): %s", route, kind, result.error)
        await self.log(conn, phone, "out", route, kind, result, user_id)
        return result

    async def send_image(self, conn: Conn, phone: str, url: str, caption: str) -> SendResult:
        contact = await self.contact(conn, phone)
        route: Route = contact.route if contact else self.default_route
        result = await self.provider(route).send_image(phone, url, caption)
        result.kind = "image"
        await self.log(
            conn, phone, "out", route, "image", result, contact.user_id if contact else None
        )
        return result

    @staticmethod
    def as_text(msg: Outbound, lang: str) -> tuple[str, list[Choice]]:
        """Twilio: buttons and lists as a numbered list."""
        if isinstance(msg, Text):
            return msg.body, []
        if isinstance(msg, LocationRequest):
            return msg.fallback, []
        if isinstance(msg, Template):
            return WhatsApp.as_text(msg.fallback, lang)
        choices = msg.choices
        lines = [f"*{i}.* {c.title}" for i, c in enumerate(choices, start=1)]
        body = msg.body if isinstance(msg, Buttons | ListMenu) else ""
        return f"{body}\n\n" + "\n".join(lines) + f"\n\n{t(lang, 'choose_number')}", choices

    @staticmethod
    def chosen(contact: Contact, text: str) -> str | None:
        """Twilio: the payload for a reply of "1", or of a choice's title."""
        answer = text.strip().rstrip(".").casefold()
        if answer.isdigit():
            i = int(answer) - 1
            return contact.choices[i]["id"] if 0 <= i < len(contact.choices) else None
        return next((c["id"] for c in contact.choices if c["title"].casefold() == answer), None)
