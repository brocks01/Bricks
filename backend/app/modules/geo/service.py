"""Maps and distance: an address becomes a place (latitude, longitude), two places give a distance, and a stored address gives a map picture.

The key is GOOGLE_MAPS_API_KEY, read here on the server only (backend/.env). It is never sent to the app, never logged and never returned.
Without a key everything still works: locate() answers None, there is no map picture, and the callers fall back to area names.

  locate(conn, address)       -> (lat, lng) | None   cached in geo_places; "not found" is kept 7 days; never raises
  distance_km(a, b)           -> km between two (lat, lng) pairs (haversine)
  map_png(address)            -> PNG bytes | None    one Maps Static picture, kept on disk 30 days
"""
import hashlib
import logging
import math
import os
import re
import time
from pathlib import Path

import httpx
from sqlalchemy import Connection, text

log = logging.getLogger("geo")

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
STATIC_URL = "https://maps.googleapis.com/maps/api/staticmap"
TIMEOUT = 5.0
MISS_DAYS = 7
MAP_DAYS = 30
CACHE_DIR = Path(__file__).resolve().parents[3] / ".cache" / "maps"


def _key() -> str:
    return (os.environ.get("GOOGLE_MAPS_API_KEY") or "").strip()


def has_key() -> bool:
    return bool(_key())


def normalise(address: str | None) -> str:
    return re.sub(r"\s+", " ", (address or "").strip().lower())


def _fetch_geocode(address: str) -> dict | None:
    """One Geocoding call. Kept apart so tests can replace it. Never raises; never puts the key in a log line."""
    try:
        r = httpx.get(GEOCODE_URL, params={"address": address, "key": _key()}, timeout=TIMEOUT)
        if r.status_code != 200:
            log.warning("geocode answered %s", r.status_code)
            return None
        return r.json()
    except (httpx.HTTPError, ValueError) as e:
        log.warning("geocode failed: %s", type(e).__name__)
        return None


def _fetch_static(address: str) -> bytes | None:
    """One Maps Static call: 600x300 at scale 2 with one marker. Never raises; never puts the key in a log line."""
    try:
        r = httpx.get(STATIC_URL, params={"size": "600x300", "scale": "2", "markers": address, "key": _key()}, timeout=TIMEOUT)
        if r.status_code != 200 or not r.headers.get("content-type", "").startswith("image/"):
            log.warning("static map answered %s", r.status_code)
            return None
        return r.content
    except httpx.HTTPError as e:
        log.warning("static map failed: %s", type(e).__name__)
        return None


def locate(conn: Connection, address: str | None) -> tuple[float, float] | None:
    key = normalise(address)
    if not key:
        return None
    row = conn.execute(text("select lat, lng, found, geocoded_at > now() - make_interval(days => :d) as fresh from geo_places where key = :k"),
                       {"k": key, "d": MISS_DAYS}).first()
    if row is not None and (row.found or row.fresh):
        return (row.lat, row.lng) if row.found else None
    if not has_key():
        return None
    data = _fetch_geocode(address or "")
    if data is None:
        return None  # a network or provider failure is not cached: next time it is tried again
    results = data.get("results") or []
    loc = ((results[0].get("geometry") or {}).get("location") or {}) if data.get("status") == "OK" and results else {}
    found = "lat" in loc and "lng" in loc
    conn.execute(
        text("insert into geo_places (key, lat, lng, found, geocoded_at) values (:k, :la, :ln, :f, now()) "
             "on conflict (key) do update set lat = excluded.lat, lng = excluded.lng, found = excluded.found, geocoded_at = now()"),
        {"k": key, "la": loc.get("lat") if found else None, "ln": loc.get("lng") if found else None, "f": found})
    return (float(loc["lat"]), float(loc["lng"])) if found else None


def distance_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371.0088 * 2 * math.asin(math.sqrt(h))


def map_png(address: str | None) -> bytes | None:
    key = normalise(address)
    if not key or not has_key():
        return None
    path = CACHE_DIR / (hashlib.sha256(key.encode()).hexdigest() + ".png")
    if path.exists() and time.time() - path.stat().st_mtime < MAP_DAYS * 86400:
        return path.read_bytes()
    png = _fetch_static(address or "")
    if png:
        try:
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            path.write_bytes(png)
        except OSError as e:
            log.warning("map cache not written: %s", type(e).__name__)
    return png
