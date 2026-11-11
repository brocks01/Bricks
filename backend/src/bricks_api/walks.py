"""What happens on POST /walks (docs/03 §6 "Walk processing").

Same rules as the app's mock (app/src/mocks/walkProcessing.ts), so screens look
the same on both: 1. clean points, then distance and moving time; 2. splits per
km and average pace; 3. home privacy zone; 4. title from time of day + nearest
place; 5. walked-with; 6. a friendly, template-based encouragement (no LLM).
"""

import itertools
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal

from .geo import MAX_ACCURACY_M, MAX_SPEED_MPS, dist, encode_polyline, haversine
from .schemas import Split, TrackPoint, WalkPraise
from .timeutil import local

# Points this close to home are cut from anything others can see (WK-6).
PRIVACY_RADIUS_M = 200
# Slower than this between two points counts as standing still.
MOVING_SPEED_MPS = 0.3
# Gaps longer than this (lost signal) don't count as moving time.
MAX_GAP_S = 30

PLACES = [
    ("Bishan Park", 1.3626, 103.8466),
    ("Bishan-Ang Mo Kio Park", 1.3644, 103.8433),
    ("Toa Payoh Town Park", 1.3336, 103.8476),
    ("Bishan Community Club", 1.3505, 103.8486),
    ("Toa Payoh Central", 1.3326, 103.8486),
]


def clean_track(points: list[TrackPoint]) -> list[TrackPoint]:
    """Drops inaccurate readings and impossible jumps (compared with the last kept point)."""
    kept: list[TrackPoint] = []
    for p in points:
        if p.accuracy is not None and p.accuracy > MAX_ACCURACY_M:
            continue
        if kept:
            last = kept[-1]
            seconds = (p.t - last.t) / 1000
            if seconds <= 0 or dist(last, p) / seconds > MAX_SPEED_MPS:
                continue
        kept.append(p)
    return kept


def nearest_place(p: TrackPoint, fallback: str) -> str:
    best_name, best_d = fallback, 1500.0
    for name, lat, lng in PLACES:
        d = haversine(p.lat, p.lng, lat, lng)
        if d < best_d:
            best_name, best_d = name, d
    return best_name


def time_of_day(dt: datetime) -> Literal["morning", "afternoon", "evening"]:
    h = local(dt).hour
    return "morning" if h < 12 else "afternoon" if h < 17 else "evening"


@dataclass
class HistoryWalk:
    distance_m: int
    started_at: datetime


@dataclass
class ProcessedWalk:
    time_of_day: Literal["morning", "afternoon", "evening"]
    start_place_name: str
    distance_m: int
    duration_s: int
    moving_s: int
    avg_pace_s_per_km: int
    splits: list[Split]
    route_polyline: str
    route_public_polyline: str
    praise: WalkPraise


def process_walk(
    segments: list[list[TrackPoint]],
    *,
    started_at: datetime,
    ended_at: datetime,
    home: tuple[float, float] | None,
    area_name: str,
    history: list[HistoryWalk],
) -> ProcessedWalk:
    """`history` is the member's earlier walks, newest first."""
    clean = [s for s in (clean_track(seg) for seg in segments) if s]

    distance = moving = 0.0
    splits: list[Split] = []
    km_distance = km_time = 0.0
    for seg in clean:
        for a, b in itertools.pairwise(seg):
            d = dist(a, b)
            dt = (b.t - a.t) / 1000
            distance += d
            if not (0 < dt <= MAX_GAP_S and d / dt >= MOVING_SPEED_MPS):
                continue
            moving += dt
            # Share this step between the km it finishes and the next.
            rem_d, rem_t = d, dt
            while km_distance + rem_d >= 1000:
                need = 1000 - km_distance
                share = need / rem_d
                km_time += rem_t * share
                splits.append(Split(km=len(splits) + 1, distance_m=1000, pace_s=round(km_time)))
                rem_d -= need
                rem_t -= rem_t * share
                km_distance = km_time = 0.0
            km_distance += rem_d
            km_time += rem_t
    # The last part-km, if it's long enough to mean something.
    if km_distance >= 100:
        splits.append(
            Split(
                km=len(splits) + 1,
                distance_m=round(km_distance),
                pace_s=round(km_time / km_distance * 1000),
            )
        )

    all_points = [p for seg in clean for p in seg]
    if home:
        public = [p for p in all_points if haversine(p.lat, p.lng, *home) > PRIVACY_RADIUS_M]
    elif all_points:
        # Home unknown: walks usually start and end there, so hide both ends.
        first, last = all_points[0], all_points[-1]
        public = [
            p
            for p in all_points
            if dist(p, first) > PRIVACY_RADIUS_M and dist(p, last) > PRIVACY_RADIUS_M
        ]
    else:
        public = []

    return ProcessedWalk(
        time_of_day=time_of_day(started_at),
        start_place_name=nearest_place(all_points[0], area_name) if all_points else area_name,
        distance_m=round(distance),
        duration_s=round((ended_at - started_at).total_seconds()),
        moving_s=round(moving),
        avg_pace_s_per_km=round(moving / (distance / 1000)) if distance > 0 else 0,
        splits=splits,
        route_polyline=encode_polyline([(p.lat, p.lng) for p in all_points]),
        route_public_polyline=encode_polyline([(p.lat, p.lng) for p in public]),
        praise=_praise(distance, started_at, history),
    )


def _praise(distance: float, started_at: datetime, history: list[HistoryWalk]) -> WalkPraise:
    if not history:
        return WalkPraise(kind="first_walk")
    start_local = local(started_at)
    month_start = start_local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    this_month = [w for w in history if w.started_at >= month_start]
    if this_month and all(distance > w.distance_m for w in this_month):
        return WalkPraise(kind="longest_month")
    extra = distance - history[0].distance_m
    if extra >= 100:
        return WalkPraise(kind="more_than_last", extra_m=round(extra))
    return WalkPraise(kind="steady")


def praise_json(p: WalkPraise) -> dict[str, Any]:
    return p.model_dump(exclude_none=True)
