"""Bricks API. One service, one database, split into modules. Start it with:  python backend/run.py"""
import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from . import migrate
from .core.db import engine
from .modules.identity.router import router as identity_router
from .modules.agent.router import router as agent_router
from .modules.communities.router import router as communities_router
from .modules.communities.rules_router import router as community_rules_router
from .modules.communities.lead_router import router as community_lead_router
from .modules.communities.screens_router import router as community_screens_router
from .modules.explore.router import router as explore_router
from .modules.grow.router import router as grow_router
from .modules.media.router import router as media_router
from .modules.voice.router import router as voice_router
from .modules.translation.router import router as translation_router
from .modules.family.router import router as family_router
from .modules.calendar.router import router as calendar_router
from .modules.market.router import router as market_router
from .modules.market.events_router import router as market_events_router
from .modules.health.router import router as health_router
from .modules.nodes.router import router as nodes_router
from .modules.home.router import router as home_router

# Migrations run by themselves at startup: a fresh deploy never waits on a person running SQL by hand.
# One applier at a time (Postgres advisory lock), so overlapping instances during a Render swap cannot
# apply the same file twice; the database may still be waking up on a cold boot, so a few tries are allowed.
MIGRATION_LOCK = 727272


def apply_migrations() -> list[str]:
    with engine().begin() as conn:
        conn.execute(text("select pg_advisory_lock(:k)"), {"k": MIGRATION_LOCK})
        try:
            return migrate.run()
        finally:
            conn.execute(text("select pg_advisory_unlock(:k)"), {"k": MIGRATION_LOCK})


@asynccontextmanager
async def lifespan(_: FastAPI):
    last: Exception | None = None
    for _ in range(6):
        try:
            applied = apply_migrations()
            if applied:
                print("migrations applied:", ", ".join(applied))
            break
        except Exception as e:  # noqa: BLE001 - any failure means the database is not ready yet
            last = e
            await asyncio.sleep(5)
    else:
        raise RuntimeError(f"the database migrations did not apply: {last}")
    # The ONE background thing in the app: the reminder loop (calls, retries, reconciliation).
    # It checks REMINDER_LOOP=off on every tick, so tests can hold it still.
    from .modules.calendar import calls as calendar_calls

    reminder_task = asyncio.create_task(calendar_calls.loop())
    try:
        yield
    finally:
        reminder_task.cancel()


app = FastAPI(title="Bricks API", version="0.1.0", lifespan=lifespan)

# Who may call the API from a browser: this computer and its network, any Vercel address (the website is deployed there), and the exact
# addresses listed in CORS_ORIGINS (a comma list, for example the final domain). The API uses Authorization tokens, not cookies, so this is not a
# cookie-theft door; the tokens still decide who is who.
_extra = [o.strip().rstrip("/") for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_extra,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$|^https://[a-z0-9-]+\.vercel\.app$",
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(identity_router)
app.include_router(voice_router)
app.include_router(agent_router)
app.include_router(community_rules_router)  # before communities_router: that one has /{community_id}
app.include_router(community_lead_router)
app.include_router(communities_router)
app.include_router(community_screens_router)
app.include_router(explore_router)
app.include_router(grow_router)
app.include_router(media_router)
app.include_router(translation_router)
app.include_router(family_router)
app.include_router(calendar_router)
app.include_router(market_router)
app.include_router(market_events_router)
app.include_router(health_router)
app.include_router(nodes_router)
app.include_router(home_router)


@app.get("/v1/health")
def health():
    with engine().connect() as conn:
        conn.execute(text("select 1"))
    return {"ok": True, "version": app.version}


# The built web app (npx expo export --platform web, in app/dist), served from here so ONE address (a tunnel) carries the site and the API.
_DIST = Path(__file__).resolve().parents[2] / "app" / "dist"
if _DIST.is_dir():

    @app.get("/{path:path}", include_in_schema=False)
    def web_app(path: str):
        if path.startswith(("v1/", "twilio/", "media")):
            return JSONResponse(status_code=404, content={"detail": "not found"})
        f = (_DIST / path).resolve()
        if path and f.is_file() and _DIST in f.parents:
            return FileResponse(f)
        return FileResponse(_DIST / "index.html")  # the app's own router decides what the address means

