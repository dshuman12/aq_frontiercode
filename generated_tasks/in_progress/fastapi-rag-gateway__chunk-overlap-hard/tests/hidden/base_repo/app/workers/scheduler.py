"""Periodic task schedule for the worker.

When Celery beat is available, the schedule defined here is consumed via
``celery_app.conf.beat_schedule``. The module degrades gracefully when
Celery is missing — the schedule is then used by the Typer CLI to run
maintenance tasks manually.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import timedelta


@dataclass(slots=True, frozen=True)
class ScheduleEntry:
    """A single scheduled task."""

    name: str
    task: str
    every: timedelta
    args: tuple = ()
    kwargs: dict | None = None
    enabled: bool = True


def default_schedule() -> list[ScheduleEntry]:
    """Return the default beat schedule."""

    return [
        ScheduleEntry(
            name="cleanup-expired-keys",
            task="cleanup.expired_keys",
            every=timedelta(hours=6),
        ),
        ScheduleEntry(
            name="analytics-daily-rollup",
            task="analytics.daily_rollup",
            every=timedelta(days=1),
        ),
        ScheduleEntry(
            name="cache-warm",
            task="cache.warm",
            every=timedelta(minutes=15),
            kwargs={"keys": []},
        ),
    ]


def to_celery_schedule(entries: Iterable[ScheduleEntry]) -> dict:
    """Convert the schedule into Celery's expected format."""

    schedule: dict = {}
    for entry in entries:
        if not entry.enabled:
            continue
        schedule[entry.name] = {
            "task": entry.task,
            "schedule": entry.every.total_seconds(),
            "args": list(entry.args),
            "kwargs": entry.kwargs or {},
        }
    return schedule


__all__ = ["ScheduleEntry", "default_schedule", "to_celery_schedule"]
