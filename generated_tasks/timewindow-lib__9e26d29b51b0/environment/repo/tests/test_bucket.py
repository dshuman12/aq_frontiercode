from datetime import datetime, timezone

from timewindow.bucket import floor_to_bucket


def test_floors_to_hour_boundary():
    dt = datetime(2026, 1, 10, 14, 37, 12, tzinfo=timezone.utc)
    got = floor_to_bucket(dt, 3600)
    assert got == datetime(2026, 1, 10, 14, 0, 0, tzinfo=timezone.utc)

from datetime import timedelta, timezone as tz


def test_converts_offset_aware_to_utc_before_flooring():
    eastern = tz(timedelta(hours=-5))
    dt = datetime(2026, 6, 1, 19, 30, 0, tzinfo=eastern)
    got = floor_to_bucket(dt, 3600)
    assert got == datetime(2026, 6, 2, 0, 0, 0, tzinfo=timezone.utc)

import pytest


def test_naive_datetime_raises():
    with pytest.raises(ValueError, match="timezone-aware"):
        floor_to_bucket(datetime(2026, 1, 1, 0, 0, 0), 60)


def test_zero_bucket_raises():
    with pytest.raises(ValueError, match="positive"):
        floor_to_bucket(datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc), 0)

from timewindow.bucket import ceil_to_bucket


def test_ceil_on_boundary_matches_floor():
    dt = datetime(2026, 3, 1, 12, 0, 0, tzinfo=timezone.utc)
    assert ceil_to_bucket(dt, 3600) == floor_to_bucket(dt, 3600)


def test_ceil_inside_bucket_moves_to_next_start():
    dt = datetime(2026, 3, 1, 12, 15, 0, tzinfo=timezone.utc)
    assert ceil_to_bucket(dt, 3600) == datetime(2026, 3, 1, 13, 0, 0, tzinfo=timezone.utc)



def test_fifteen_minute_rollups_align():
    dt = datetime(2026, 4, 10, 9, 7, 31, tzinfo=timezone.utc)
    assert floor_to_bucket(dt, 900) == datetime(2026, 4, 10, 9, 0, 0, tzinfo=timezone.utc)
