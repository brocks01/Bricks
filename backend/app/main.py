"""Interchange API. One service, one database, split into modules. Start it with:  python backend/run.py"""
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
from .modules.belonging.router import router as belonging_router
from .modules.explore.router import router as explore_router
from .modules.grow.router import router as grow_router
from .modules.media.router import router as media_router
from .modules.voice.router import router as voice_router
from .modules.translation.router import router as translation_router
from .modules.family.router import router as family_router
from .modules.calendar.router import router as calendar_router
from .modules.market.router import router as market_router
from .modules.market.events_router import router as market_events_router
from .modules.skills.router import router as skills_router
from .modules.channels.router import inbox_router, router as channels_router
from .modules.health.router import router as health_router
from .modules.nodes.router import router as nodes_router
from .modules.home.router import router as home_router
from .modules.onboarding.router import profile_router, router as onboarding_router
from .modules.wisdom.router import router as wisdom_router
from .modules.insights.router import router as insights_router
from .modules.hosts.router import router as hosts_router
from .modules.safety.router import router as safety_router
from .modules.geo.router import router as geo_router

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


async def _boot(tasks: list) -> None:
    """Apply the migrations and start the background loops, in the BACKGROUND. The server itself starts at once and answers its health check even while the
    database is busy: during a deploy the old instance still holds database connections (a hosted database allows few), so a new instance that insisted on
    connecting first could never start, and the old one would never be replaced. Here it simply keeps trying, then carries on."""
    last: Exception | None = None
    for attempt in range(90):  # about a quarter of an hour
        try:
            applied = await asyncio.to_thread(apply_migrations)
            if applied:
                print("migrations applied:", ", ".join(applied))
            break
        except Exception as e:  # noqa: BLE001 - any failure means the database is not ready yet
            last = e
            if attempt in (0, 6, 30, 80):
                print("database not ready yet, still trying:", str(e).splitlines()[0][:180])
            await asyncio.sleep(10)
    else:
        print("the database migrations did not apply:", last)
        return
    # Keep the demo person in step with the database this server uses (the live one on Render, the local one on a laptop): one small JSON, nothing duplicated.
    # DEMO_SYNC=off holds it still.
    if (os.environ.get("DEMO_SYNC") or "on") != "off":
        try:
            from .core.db import engine
            from .modules.identity import service as identity_service

            def _sync() -> None:
                with engine().begin() as conn:
                    identity_service.ensure_uncle_tan(conn)

            await asyncio.to_thread(_sync)
            print("demo data in step: Uncle Tan")
        except Exception as e:  # noqa: BLE001 - the server works without it
            print("demo data not synced:", str(e).splitlines()[0][:180])
    # The ONE background thing in the app: the reminder loop (calls, retries, reconciliation).
    # It checks REMINDER_LOOP=off on every tick, so tests can hold it still.
    from .modules.calendar import calls as calendar_calls

    tasks.append(asyncio.create_task(calendar_calls.loop()))
    # The Telegram bot listens only when a token is set and no webhook is configured (TELEGRAM_MODE=webhook).
    from .modules.channels import outbox, telegram

    tasks.append(asyncio.create_task(outbox.loop()))  # nudges and queued messages (OUTBOX_LOOP=off holds it still)
    if telegram.enabled() and (os.environ.get("TELEGRAM_MODE") or "poll") == "poll":
        tasks.append(asyncio.create_task(telegram.poll_loop()))


@asynccontextmanager
async def lifespan(_: FastAPI):
    tasks: list = []
    boot = asyncio.create_task(_boot(tasks))
    try:
        yield
    finally:
        boot.cancel()
        for t in tasks:
            t.cancel()


app = FastAPI(title="Interchange API", version="0.1.0", lifespan=lifespan)

# Who may call the API from a browser: this computer and its network, any Vercel address (the website is deployed there), and the exact
# addresses listed in CORS_ORIGINS (a comma list, for example the final domain). The API uses Authorization tokens, not cookies, so this is not a
# cookie-theft door; the tokens still decide who is who.
_extra = [o.strip().rstrip("/") for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])  # prototype: any website may call the API (the API uses Authorization tokens, not cookies)
app.include_router(identity_router)
app.include_router(voice_router)
app.include_router(agent_router)
app.include_router(community_rules_router)  # before communities_router: that one has /{community_id}
app.include_router(community_lead_router)
app.include_router(communities_router)
app.include_router(community_screens_router)
app.include_router(belonging_router)
app.include_router(explore_router)
app.include_router(grow_router)
app.include_router(media_router)
app.include_router(translation_router)
app.include_router(family_router)
app.include_router(calendar_router)
app.include_router(market_router)
app.include_router(market_events_router)
app.include_router(skills_router)
app.include_router(channels_router)
app.include_router(inbox_router)
app.include_router(health_router)
app.include_router(nodes_router)
app.include_router(home_router)
app.include_router(onboarding_router)
app.include_router(wisdom_router)
app.include_router(insights_router)
app.include_router(hosts_router)
app.include_router(safety_router)
app.include_router(geo_router)
app.include_router(profile_router)


@app.get("/healthz")
@app.head("/healthz")
def healthz():
    """Is the server up? Needs no database, so a deploy's health check passes even while the database is busy. Point Render's health check at this."""
    return {"ok": True}


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

