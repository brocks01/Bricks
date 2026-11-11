"""The pasted database address is made safe: a raw password with special characters must not break it. No database needed."""
from urllib.parse import urlsplit

from app.core.config import clean_database_url


def test_a_password_with_an_at_sign_and_other_specials_is_encoded():
    u = urlsplit(clean_database_url("postgresql://postgres.abc:p@ss:w/rd#1@aws-0-x.pooler.supabase.com:5432/postgres"))
    assert u.hostname == "aws-0-x.pooler.supabase.com" and u.port == 5432 and u.path == "/postgres"
    assert u.username == "postgres.abc" and u.password == "p%40ss%3Aw%2Frd%231"


def test_postgres_scheme_becomes_postgresql():
    assert clean_database_url("postgres://u:pw@host:5432/db").startswith("postgresql://u:pw@host")


def test_an_already_encoded_password_is_not_encoded_twice():
    assert clean_database_url("postgresql://u:p%40ss@host/db") == "postgresql://u:p%40ss@host/db"


def test_a_plain_address_and_a_local_one_are_unchanged():
    assert clean_database_url("postgresql://bricks_app:secret@localhost:5432/bricks") == "postgresql://bricks_app:secret@localhost:5432/bricks"
    assert clean_database_url("not a url") == "not a url"


def test_an_address_with_no_password_is_kept():
    assert clean_database_url("postgresql://user@host/db") == "postgresql://user@host/db"
