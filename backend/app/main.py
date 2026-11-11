"""Bricks API. One service, one database, split into modules. Start it with:  python backend/run.py"""
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .core.db import engine
from .modules.identity.router import router as identity_router
from .modules.agent.router import router as agent_router
from .modules.communities.router import router as communities_router
from .modules.media.router import router as media_router
from .modules.voice.router import router as voice_router
from .modules.translation.router import router as translation_router

app = FastAPI(title="Bricks API", version="0.1.0")

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
app.include_router(communities_router)
app.include_router(media_router)
app.include_router(translation_router)


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
