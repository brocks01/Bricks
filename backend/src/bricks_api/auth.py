"""Supabase sign-in tokens (docs/03 §8: JWT on all app calls).

The app sends `Authorization: Bearer <Supabase access token>`. We check it
ourselves: ES256/RS256 tokens against the project's public keys (JWKS), and
legacy HS256 tokens against SUPABASE_JWT_SECRET when that's set.
"""

from dataclasses import dataclass
from typing import Any

import anyio
import jwt
from jwt import PyJWKClient

from .config import Settings


class InvalidToken(Exception):
    pass


@dataclass(frozen=True)
class AuthClaims:
    auth_id: str
    email: str | None
    name: str | None
    phone: str | None


class TokenVerifier:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._jwks = PyJWKClient(
            f"{settings.supabase_issuer}/.well-known/jwks.json", cache_keys=True, lifespan=3600
        )

    async def verify(self, token: str) -> AuthClaims:
        try:
            header = jwt.get_unverified_header(token)
            alg = header.get("alg")
            key: Any
            if alg == "HS256":
                secret = self._settings.supabase_jwt_secret
                if not secret or not secret.get_secret_value():
                    raise InvalidToken("HS256 token but no SUPABASE_JWT_SECRET")
                key = secret.get_secret_value()
            elif alg in ("ES256", "RS256"):
                key = (
                    await anyio.to_thread.run_sync(self._jwks.get_signing_key_from_jwt, token)
                ).key
            else:
                raise InvalidToken(f"Unsupported alg {alg}")
            claims = jwt.decode(
                token,
                key,
                algorithms=[alg],
                audience="authenticated",
                issuer=self._settings.supabase_issuer,
                options={"require": ["exp", "sub"]},
            )
        except InvalidToken:
            raise
        except (jwt.PyJWTError, jwt.PyJWKClientError) as error:
            raise InvalidToken(str(error)) from error

        meta = claims.get("user_metadata") or {}
        return AuthClaims(
            auth_id=str(claims["sub"]),
            email=claims.get("email") or None,
            name=meta.get("full_name") or meta.get("name") or None,
            phone=claims.get("phone") or None,
        )
