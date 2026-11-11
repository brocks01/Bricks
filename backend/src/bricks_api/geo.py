"""Distances, GPS clean-up and encoded polylines (same rules as app/src/lib/geo.ts)."""

import math
from typing import Protocol

EARTH_RADIUS_M = 6_371_000
# Readings worse than this are ignored (docs/04 §2.3).
MAX_ACCURACY_M = 30
# Faster than this between two readings is a GPS jump, not walking.
MAX_SPEED_MPS = 10


class LatLng(Protocol):
    @property
    def lat(self) -> float: ...
    @property
    def lng(self) -> float: ...


def haversine(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    """Great-circle distance in metres."""
    d_lat = math.radians(b_lat - a_lat)
    d_lng = math.radians(b_lng - a_lng)
    h = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(a_lat)) * math.cos(math.radians(b_lat)) * math.sin(d_lng / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(min(1.0, math.sqrt(h)))


def dist(a: LatLng, b: LatLng) -> float:
    return haversine(a.lat, a.lng, b.lat, b.lng)


def _round_half_away(x: float) -> int:
    return math.floor(abs(x) + 0.5) * (1 if x >= 0 else -1)


def encode_polyline(points: list[tuple[float, float]], precision: int = 5) -> str:
    """Google's encoded polyline format, which the app decodes with @mapbox/polyline."""
    factor = 10**precision
    out: list[str] = []
    prev_lat = prev_lng = 0
    for lat, lng in points:
        ilat, ilng = _round_half_away(lat * factor), _round_half_away(lng * factor)
        for delta in (ilat - prev_lat, ilng - prev_lng):
            value = ~(delta << 1) if delta < 0 else delta << 1
            while value >= 0x20:
                out.append(chr((0x20 | (value & 0x1F)) + 63))
                value >>= 5
            out.append(chr(value + 63))
        prev_lat, prev_lng = ilat, ilng
    return "".join(out)


def decode_polyline(encoded: str, precision: int = 5) -> list[tuple[float, float]]:
    factor = 10**precision
    coords: list[tuple[float, float]] = []
    index = lat = lng = 0
    while index < len(encoded):
        deltas: list[int] = []
        for _ in range(2):
            shift = result = 0
            while True:
                b = ord(encoded[index]) - 63
                index += 1
                result |= (b & 0x1F) << shift
                shift += 5
                if b < 0x20:
                    break
            deltas.append(~(result >> 1) if result & 1 else result >> 1)
        lat += deltas[0]
        lng += deltas[1]
        coords.append((lat / factor, lng / factor))
    return coords
