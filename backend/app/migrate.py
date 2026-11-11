"""Applies the SQL files in backend/migrations in order, each once. Tracked in the schema_migrations table."""
from pathlib import Path

from sqlalchemy import text

from .core.db import engine

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"


def run() -> list[str]:
    applied: list[str] = []
    with engine().begin() as conn:
        conn.execute(text("create table if not exists schema_migrations (filename text primary key, applied_at timestamptz not null default now())"))
        done = {r[0] for r in conn.execute(text("select filename from schema_migrations"))}
    for f in sorted(MIGRATIONS.glob("*.sql")):
        if f.name in done:
            continue
        with engine().begin() as conn:  # one transaction per file
            conn.exec_driver_sql(f.read_text(encoding="utf-8"))
            conn.execute(text("insert into schema_migrations (filename) values (:n)"), {"n": f.name})
        applied.append(f.name)
    return applied


if __name__ == "__main__":
    print("applied:", run() or "nothing new")
