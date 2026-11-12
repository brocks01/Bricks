"""The migrations apply themselves when the service starts, and applying them twice changes nothing."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.main import app, apply_migrations
from app.core.db import engine


@pytest.fixture(scope="module", autouse=True)
def started():
    with TestClient(app):  # entering the client runs the startup (lifespan), like a real boot
        yield


def test_every_migration_file_is_recorded_after_a_boot():
    with engine().begin() as conn:
        done = {r[0] for r in conn.execute(text("select filename from schema_migrations"))}
    import app.migrate as m
    files = {f.name for f in m.MIGRATIONS.glob("*.sql")}
    assert files <= done, f"not applied at startup: {sorted(files - done)}"


def test_running_them_again_changes_nothing():
    assert apply_migrations() == []
