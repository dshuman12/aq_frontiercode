"""Tests that verify timezone-aware scheduling fires at the correct UTC time.

The old implementation used datetime.utcfromtimestamp (naive) and then called
.timestamp() on the candidate (also naive, inheriting the system's local
timezone), producing a double-offset error.  These tests confirm that
_compute_next_cron_run returns the right UTC epoch for tasks scheduled with a
non-zero timezone_offset, regardless of what timezone the test host runs in.
"""
import datetime
import time
from unittest.mock import patch

import pytest

from nexusflow.tasks.scheduler import TaskScheduler, ScheduledTask, CronExpression


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_task(cron_expr: str, tz_offset_hours: float) -> ScheduledTask:
    """Build a minimal ScheduledTask with the given cron and UTC offset."""
    return ScheduledTask(
        task_id="test",
        name="test",
        func=lambda: None,
        cron=CronExpression(cron_expr),
        timezone_offset=tz_offset_hours,
    )


def _utc_epoch_for_local_hhmm(
    year: int, month: int, day: int,
    hour: int, minute: int,
    tz_offset_hours: float,
) -> float:
    """Return the UTC epoch corresponding to a wall-clock time in a fixed-offset zone."""
    tz = datetime.timezone(datetime.timedelta(hours=tz_offset_hours))
    dt_local = datetime.datetime(year, month, day, hour, minute, 0, tzinfo=tz)
    return dt_local.timestamp()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestSchedulerTimezoneAware:
    """Verify that _compute_next_cron_run produces correct UTC timestamps."""

    def test_utc_plus_5_cron_fires_at_correct_utc(self):
        """A task scheduled at 10:00 UTC+5 should fire at 05:00 UTC."""
        scheduler = TaskScheduler()
        task = _make_task("0 10 * * *", tz_offset_hours=5.0)

        # Freeze 'now' to 2024-03-01 04:30:00 UTC (= 09:30 UTC+5, before 10:00)
        frozen_utc = datetime.datetime(2024, 3, 1, 4, 30, 0,
                                       tzinfo=datetime.timezone.utc)
        frozen_epoch = frozen_utc.timestamp()

        with patch("nexusflow.tasks.scheduler.time.time", return_value=frozen_epoch):
            next_run = scheduler._compute_next_cron_run(task)

        # Expected: 2024-03-01 10:00 UTC+5 = 2024-03-01 05:00 UTC
        expected = _utc_epoch_for_local_hhmm(2024, 3, 1, 10, 0, 5.0)
        assert abs(next_run - expected) < 60, (
            f"Expected next_run ≈ {expected} (05:00 UTC), got {next_run}"
        )

    def test_utc_minus_5_cron_fires_at_correct_utc(self):
        """A task at 09:00 UTC-5 should fire at 14:00 UTC."""
        scheduler = TaskScheduler()
        task = _make_task("0 9 * * *", tz_offset_hours=-5.0)

        # Freeze 'now' to 2024-03-01 13:30:00 UTC (= 08:30 UTC-5, before 09:00)
        frozen_epoch = datetime.datetime(2024, 3, 1, 13, 30, 0,
                                         tzinfo=datetime.timezone.utc).timestamp()

        with patch("nexusflow.tasks.scheduler.time.time", return_value=frozen_epoch):
            next_run = scheduler._compute_next_cron_run(task)

        expected = _utc_epoch_for_local_hhmm(2024, 3, 1, 9, 0, -5.0)
        assert abs(next_run - expected) < 60, (
            f"Expected next_run ≈ {expected} (14:00 UTC), got {next_run}"
        )

    def test_utc_offset_zero_unchanged(self):
        """A task with zero offset should schedule identically in UTC."""
        scheduler = TaskScheduler()
        task = _make_task("30 6 * * *", tz_offset_hours=0.0)

        frozen_epoch = datetime.datetime(2024, 3, 1, 6, 0, 0,
                                         tzinfo=datetime.timezone.utc).timestamp()

        with patch("nexusflow.tasks.scheduler.time.time", return_value=frozen_epoch):
            next_run = scheduler._compute_next_cron_run(task)

        expected = _utc_epoch_for_local_hhmm(2024, 3, 1, 6, 30, 0.0)
        assert abs(next_run - expected) < 60

    def test_next_run_is_in_the_future(self):
        """next_run must always be strictly after 'now'."""
        scheduler = TaskScheduler()
        task = _make_task("* * * * *", tz_offset_hours=2.0)

        frozen_epoch = datetime.datetime(2024, 6, 15, 12, 0, 0,
                                         tzinfo=datetime.timezone.utc).timestamp()

        with patch("nexusflow.tasks.scheduler.time.time", return_value=frozen_epoch):
            next_run = scheduler._compute_next_cron_run(task)

        assert next_run > frozen_epoch, "next_run must be in the future"
