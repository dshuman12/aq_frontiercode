"""Cron-style scheduler for FlowQ."""

from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Callable, Dict, List, Optional, Set

from flowq.exceptions import SchedulerError

_FIELD_RANGES = {
    "minute":  (0, 59),
    "hour":    (0, 23),
    "day":     (1, 31),
    "month":   (1, 12),
    "weekday": (0, 6),
}


class CronField:
    """Parses a single cron field into a set of matching integers."""

    def __init__(self, expr: str, field_name: str):
        lo, hi = _FIELD_RANGES[field_name]
        self.values: Set[int] = self._parse(expr, lo, hi, field_name)

    def matches(self, value: int) -> bool:
        return value in self.values

    def _parse(self, expr: str, lo: int, hi: int, name: str) -> Set[int]:
        if expr == "*":
            return set(range(lo, hi + 1))
        values: Set[int] = set()
        for part in expr.split(","):
            part = part.strip()
            if "/" in part:
                values |= self._parse_step(part, lo, hi, name)
            elif "-" in part:
                values |= self._parse_range(part, lo, hi, name)
            else:
                values.add(self._int(part, lo, hi, name))
        return values


    def _parse_step(self, expr: str, lo: int, hi: int, name: str) -> Set[int]:
        base, step_str = expr.split("/", 1)
        step = self._int(step_str, 1, hi - lo + 1, name)
        if base == "*":
            start, end = lo, hi
        elif "-" in base:
            s, e = base.split("-", 1)
            start, end = self._int(s, lo, hi, name), self._int(e, lo, hi, name)
        else:
            start, end = self._int(base, lo, hi, name), hi
        return set(range(start, end + 1, step))

    def _parse_range(self, expr: str, lo: int, hi: int, name: str) -> Set[int]:
        s, e = expr.split("-", 1)
        start, end = self._int(s, lo, hi, name), self._int(e, lo, hi, name)
        if start > end:
            raise SchedulerError(f"Invalid range '{expr}' in field '{name}': start > end")
        return set(range(start, end + 1))

    @staticmethod
    def _int(s: str, lo: int, hi: int, name: str) -> int:
        try:
            v = int(s)
        except ValueError:
            raise SchedulerError(f"Invalid value '{s}' in cron field '{name}'")
        if not (lo <= v <= hi):
            raise SchedulerError(f"Value {v} out of range [{lo},{hi}] for '{name}'")
        return v



class CronExpression:
    """Five-field cron expression: minute hour day month weekday."""

    def __init__(self, expr: str):
        self.expr = expr
        fields = expr.split()
        if len(fields) != 5:
            raise SchedulerError(f"Need 5 fields, got {len(fields)}: '{expr}'")
        self.minute  = CronField(fields[0], "minute")
        self.hour    = CronField(fields[1], "hour")
        self.day     = CronField(fields[2], "day")
        self.month   = CronField(fields[3], "month")
        self.weekday = CronField(fields[4], "weekday")

    def matches(self, dt: datetime) -> bool:
        return (self.minute.matches(dt.minute) and self.hour.matches(dt.hour)
                and self.day.matches(dt.day) and self.month.matches(dt.month)
                and self.weekday.matches(dt.weekday()))

    def next_run(self, after: Optional[datetime] = None) -> datetime:
        dt = (after or datetime.utcnow()).replace(second=0, microsecond=0)
        dt += timedelta(minutes=1)
        limit = dt + timedelta(days=366)
        while dt < limit:
            if self.matches(dt):
                return dt
            dt += timedelta(minutes=1)
        raise SchedulerError(f"No upcoming match for '{self.expr}'")



@dataclass
class ScheduledJob:
    """A recurring job entry managed by the Scheduler."""

    name: str
    cron: str
    job_factory: Callable[[], dict]
    id: str        = field(default_factory=lambda: str(uuid.uuid4()))
    enabled: bool  = True
    last_run: Optional[datetime] = None
    _expr: Optional[CronExpression] = field(default=None, init=False, repr=False)

    def __post_init__(self):
        self._expr = CronExpression(self.cron)

    def is_due(self, now: Optional[datetime] = None) -> bool:
        now = now or datetime.utcnow()
        return self.enabled and self._expr.matches(now)



class Scheduler:
    """Ticks every minute and fires ScheduledJobs whose cron matches."""

    def __init__(self, queue=None):
        self._queue = queue
        self._jobs: Dict[str, ScheduledJob] = {}
        self._lock = threading.Lock()
        self._running = False

    def add(self, sj: ScheduledJob) -> None:
        with self._lock:
            self._jobs[sj.id] = sj

    def remove(self, job_id: str) -> None:
        with self._lock:
            self._jobs.pop(job_id, None)

    def tick(self, now: Optional[datetime] = None) -> List[str]:
        now = now or datetime.utcnow()
        fired: List[str] = []
        with self._lock:
            for sj in self._jobs.values():
                if sj.is_due(now):
                    sj.last_run = now
                    fired.append(sj.id)
                    if self._queue is not None:
                        from flowq.models import Job
                        self._queue.enqueue(Job(name=sj.name, payload=sj.job_factory()))
        return fired

    def start(self, tick_interval: float = 60.0) -> None:
        self._running = True
        def _loop():
            while self._running:
                self.tick()
                time.sleep(tick_interval)
        threading.Thread(target=_loop, daemon=True, name="scheduler").start()

    def stop(self) -> None:
        self._running = False

    def list_jobs(self) -> List[ScheduledJob]:
        with self._lock:
            return list(self._jobs.values())


__all__ = ["CronExpression", "ScheduledJob", "Scheduler"]
