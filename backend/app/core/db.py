from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Connection, create_engine
from sqlalchemy.engine import Engine

from .config import get_settings


@lru_cache
def engine() -> Engine:
    return create_engine(get_settings().database_url, pool_pre_ping=True, pool_size=10, max_overflow=20)


def get_conn() -> Iterator[Connection]:
    """One database transaction per request: committed if the request succeeds, rolled back if it fails."""
    with engine().begin() as conn:
        yield conn
