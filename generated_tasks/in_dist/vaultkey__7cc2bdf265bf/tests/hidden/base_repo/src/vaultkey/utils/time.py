"""Time utilities for VaultKey."""
from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from typing import Callable


_DURATION_RE = re.compile(
    r"(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?",
    re.IGNORECASE,
)


def monotonic_ns() -> int:
    """Return monotonic time in nanoseconds."""
    return time.monotonic_ns()


def monotonic_seconds() -> float:
    """Return monotonic time in seconds."""
    return time.monotonic()


def current_timestamp() -> float:
    """Return current wall-clock time as a UNIX timestamp."""
    return time.time()


def parse_duration(s: str) -> float:
    """Parse a duration string like '1d2h30m10s' into seconds."""
    s = s.strip()
    if not s:
        raise ValueError("empty duration string")

    if s.isdigit():
        return float(s)

    m = _DURATION_RE.fullmatch(s)
    if not m or not any(m.groups()):
        raise ValueError(f"invalid duration format: {s!r}")

    days = int(m.group(1) or 0)
    hours = int(m.group(2) or 0)
    minutes = int(m.group(3) or 0)
    seconds = int(m.group(4) or 0)

    total = days * 86400 + hours * 3600 + minutes * 60 + seconds
    if total == 0:
        raise ValueError(f"duration is zero: {s!r}")
    return float(total)


def format_duration(seconds: float) -> str:
    """Format a number of seconds into a human-readable duration string."""
    if seconds < 0:
        return f"-{format_duration(-seconds)}"
    if seconds == 0:
        return "0s"

    total = int(seconds)
    parts: list[str] = []

    days, total = divmod(total, 86400)
    if days:
        parts.append(f"{days}d")

    hours, total = divmod(total, 3600)
    if hours:
        parts.append(f"{hours}h")

    minutes, total = divmod(total, 60)
    if minutes:
        parts.append(f"{minutes}m")

    if total:
        parts.append(f"{total}s")

    return "".join(parts) if parts else "0s"


def is_expired(created_at: float, ttl_seconds: float, now: float | None = None) -> bool:
    """Check if something created at *created_at* with *ttl_seconds* has expired."""
    if ttl_seconds <= 0:
        return False
    now = now if now is not None else current_timestamp()
    return now >= created_at + ttl_seconds


def remaining_ttl(created_at: float, ttl_seconds: float, now: float | None = None) -> float:
    """Return remaining TTL in seconds, minimum 0."""
    if ttl_seconds <= 0:
        return float("inf")
    now = now if now is not None else current_timestamp()
    remaining = (created_at + ttl_seconds) - now
    return max(0.0, remaining)


@dataclass
class ExpiryTracker:
    """Track items with expiry times."""

    _clock: Callable[[], float] = field(default=current_timestamp)
    _items: dict[str, tuple[float, float]] = field(default_factory=dict)

    def add(self, item_id: str, ttl_seconds: float) -> None:
        """Register an item with a TTL."""
        self._items[item_id] = (self._clock(), ttl_seconds)

    def is_expired(self, item_id: str) -> bool:
        """Check if an item has expired."""
        if item_id not in self._items:
            return True
        created_at, ttl = self._items[item_id]
        return is_expired(created_at, ttl, now=self._clock())

    def remaining(self, item_id: str) -> float:
        """Return remaining TTL for an item."""
        if item_id not in self._items:
            return 0.0
        created_at, ttl = self._items[item_id]
        return remaining_ttl(created_at, ttl, now=self._clock())

    def remove(self, item_id: str) -> bool:
        """Remove an item from tracking."""
        return self._items.pop(item_id, None) is not None

    def expired_items(self) -> list[str]:
        """Return list of expired item IDs."""
        now = self._clock()
        return [
            item_id
            for item_id, (created_at, ttl) in self._items.items()
            if is_expired(created_at, ttl, now=now)
        ]

    def renew(self, item_id: str, ttl_seconds: float) -> bool:
        """Renew an item's TTL from now."""
        if item_id not in self._items:
            return False
        self._items[item_id] = (self._clock(), ttl_seconds)
        return True

    def count(self) -> int:
        return len(self._items)

    def clear(self) -> None:
        self._items.clear()


@dataclass
class TimeWindow:
    """A fixed-duration time window for grouping events."""
    start: float
    end: float
    label: str = ""

    @property
    def duration(self) -> float:
        return self.end - self.start

    def contains(self, timestamp: float) -> bool:
        return self.start <= timestamp < self.end


