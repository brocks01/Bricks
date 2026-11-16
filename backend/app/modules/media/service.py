"""Media: one small module for pictures. Uploads go to Cloudinary (signed upload over its REST API, no SDK); we keep a row per picture.

Settings (backend/.env, never committed): CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, or the single CLOUDINARY_URL
(cloudinary://<key>:<secret>@<cloud>). Without them uploads answer 503 "media_off". Rules: images only (jpeg, png, webp), 5 MB at most,
the real file type is checked from the bytes, never from the name the caller sent.
This is deliberately basic. A fuller media system (private files, video, other providers) comes later behind the same two functions."""
import hashlib
import os
import re
import time
from urllib.parse import urlparse

import httpx
from sqlalchemy import Connection, text

MAX_BYTES = 5 * 1024 * 1024
KINDS = ("avatar", "community_logo", "community_cover", "activity_image", "announcement_image", "other")


class MediaError(Exception):
    def __init__(self, code: str, status: int = 400):
        super().__init__(code)
        self.code, self.status = code, status


def _settings() -> dict | None:
    cloud, key, secret = (os.environ.get(k, "").strip() for k in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"))
    url = os.environ.get("CLOUDINARY_URL", "").strip()
    if url and not (cloud and key and secret):
        p = urlparse(url)
        cloud, key, secret = p.hostname or "", p.username or "", p.password or ""
    return {"cloud": cloud, "key": key, "secret": secret} if cloud and key and secret else None


def enabled() -> bool:
    return _settings() is not None


def sniff(data: bytes) -> str | None:
    """The real image type from the first bytes, or None."""
    if data[:3] == b"\xff\xd8\xff":
        return "jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def _sign(params: dict, secret: str) -> str:
    to_sign = "&".join(f"{k}={params[k]}" for k in sorted(params) if params[k] not in (None, ""))
    return hashlib.sha1((to_sign + secret).encode()).hexdigest()


def upload(conn: Connection, owner_id: str, kind: str, data: bytes) -> dict:
    s = _settings()
    if not s:
        raise MediaError("media_off", 503)
    if kind not in KINDS:
        raise MediaError("bad_kind")
    if not data or len(data) > MAX_BYTES:
        raise MediaError("too_big" if data else "empty", 413 if data else 400)
    if not sniff(data):
        raise MediaError("not_an_image", 415)
    params = {"folder": f"wisdom/{kind}", "timestamp": int(time.time())}
    try:
        r = httpx.post(
            f"https://api.cloudinary.com/v1_1/{s['cloud']}/image/upload",
            data={**params, "api_key": s["key"], "signature": _sign(params, s["secret"])},
            files={"file": ("upload", data)},
            timeout=30,
        )
    except httpx.HTTPError as e:
        raise MediaError("media_unreachable", 502) from e
    if r.status_code >= 300:
        raise MediaError("media_refused", 502)  # never echo the provider's message: it can name the account
    j = r.json()
    url = re.sub(r"^http://", "https://", j.get("secure_url") or j.get("url") or "")
    row = conn.execute(
        text("insert into media_assets (owner_id, kind, public_id, url, bytes, width, height) values (:o, :k, :p, :u, :b, :w, :h) returning id"),
        {"o": owner_id, "k": kind, "p": j.get("public_id", ""), "u": url, "b": j.get("bytes"), "w": j.get("width"), "h": j.get("height")},
    ).one()
    return {"id": str(row.id), "url": url, "width": j.get("width"), "height": j.get("height"), "kind": kind}
