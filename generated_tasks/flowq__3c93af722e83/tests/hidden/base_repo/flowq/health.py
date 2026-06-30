"""
Health-check subsystem for FlowQ.

Register named checks; query them individually or all at once.
Integrates with the HTTP dashboard at /health and /health/<name>.

Example::

    from flowq.health import health_registry, HealthStatus

    @health_registry.check("database")
    def db_check():
        # raise on unhealthy, return anything on healthy
        storage.health_check()

    report = health_registry.run_all()
    print(report.overall)   # HealthStatus.HEALTHY | DEGRADED | UNHEALTHY
"""

from __future__ import annotations

import threading
import time
import traceback
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional


class HealthStatus(str, Enum):
    HEALTHY   = "healthy"
    DEGRADED  = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN   = "unknown"


@dataclass
class CheckResult:
    name: str
    status: HealthStatus
    message: str = ""
    details: dict = field(default_factory=dict)
    duration_ms: float = 0.0
    checked_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "status": self.status.value,
            "message": self.message,
            "details": self.details,
            "duration_ms": round(self.duration_ms, 2),
            "checked_at": self.checked_at,
        }


@dataclass
class HealthReport:
    results: list[CheckResult]
    overall: HealthStatus
    generated_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "overall": self.overall.value,
            "generated_at": self.generated_at,
            "checks": [r.to_dict() for r in self.results],
        }


class HealthCheck:
    """Wraps a callable health-check function with metadata."""

    def __init__(
        self,
        name: str,
        func: Callable,
        critical: bool = True,
        timeout: float = 5.0,
    ) -> None:
        self.name = name
        self._func = func
        self.critical = critical
        self.timeout = timeout
        self._last_result: Optional[CheckResult] = None

    def run(self) -> CheckResult:
        start = time.perf_counter()
        try:
            details = self._func() or {}
            if not isinstance(details, dict):
                details = {"result": str(details)}
            duration = (time.perf_counter() - start) * 1000
            result = CheckResult(
                name=self.name,
                status=HealthStatus.HEALTHY,
                message="OK",
                details=details,
                duration_ms=duration,
            )
        except Exception as exc:
            duration = (time.perf_counter() - start) * 1000
            result = CheckResult(
                name=self.name,
                status=HealthStatus.UNHEALTHY if self.critical else HealthStatus.DEGRADED,
                message=str(exc),
                details={"traceback": traceback.format_exc()},
                duration_ms=duration,
            )
        self._last_result = result
        return result

    @property
    def last_result(self) -> Optional[CheckResult]:
        return self._last_result


class HealthRegistry:
    """Manages all registered health checks."""

    def __init__(self) -> None:
        self._checks: dict[str, HealthCheck] = {}
        self._lock = threading.Lock()

    def register(
        self,
        name: str,
        func: Callable,
        critical: bool = True,
        timeout: float = 5.0,
    ) -> HealthCheck:
        hc = HealthCheck(name, func, critical, timeout)
        with self._lock:
            self._checks[name] = hc
        return hc

    def check(self, name: str, critical: bool = True, timeout: float = 5.0):
        """Decorator — register a function as a named health check."""
        def decorator(func: Callable) -> Callable:
            self.register(name, func, critical, timeout)
            return func
        return decorator

    def unregister(self, name: str) -> None:
        with self._lock:
            self._checks.pop(name, None)

    def run(self, name: str) -> CheckResult:
        with self._lock:
            hc = self._checks.get(name)
        if hc is None:
            return CheckResult(
                name=name,
                status=HealthStatus.UNKNOWN,
                message=f"No check registered as {name!r}",
            )
        return hc.run()

    def run_all(self) -> HealthReport:
        with self._lock:
            checks = list(self._checks.values())

        results = [hc.run() for hc in checks]

        if any(r.status == HealthStatus.UNHEALTHY for r in results):
            overall = HealthStatus.UNHEALTHY
        elif any(r.status == HealthStatus.DEGRADED for r in results):
            overall = HealthStatus.DEGRADED
        elif results:
            overall = HealthStatus.HEALTHY
        else:
            overall = HealthStatus.UNKNOWN

        return HealthReport(results=results, overall=overall)

    def names(self) -> list[str]:
        with self._lock:
            return list(self._checks.keys())

    def __len__(self) -> int:
        return len(self._checks)


health_registry = HealthRegistry()


# ── Built-in checks ──────────────────────────────────────────────────────────

def _uptime_check() -> dict:
    import os
    return {"pid": os.getpid()}


health_registry.register("self", _uptime_check, critical=False)
