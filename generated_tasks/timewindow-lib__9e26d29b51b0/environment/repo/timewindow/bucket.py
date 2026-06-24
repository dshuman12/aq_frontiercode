from __future__ import annotations

from datetime import datetime, timedelta, timezone


def _utc_epoch_seconds(dt: datetime) -> int:
    epoch = datetime(1970, 1, 1, tzinfo=timezone.utc)
    return int((dt.astimezone(timezone.utc) - epoch).total_seconds())


def floor_to_bucket(dt: datetime, bucket_seconds: int) -> datetime:
    """Return the start of the UTC bucket that contains ``dt``."""
    if dt.tzinfo is None:
        raise ValueError("datetime must be timezone-aware")
    if bucket_seconds <= 0:
        raise ValueError("bucket_seconds must be a positive integer")

    utc = dt.astimezone(timezone.utc)
    epoch = datetime(1970, 1, 1, tzinfo=timezone.utc)
    seconds = _utc_epoch_seconds(utc)
    floored = seconds - (seconds % bucket_seconds)
    return epoch + timedelta(seconds=floored)


def ceil_to_bucket(dt: datetime, bucket_seconds: int) -> datetime:
    """Return the first UTC bucket boundary at or after ``dt``."""
    base = floor_to_bucket(dt, bucket_seconds)
    utc = dt.astimezone(timezone.utc)
    if utc > base:
        return base + timedelta(seconds=bucket_seconds)
    return base
