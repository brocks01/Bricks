"""Walk processing and polylines: pure functions, no database."""

from datetime import UTC, datetime, timedelta

from bricks_api.geo import decode_polyline, encode_polyline
from bricks_api.schemas import TrackPoint
from bricks_api.seed import _bishan_loop
from bricks_api.walks import HistoryWalk, process_walk

START = datetime(2026, 11, 10, 23, 5, tzinfo=UTC)  # 7:05 am in Singapore


def test_polyline_matches_googles_reference_example() -> None:
    points = [(38.5, -120.2), (40.7, -120.95), (43.252, -126.453)]
    assert encode_polyline(points) == "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
    assert decode_polyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@") == points


def test_the_demo_loop_is_about_2_4_km_in_32_minutes() -> None:
    points = _bishan_loop(START, 1.0)
    walk = process_walk(
        [points],
        started_at=START,
        ended_at=START + timedelta(minutes=32),
        home=None,
        area_name="Bishan",
        history=[],
    )
    assert 2300 < walk.distance_m < 2500
    assert walk.moving_s == 1920
    assert walk.time_of_day == "morning"
    assert walk.start_place_name == "Bishan Park"
    assert [s.km for s in walk.splits] == [1, 2, 3]
    assert walk.splits[0].distance_m == 1000
    assert 760 < walk.splits[0].pace_s < 840  # ~13 min 20 s per km
    assert walk.praise.kind == "first_walk"


def test_gps_jumps_and_bad_readings_are_dropped() -> None:
    t0 = START.timestamp() * 1000
    points = [
        TrackPoint(lat=1.3626, lng=103.8466, t=t0, accuracy=5),
        TrackPoint(lat=1.3700, lng=103.8466, t=t0 + 5000, accuracy=5),  # 800 m in 5 s
        TrackPoint(lat=1.36265, lng=103.8466, t=t0 + 10000, accuracy=80),  # inaccurate
        TrackPoint(lat=1.3627, lng=103.8466, t=t0 + 15000, accuracy=5),
    ]
    walk = process_walk(
        [points], started_at=START, ended_at=START, home=None, area_name="Bishan", history=[]
    )
    assert 10 < walk.distance_m < 12


def test_points_near_home_never_reach_the_public_route() -> None:
    points = _bishan_loop(START, 1.0)
    home = (points[0].lat, points[0].lng)
    walk = process_walk(
        [points], started_at=START, ended_at=START, home=home, area_name="Bishan", history=[]
    )
    public = decode_polyline(walk.route_public_polyline)
    full = decode_polyline(walk.route_polyline)
    assert len(public) < len(full)
    assert (round(home[0], 5), round(home[1], 5)) not in public


def test_praise_compares_with_earlier_walks() -> None:
    points = _bishan_loop(START, 1.0)

    def praise(history: list[HistoryWalk]) -> str:
        return process_walk(
            [points],
            started_at=START,
            ended_at=START,
            home=None,
            area_name="Bishan",
            history=history,
        ).praise.kind

    earlier_this_month = START - timedelta(days=2)
    assert praise([HistoryWalk(1000, earlier_this_month)]) == "longest_month"
    last_month = START - timedelta(days=40)
    assert praise([HistoryWalk(2000, last_month)]) == "more_than_last"
    assert praise([HistoryWalk(2400, last_month)]) == "steady"
