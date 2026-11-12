"""POST /demo/reset on its own schema, so wiping it can't disturb the other tests."""

import time
from datetime import UTC, datetime

import httpx
from psycopg import AsyncConnection, sql
from psycopg.rows import dict_row

from bricks_api.config import Settings
from bricks_api.db import migrate
from bricks_api.main import create_app
from bricks_api.seed import seed

from .conftest import FakeStorage

RESET_SCHEMA = "bricks_test_reset"


async def test_reset_brings_back_the_demo_story_quickly(settings: Settings) -> None:
    reset_settings = settings.model_copy(update={"db_schema": RESET_SCHEMA})
    url = settings.database_url.get_secret_value()
    async with await AsyncConnection.connect(
        url, row_factory=dict_row, prepare_threshold=None
    ) as conn:
        await conn.execute(
            sql.SQL("drop schema if exists {} cascade").format(sql.Identifier(RESET_SCHEMA))
        )
        await migrate(conn, RESET_SCHEMA)
        await seed(conn, reset_settings, datetime.now(UTC), FakeStorage())  # type: ignore[arg-type]
        await conn.commit()
    try:
        app = create_app(reset_settings)
        async with app.router.lifespan_context(app):
            app.state.storage = FakeStorage()
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(
                transport=transport, base_url="http://test", timeout=60
            ) as client:
                # Change the story: an SOS, and Raj gives up his walk.
                await client.post("/sos", json={"trigger": "button", "lat": None, "lng": None})
                assert (await client.get("/sos/active")).json() is not None

                started = time.monotonic()
                r = await client.post("/demo/reset")
                assert r.status_code == 200
                assert time.monotonic() - started < 10  # the runbook's target
                assert r.json()["seconds"] < 10

                # Back to the seeded story.
                assert (await client.get("/sos/active")).json() is None
                assert (await client.get("/me")).json()["name"] == "Raj Kumar"
                profile = (await client.get("/users/me/profile")).json()
                assert profile["given"]["thank_yous"] == 13
    finally:
        async with await AsyncConnection.connect(url, prepare_threshold=None) as conn:
            await conn.execute(
                sql.SQL("drop schema if exists {} cascade").format(sql.Identifier(RESET_SCHEMA))
            )
            await conn.commit()