class TimeWindowing:
    """Generates time windows for analytics."""

    def __init__(self, clock: Callable[[], float] = current_timestamp) -> None:
        self._clock = clock

    def fixed_windows(self, start: float, end: float, window_size: float) -> list[TimeWindow]:
        """Generate fixed-size time windows between start and end."""
        windows: list[TimeWindow] = []
        current = start
        i = 0
        while current < end:
            w_end = min(current + window_size, end)
            windows.append(TimeWindow(start=current, end=w_end, label=f"window_{i}"))
            current = w_end
            i += 1
        return windows

    def sliding_window(self, duration: float, step: float, count: int) -> list[TimeWindow]:
        """Generate overlapping sliding windows ending at current time."""
        now = self._clock()
        windows: list[TimeWindow] = []
        for i in range(count):
            end = now - i * step
            start = end - duration
            windows.append(TimeWindow(start=start, end=end, label=f"slide_{i}"))
        return list(reversed(windows))

    def bucket_timestamps(self, timestamps: list[float], window_size: float) -> dict[int, list[float]]:
        """Group timestamps into buckets of window_size seconds."""
        buckets: dict[int, list[float]] = {}
        for ts in timestamps:
            bucket_key = int(ts // window_size)
            if bucket_key not in buckets:
                buckets[bucket_key] = []
            buckets[bucket_key].append(ts)
        return buckets


class RateCalculator:
    """Calculates rates of events over time."""

    def __init__(self, window_seconds: float = 60.0, clock: Callable[[], float] = current_timestamp) -> None:
        self._window = window_seconds
        self._clock = clock
        self._events: list[float] = []

    def record(self) -> None:
        """Record an event at the current time."""
        self._events.append(self._clock())
        self._cleanup()

    def rate(self) -> float:
        """Return the current rate (events per second)."""
        self._cleanup()
        if not self._events:
            return 0.0
        return len(self._events) / self._window

    def rate_per_minute(self) -> float:
        return self.rate() * 60.0

    def count_in_window(self) -> int:
        self._cleanup()
        return len(self._events)

    def _cleanup(self) -> None:
        cutoff = self._clock() - self._window
        self._events = [t for t in self._events if t > cutoff]

    def reset(self) -> None:
        self._events.clear()


@dataclass
class Deadline:
    """Tracks a deadline and remaining time."""
    name: str
    deadline_at: float
    created_at: float = field(default_factory=current_timestamp)

    @property
    def remaining(self) -> float:
        return max(0.0, self.deadline_at - current_timestamp())

    @property
    def is_exceeded(self) -> bool:
        return current_timestamp() >= self.deadline_at

    @property
    def elapsed(self) -> float:
        return current_timestamp() - self.created_at


class DeadlineTracker:
    """Tracks multiple deadlines."""

    def __init__(self, clock: Callable[[], float] = current_timestamp) -> None:
        self._deadlines: dict[str, Deadline] = {}
        self._clock = clock

    def set_deadline(self, name: str, timeout_seconds: float) -> Deadline:
        deadline = Deadline(
            name=name,
            deadline_at=self._clock() + timeout_seconds,
            created_at=self._clock(),
        )
        self._deadlines[name] = deadline
        return deadline

    def check(self, name: str) -> bool:
        """Return True if the deadline has NOT been exceeded."""
        d = self._deadlines.get(name)
        if d is None:
            return False
        return not d.is_exceeded

    def remaining(self, name: str) -> float:
        d = self._deadlines.get(name)
        if d is None:
            return 0.0
        return d.remaining

    def remove(self, name: str) -> bool:
        return self._deadlines.pop(name, None) is not None

    def exceeded_deadlines(self) -> list[Deadline]:
        return [d for d in self._deadlines.values() if d.is_exceeded]

    @property
    def count(self) -> int:
        return len(self._deadlines)


class TimeBudget:
    """Manages a time budget for operations."""

    def __init__(self, total_seconds: float, clock: Callable[[], float] = current_timestamp) -> None:
        self._total = total_seconds
        self._clock = clock
        self._start = clock()
        self._checkpoints: list[tuple[str, float]] = []

    @property
    def remaining(self) -> float:
        elapsed = self._clock() - self._start
        return max(0.0, self._total - elapsed)

    @property
    def elapsed(self) -> float:
        return self._clock() - self._start

    @property
    def is_exhausted(self) -> bool:
        return self.remaining <= 0.0

    @property
    def utilization(self) -> float:
        return min(self.elapsed / self._total, 1.0) if self._total > 0 else 0.0

    def checkpoint(self, label: str) -> float:
        """Record a checkpoint and return elapsed time since start."""
        elapsed = self.elapsed
        self._checkpoints.append((label, elapsed))
        return elapsed

    def get_checkpoints(self) -> list[tuple[str, float]]:
        return list(self._checkpoints)

    def allocate(self, fraction: float) -> float:
        """Allocate a fraction of the remaining budget."""
        return self.remaining * max(0.0, min(fraction, 1.0))


class BackoffCalculator:
    """Calculates exponential backoff with jitter."""

    def __init__(
        self,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        multiplier: float = 2.0,
        jitter: float = 0.1,
    ) -> None:
        self._base_delay = base_delay
        self._max_delay = max_delay
        self._multiplier = multiplier
        self._jitter = jitter

    def delay(self, attempt: int) -> float:
        """Calculate the delay for a given attempt number (0-indexed)."""
        delay = self._base_delay * (self._multiplier ** attempt)
        delay = min(delay, self._max_delay)
        if self._jitter > 0:
            import random
            jitter_amount = delay * self._jitter
            delay += random.uniform(-jitter_amount, jitter_amount)
        return max(0.0, delay)

    def delays(self, max_attempts: int) -> list[float]:
        """Return a list of delays for all attempts up to max_attempts."""
        return [self.delay(i) for i in range(max_attempts)]

    def total_time(self, attempts: int) -> float:
        """Return the total time for all attempts."""
        return sum(self.delays(attempts))

    @property
    def base_delay(self) -> float:
        return self._base_delay

    @property
    def max_delay(self) -> float:
        return self._max_delay
