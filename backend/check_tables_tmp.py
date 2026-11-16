"""Temporary check: which core tables exist right now? Prints no secrets - only names and counts."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))

from sqlalchemy import text

from app.core.db import engine

with engine().connect() as conn:
    tables = {r[0] for r in conn.execute(text("select tablename from pg_tables where schemaname = 'public'"))}
    applied = [r[0] for r in conn.execute(text("select filename from schema_migrations order by filename"))] if "schema_migrations" in tables else []
print("tables:", len(tables))
print("profiles exists:", "profiles" in tables, "| users exists:", "users" in tables, "| schema_migrations rows:", len(applied))
print("last applied:", applied[-5:] if applied else "none")
