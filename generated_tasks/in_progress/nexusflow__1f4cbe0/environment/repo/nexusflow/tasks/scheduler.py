"""
nexusflow.tasks.scheduler
~~~~~~~~~~~~~~~~~~~~~~~~~~

Cron-like task scheduler with support for recurring tasks, one-time
scheduled tasks, and timezone-aware scheduling.
"""

from __future__ import annotations

import heapq
import re
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Tuple


class TaskStatus(Enum):
    """Status of a scheduled task."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class CronField:
    """Parses and matches a single cron field (minute, hour, etc.)."""

    def __init__(self, expression: str, min_val: int, max_val: int) -> None:
        self._expression = expression
        self._min_val = min_val
        self._max_val = max_val
        self._values: Set[int] = self._parse(expression)

    def _parse(self, expr: str) -> Set[int]:
        """Parse a cron field expression into a set of values."""
        if expr == "*":
            return set(range(self._min_val, self._max_val + 1))

        values: Set[int] = set()
        for part in expr.split(","):
            part = part.strip()
            # Handle step values: */5 or 1-10/2
            if "/" in part:
                range_part, step = part.split("/")
                step = int(step)
                if range_part == "*":
                    start, end = self._min_val, self._max_val
                elif "-" in range_part:
                    start, end = map(int, range_part.split("-"))
                else:
                    start = int(range_part)
                    end = self._max_val
                values.update(range(start, end + 1, step))
            elif "-" in part:
                start, end = map(int, part.split("-"))
                values.update(range(start, end + 1))
            else:
                values.add(int(part))

        return {v for v in values if self._min_val <= v <= self._max_val}

    def matches(self, value: int) -> bool:
        """Check if a value matches this cron field."""
        return value in self._values

    def next_match(self, current: int) -> Optional[int]:
        """Find the next matching value >= current."""
        for v in sorted(self._values):
            if v >= current:
                return v
        return None


class CronExpression:
    """Parses and evaluates a cron expression (minute hour day month weekday)."""

    def __init__(self, expression: str) -> None:
        self._raw = expression
        parts = expression.strip().split()
        if len(parts) != 5:
            raise ValueError(f"Invalid cron expression: {expression}")

        self.minute = CronField(parts[0], 0, 59)
        self.hour = CronField(parts[1], 0, 23)
        self.day = CronField(parts[2], 1, 31)
        self.month = CronField(parts[3], 1, 12)
        self.weekday = CronField(parts[4], 0, 6)

    def matches(
        self,
        minute: int,
        hour: int,
        day: int,
        month: int,
        weekday: int,
    ) -> bool:
        """Check if a datetime matches this cron expression."""
        return (
            self.minute.matches(minute)
            and self.hour.matches(hour)
            and self.day.matches(day)
            and self.month.matches(month)
            and self.weekday.matches(weekday)
        )

    def __repr__(self) -> str:
        return f"CronExpression({self._raw!r})"


@dataclass
class ScheduledTask:
    """A task registered with the scheduler."""
    task_id: str
    name: str
    func: Callable
    cron: Optional[CronExpression] = None
    interval_seconds: Optional[float] = None
    run_at: Optional[float] = None
    status: TaskStatus = TaskStatus.PENDING
    last_run: Optional[float] = None
    next_run: Optional[float] = None
    run_count: int = 0
    max_runs: Optional[int] = None
    error_count: int = 0
    last_error: Optional[str] = None
    tags: Set[str] = field(default_factory=set)
    timezone_offset: float = 0.0  # hours offset from UTC

    def __lt__(self, other: "ScheduledTask") -> bool:
        """For heap ordering by next_run time."""
        if self.next_run is None:
            return False
        if other.next_run is None:
            return True
        return self.next_run < other.next_run


class TaskScheduler:
    """
    Cron-like task scheduler.
    """

    def __init__(self) -> None:
        self._tasks: Dict[str, ScheduledTask] = {}
        self._run_queue: List[ScheduledTask] = []
        self._running: bool = False
        self._tick_interval: float = 1.0
        self._hooks: Dict[str, List[Callable]] = {
            "pre_run": [],
            "post_run": [],
            "on_error": [],
        }
        self._last_tick: Optional[float] = None

    def schedule_cron(
        self,
        name: str,
        func: Callable,
        cron_expr: str,
        timezone_offset: float = 0.0,
        max_runs: Optional[int] = None,
        tags: Optional[Set[str]] = None,
    ) -> str:
        """Schedule a task with a cron expression."""
        task = ScheduledTask(
            task_id=str(uuid.uuid4()),
            name=name,
            func=func,
            cron=CronExpression(cron_expr),
            max_runs=max_runs,
            tags=tags or set(),
            timezone_offset=timezone_offset,
        )
        task.next_run = self._compute_next_cron_run(task)
        self._tasks[task.task_id] = task
        heapq.heappush(self._run_queue, task)
        return task.task_id

    def schedule_interval(
        self,
        name: str,
        func: Callable,
        interval_seconds: float,
        start_immediately: bool = False,
        max_runs: Optional[int] = None,
        tags: Optional[Set[str]] = None,
    ) -> str:
        """Schedule a task to run at a fixed interval."""
        task = ScheduledTask(
            task_id=str(uuid.uuid4()),
            name=name,
            func=func,
            interval_seconds=interval_seconds,
            max_runs=max_runs,
            tags=tags or set(),
        )
        if start_immediately:
            task.next_run = time.time()
        else:
            task.next_run = time.time() + interval_seconds
        self._tasks[task.task_id] = task
        heapq.heappush(self._run_queue, task)
        return task.task_id

    def schedule_once(
        self,
        name: str,
        func: Callable,
        run_at: float,
        tags: Optional[Set[str]] = None,
    ) -> str:
        """Schedule a one-time task."""
        task = ScheduledTask(
            task_id=str(uuid.uuid4()),
            name=name,
            func=func,
            run_at=run_at,
            next_run=run_at,
            max_runs=1,
            tags=tags or set(),
        )
        self._tasks[task.task_id] = task
        heapq.heappush(self._run_queue, task)
        return task.task_id

    def cancel(self, task_id: str) -> bool:
        """Cancel a scheduled task."""
        task = self._tasks.get(task_id)
        if task and task.status == TaskStatus.PENDING:
            task.status = TaskStatus.CANCELLED
            return True
        return False

    def _compute_next_cron_run(self, task: ScheduledTask) -> float:
        """
        Compute the next run time for a cron task.
        """
        import datetime

        now = time.time()
        local_now = now + (task.timezone_offset * 3600)
        dt = datetime.datetime.utcfromtimestamp(local_now)

        # Try every minute for next 48 hours
        for minutes_ahead in range(1, 48 * 60):
            candidate = dt + datetime.timedelta(minutes=minutes_ahead)
            if task.cron and task.cron.matches(
                candidate.minute,
                candidate.hour,
                candidate.day,
                candidate.month,
                candidate.weekday(),
            ):
                # Convert back to UTC timestamp
                utc_ts = candidate.timestamp() - (task.timezone_offset * 3600)
                return utc_ts

        return now + 86400  # fallback: 24 hours later

    def tick(self) -> List[str]:
        """
        Process one tick of the scheduler. Returns list of task IDs that ran.
        """
        now = time.time()
        executed: List[str] = []

        while self._run_queue and self._run_queue[0].next_run is not None:
            if self._run_queue[0].next_run > now:
                break

            task = heapq.heappop(self._run_queue)
            if task.status == TaskStatus.CANCELLED:
                continue
            if task.max_runs is not None and task.run_count >= task.max_runs:
                task.status = TaskStatus.COMPLETED
                continue

            # Execute
            self._run_task(task)
            executed.append(task.task_id)

            # Reschedule
            if task.status != TaskStatus.CANCELLED:
                if task.interval_seconds:
                    task.next_run = now + task.interval_seconds
                    heapq.heappush(self._run_queue, task)
                elif task.cron:
                    task.next_run = self._compute_next_cron_run(task)
                    heapq.heappush(self._run_queue, task)

        self._last_tick = now
        return executed

    def _run_task(self, task: ScheduledTask) -> None:
        """Execute a single task."""
        for hook in self._hooks["pre_run"]:
            hook(task)

        task.status = TaskStatus.RUNNING
        try:
            task.func()
            task.run_count += 1
            task.last_run = time.time()
            task.status = TaskStatus.PENDING
        except Exception as e:
            task.error_count += 1
            task.last_error = str(e)
            task.status = TaskStatus.FAILED
            for hook in self._hooks["on_error"]:
                hook(task, e)

        for hook in self._hooks["post_run"]:
            hook(task)

    def add_hook(self, event: str, callback: Callable) -> None:
        if event in self._hooks:
            self._hooks[event].append(callback)

    def get_task(self, task_id: str) -> Optional[ScheduledTask]:
        return self._tasks.get(task_id)

    def get_all_tasks(self) -> List[ScheduledTask]:
        return list(self._tasks.values())

    def get_stats(self) -> Dict[str, Any]:
        statuses = {}
        for task in self._tasks.values():
            s = task.status.value
            statuses[s] = statuses.get(s, 0) + 1
        return {
            "total_tasks": len(self._tasks),
            "queue_size": len(self._run_queue),
            "statuses": statuses,
        }
