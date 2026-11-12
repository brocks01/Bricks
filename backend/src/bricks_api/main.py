"""The FastAPI app: `uv run uvicorn bricks_api.main:app` (see backend/README.md)."""

import logging
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from datetime import UTC, datetime

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .auth import TokenVerifier
from .calls.audio import AUDIO_DIR
from .config import Settings, get_settings
from .db import make_pool
from .routers import (
    assistant,
    calls,
    care,
    circles,
    demo,
    events,
    family,
    me,
    orgs,
    passiton,
    sos,
    thrive,
    voice,
    walks,
)
from .schemas import Health
from .storage import Storage

log = logging.getLogger("bricks")


def create_app(
    settings: Settings | None = None,
    *,
    clock: Callable[[], datetime] = lambda: datetime.now(UTC),
) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        pool = make_pool(settings.database_url.get_secret_value(), settings.db_schema)
        await pool.open(wait=True, timeout=30)
        async with httpx.AsyncClient(timeout=20) as client:
            app.state.pool = pool
            app.state.storage = Storage(settings, client)
            try:
                yield
            finally:
                await pool.close()

    app = FastAPI(title="Bricks API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.clock = clock
    app.state.verifier = TokenVerifier(settings)

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_methods=["*"],
            allow_headers=["Authorization", "Content-Type", "X-Demo-User"],
        )

    @app.exception_handler(Exception)
    async def unexpected(request: Request, error: Exception) -> JSONResponse:
        log.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse({"detail": "Something went wrong."}, status_code=500)

    @app.get("/health", tags=["health"])
    async def health(request: Request) -> Health:
        try:
            async with request.app.state.pool.connection() as conn:
                await conn.execute("select 1")
            ok = True
        except Exception:
            ok = False
        return Health(status="ok", database=ok)

    routers = (
        me,
        events,
        circles,
        thrive,
        walks,
        sos,
        passiton,
        family,
        voice,
        calls,
        demo,
        assistant,
        orgs,
        care,
    )
    for module in routers:
        app.include_router(module.router)
    # Pre-generated call audio, fetched by Twilio while the call plays.
    app.mount("/static/voice", StaticFiles(directory=AUDIO_DIR, check_dir=False), name="call-audio")
    return app


app = create_app()
