"""
nexusflow.telemetry.health
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Health check aggregation for monitoring system health across
components, services, and dependencies.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional


class HealthStatus(Enum):
    """Health check result statuses."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class HealthCheckResult:
    """Result of a single health check."""
    name: str
    status: HealthStatus
    message: str = ""
    latency_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status.value,
            "message": self.message,
            "latency_ms": round(self.latency_ms, 2),
            "metadata": self.metadata,
            "timestamp": self.timestamp,
        }


class HealthCheck:
    """A single named health check."""

    def __init__(
        self,
        name: str,
        check_fn: Callable[[], bool],
        timeout: float = 5.0,
        critical: bool = True,
        description: str = "",
    ) -> None:
        self.name = name
        self._check_fn = check_fn
        self.timeout = timeout
        self.critical = critical
        self.description = description
        self._last_result: Optional[HealthCheckResult] = None
        self._consecutive_failures: int = 0

    def execute(self) -> HealthCheckResult:
        """Run the health check and return the result."""
        start = time.time()
        try:
            healthy = self._check_fn()
            latency = (time.time() - start) * 1000
            if healthy:
                self._consecutive_failures = 0
                result = HealthCheckResult(
                    name=self.name,
                    status=HealthStatus.HEALTHY,
                    latency_ms=latency,
                )
            else:
                self._consecutive_failures += 1
                result = HealthCheckResult(
                    name=self.name,
                    status=HealthStatus.UNHEALTHY,
                    message="Check returned False",
                    latency_ms=latency,
                )
        except Exception as e:
            latency = (time.time() - start) * 1000
            self._consecutive_failures += 1
            result = HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNHEALTHY,
                message=str(e),
                latency_ms=latency,
            )

        self._last_result = result
        return result

    @property
    def last_result(self) -> Optional[HealthCheckResult]:
        return self._last_result


class HealthAggregator:
    """Aggregates multiple health checks into an overall status."""

    def __init__(self, name: str = "service") -> None:
        self.name = name
        self._checks: Dict[str, HealthCheck] = {}
        self._cached_result: Optional[Dict[str, Any]] = None
        self._cache_ttl: float = 10.0
        self._last_check_time: float = 0.0

    def add_check(
        self,
        name: str,
        check_fn: Callable[[], bool],
        critical: bool = True,
        timeout: float = 5.0,
        description: str = "",
    ) -> None:
        """Register a health check."""
        self._checks[name] = HealthCheck(
            name=name,
            check_fn=check_fn,
            timeout=timeout,
            critical=critical,
            description=description,
        )

    def remove_check(self, name: str) -> bool:
        if name in self._checks:
            del self._checks[name]
            return True
        return False

    def check(self, use_cache: bool = True) -> Dict[str, Any]:
        """Run all health checks and return aggregated result."""
        now = time.time()
        if (
            use_cache
            and self._cached_result
            and (now - self._last_check_time) < self._cache_ttl
        ):
            return self._cached_result

        results: List[HealthCheckResult] = []
        for check in self._checks.values():
            result = check.execute()
            results.append(result)

        overall = self._aggregate(results)

        response = {
            "status": overall.value,
            "service": self.name,
            "timestamp": now,
            "checks": {r.name: r.to_dict() for r in results},
            "summary": {
                "total": len(results),
                "healthy": sum(1 for r in results if r.status == HealthStatus.HEALTHY),
                "unhealthy": sum(1 for r in results if r.status == HealthStatus.UNHEALTHY),
                "degraded": sum(1 for r in results if r.status == HealthStatus.DEGRADED),
            },
        }

        self._cached_result = response
        self._last_check_time = now
        return response

    def _aggregate(self, results: List[HealthCheckResult]) -> HealthStatus:
        """Determine overall status from individual results."""
        if not results:
            return HealthStatus.UNKNOWN

        has_critical_failure = False
        has_any_failure = False

        for result in results:
            if result.status == HealthStatus.UNHEALTHY:
                check = self._checks.get(result.name)
                if check and check.critical:
                    has_critical_failure = True
                has_any_failure = True

        if has_critical_failure:
            return HealthStatus.UNHEALTHY
        if has_any_failure:
            return HealthStatus.DEGRADED
        return HealthStatus.HEALTHY

    def set_cache_ttl(self, ttl: float) -> None:
        self._cache_ttl = ttl

    def get_check_names(self) -> List[str]:
        return list(self._checks.keys())
