"""Readable ids with a prefix ("e_3f9c1a2b7d"), like the seed and mock data."""

import secrets


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(5)}"
