"""Apply new database migrations without touching any data.

    uv run python -m bricks_api.migrate            # the schema in DB_SCHEMA
    uv run python -m bricks_api.migrate bricks_x   # another schema

Unlike `bricks_api.seed` (which empties every table and loads sample data), this only
runs migrations/*.sql files that haven't been applied yet. Migrations only add things.
"""

import asyncio
import sys

from psycopg import AsyncConnection
from psycopg.rows import dict_row

from .config import get_settings
from .db import check_schema, loop_factory, migrate


async def main() -> None:
    settings = get_settings()
    schema = check_schema(sys.argv[1] if len(sys.argv) > 1 else settings.db_schema)
    async with await AsyncConnection.connect(
        settings.database_url.get_secret_value(), row_factory=dict_row, prepare_threshold=None
    ) as conn:
        applied = await migrate(conn, schema)
        await conn.commit()
    print(f"Schema {schema!r}: applied {applied or 'nothing (up to date)'}")


if __name__ == "__main__":
    asyncio.run(main(), loop_factory=loop_factory())
