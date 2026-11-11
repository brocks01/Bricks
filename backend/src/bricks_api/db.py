"""Postgres connection pool. Every request runs in one transaction."""

import asyncio
import re
import sys
from collections.abc import AsyncIterator, Callable
from pathlib import Path
from typing import Any

from psycopg import AsyncConnection, sql
from psycopg.rows import DictRow, dict_row
from psycopg_pool import AsyncConnectionPool

Conn = AsyncConnection[DictRow]

MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "migrations"
_SCHEMA_RE = re.compile(r"^[a-z_][a-z0-9_]{0,62}$")


def check_schema(name: str) -> str:
    if not _SCHEMA_RE.match(name):
        raise ValueError(f"Bad schema name: {name!r}")
    return name


def make_pool(
    dsn: str, schema: str, *, min_size: int = 1, max_size: int = 10
) -> AsyncConnectionPool:
    check_schema(schema)

    async def configure(conn: AsyncConnection[Any]) -> None:
        # Our tables first; "extensions" is where Supabase keeps pgcrypto etc.
        await conn.execute(
            sql.SQL("set search_path to {}, extensions, public").format(sql.Identifier(schema))
        )
        await conn.commit()

    return AsyncConnectionPool(
        dsn,
        min_size=min_size,
        max_size=max_size,
        open=False,
        configure=configure,
        # The Supabase pooler doesn't keep server-side prepared statements.
        kwargs={"row_factory": dict_row, "prepare_threshold": None, "autocommit": False},
    )


async def connection(pool: AsyncConnectionPool) -> AsyncIterator[Conn]:
    """Commits when the request succeeds, rolls back when it raises."""
    async with pool.connection() as conn:
        yield conn  # type: ignore[misc]


async def migrate(conn: Conn, schema: str) -> list[str]:
    """Applies migrations/*.sql in order, once each. Returns the ones applied now."""
    ident = sql.Identifier(check_schema(schema))
    await conn.execute(sql.SQL("create schema if not exists {}").format(ident))
    await conn.execute(sql.SQL("set search_path to {}, extensions, public").format(ident))
    await conn.execute(
        "create table if not exists schema_migrations"
        " (name text primary key, applied_at timestamptz not null default now())"
    )
    done = {
        r["name"]
        for r in await (await conn.execute("select name from schema_migrations")).fetchall()
    }
    applied: list[str] = []
    for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
        if path.name in done:
            continue
        await conn.execute(path.read_text(encoding="utf-8"))
        await conn.execute("insert into schema_migrations (name) values (%s)", (path.name,))
        applied.append(path.name)
    await conn.commit()
    return applied


def loop_factory() -> Callable[[], asyncio.AbstractEventLoop] | None:
    """psycopg's async mode can't use Windows' default (Proactor) event loop."""
    return asyncio.SelectorEventLoop if sys.platform == "win32" else None
