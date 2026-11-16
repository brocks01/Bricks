import os
from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Connection, create_engine
from sqlalchemy.engine import Engine

from .config import get_settings


@lru_cache
def engine() -> Engine:
    """The one connection pool of this process. It is deliberately SMALL: the hosted database (Supabase in session mode) allows only 15 connections in total,
    shared by every process that talks to it (the live server, an instance that is starting while the old one still runs, a developer's laptop, a test run).
    A large pool here used up all of them and the new server could not start ("max clients reached in session mode"). Change with DB_POOL_SIZE / DB_MAX_OVERFLOW."""
    return create_engine(
        get_settings().database_url,
        pool_pre_ping=True,
        pool_size=int(os.environ.get("DB_POOL_SIZE", "3")),
        max_overflow=int(os.environ.get("DB_MAX_OVERFLOW", "2")),
        pool_recycle=240,  # give idle connections back before the pooler drops them
    )


def get_conn() -> Iterator[Connection]:
    """One database transaction per request: committed if the request succeeds, rolled back if it fails."""
    with engine().begin() as conn:
        yield conn
