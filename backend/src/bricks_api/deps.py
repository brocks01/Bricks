"""Per-request context: the database transaction, the member and the clock."""

from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Request

from .auth import InvalidToken, TokenVerifier
from .config import Settings
from .db import Conn, connection
from .ids import new_id


@dataclass
class Ctx:
    conn: Conn
    user_id: str
    now: datetime
    settings: Settings


async def get_conn(request: Request) -> AsyncIterator[Conn]:
    async for conn in connection(request.app.state.pool):
        yield conn


async def _user_for_token(conn: Conn, verifier: TokenVerifier, token: str) -> str:
    try:
        claims = await verifier.verify(token)
    except InvalidToken as error:
        raise HTTPException(401, "Please sign in again.") from error
    row = await (
        await conn.execute("select id from users where auth_id = %s", (claims.auth_id,))
    ).fetchone()
    if row:
        return str(row["id"])
    # First request after signing in: make their account. Onboarding fills in the rest.
    name = claims.name or (claims.email.split("@")[0] if claims.email else "Friend")
    user_id = new_id("u")
    await conn.execute(
        "insert into users (id, auth_id, name, phone, onboarded_by, status)"
        " values (%s, %s, %s, %s, 'self', 'active')"
        " on conflict (auth_id) do nothing",
        (user_id, claims.auth_id, name, claims.phone),
    )
    row = await (
        await conn.execute("select id from users where auth_id = %s", (claims.auth_id,))
    ).fetchone()
    assert row is not None
    return str(row["id"])


async def get_ctx(request: Request, conn: Annotated[Conn, Depends(get_conn)]) -> Ctx:
    settings: Settings = request.app.state.settings
    clock: Callable[[], datetime] = request.app.state.clock
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        user_id = await _user_for_token(conn, request.app.state.verifier, header[7:].strip())
    elif settings.demo_mode:
        # Demo sign-in (Singpass mock): the sample member.
        user_id = settings.demo_user_id
    else:
        raise HTTPException(401, "Please sign in.")
    return Ctx(conn=conn, user_id=user_id, now=clock(), settings=settings)


CtxDep = Annotated[Ctx, Depends(get_ctx)]


def not_found(what: str) -> HTTPException:
    return HTTPException(404, f"Not found: {what}")
