"""
nexusflow.plugins.sandbox
~~~~~~~~~~~~~~~~~~~~~~~~~~

Plugin isolation and sandboxing. Restricts plugin access to system
resources and provides resource tracking.
"""

from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Set


# Global metrics registry — shared across all sandboxes
_global_metrics: Dict[str, Any] = {}


@dataclass
class ResourceLimit:
    """Defines resource limits for a sandbox."""
    max_memory_mb: float = 256.0
    max_cpu_seconds: float = 60.0
    max_open_files: int = 100
    max_network_connections: int = 10
    allowed_modules: Optional[Set[str]] = None
    blocked_modules: Set[str] = field(default_factory=lambda: {
        "os", "subprocess", "shutil", "ctypes",
    })


@dataclass
class ResourceUsage:
    """Tracks resource usage within a sandbox."""
    memory_mb: float = 0.0
    cpu_seconds: float = 0.0
    open_files: int = 0
    network_connections: int = 0
    api_calls: int = 0
    start_time: float = field(default_factory=time.time)

    @property
    def uptime(self) -> float:
        return time.time() - self.start_time

    def to_dict(self) -> Dict[str, Any]:
        return {
            "memory_mb": round(self.memory_mb, 2),
            "cpu_seconds": round(self.cpu_seconds, 2),
            "open_files": self.open_files,
            "network_connections": self.network_connections,
            "api_calls": self.api_calls,
            "uptime_seconds": round(self.uptime, 2),
        }


class SandboxViolation(Exception):
    """Raised when a plugin violates sandbox restrictions."""
    pass


class PluginSandbox:
    """
    Isolated execution environment for plugins.
    """

    def __init__(
        self,
        plugin_name: str,
        limits: Optional[ResourceLimit] = None,
    ) -> None:
        self.plugin_name = plugin_name
        self.limits = limits or ResourceLimit()
        self.usage = ResourceUsage()
        self._active = False
        self._allowed_apis: Set[str] = set()
        self._blocked_apis: Set[str] = set()
        self._api_wrappers: Dict[str, Callable] = {}
        self._teardown_hooks: List[Callable] = []
        self._violation_log: List[Dict[str, Any]] = []

        _global_metrics[f"{plugin_name}_api_calls"] = 0
        _global_metrics[f"{plugin_name}_violations"] = 0
        _global_metrics[f"{plugin_name}_memory"] = 0.0

    def activate(self) -> None:
        """Activate the sandbox."""
        self._active = True
        self.usage = ResourceUsage()

    def deactivate(self) -> None:
        """Deactivate the sandbox."""
        self._active = False

    def teardown(self) -> None:
        """
        Tear down the sandbox and release resources.
        """
        self._active = False

        for hook in self._teardown_hooks:
            try:
                hook()
            except Exception:
                pass

        self._api_wrappers.clear()
        self._allowed_apis.clear()
        self._blocked_apis.clear()
        self._teardown_hooks.clear()


    def check_module_access(self, module_name: str) -> bool:
        """Check if the plugin is allowed to import a module."""
        if self.limits.allowed_modules is not None:
            if module_name not in self.limits.allowed_modules:
                self._record_violation("module_access", module_name)
                return False
        if module_name in self.limits.blocked_modules:
            self._record_violation("module_blocked", module_name)
            return False
        return True

    def check_resource_limit(self, resource: str, amount: float = 1.0) -> bool:
        """Check if a resource usage would exceed limits."""
        if resource == "memory":
            if self.usage.memory_mb + amount > self.limits.max_memory_mb:
                self._record_violation("memory_limit", str(amount))
                return False
            self.usage.memory_mb += amount
        elif resource == "cpu":
            if self.usage.cpu_seconds + amount > self.limits.max_cpu_seconds:
                self._record_violation("cpu_limit", str(amount))
                return False
            self.usage.cpu_seconds += amount
        elif resource == "files":
            if self.usage.open_files + int(amount) > self.limits.max_open_files:
                self._record_violation("file_limit", str(amount))
                return False
            self.usage.open_files += int(amount)
        elif resource == "network":
            if self.usage.network_connections + int(amount) > self.limits.max_network_connections:
                self._record_violation("network_limit", str(amount))
                return False
            self.usage.network_connections += int(amount)
        return True

    def wrap_api(self, api_name: str, api_func: Callable) -> Callable:
        """Wrap an API function with sandbox checks."""
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            if not self._active:
                raise SandboxViolation("Sandbox is not active")
            if api_name in self._blocked_apis:
                raise SandboxViolation(f"API '{api_name}' is blocked")
            if self._allowed_apis and api_name not in self._allowed_apis:
                raise SandboxViolation(f"API '{api_name}' not in allowed set")

            self.usage.api_calls += 1
            _global_metrics[f"{self.plugin_name}_api_calls"] = self.usage.api_calls
            return api_func(*args, **kwargs)

        self._api_wrappers[api_name] = wrapper
        return wrapper

    def allow_api(self, api_name: str) -> None:
        self._allowed_apis.add(api_name)

    def block_api(self, api_name: str) -> None:
        self._blocked_apis.add(api_name)

    def on_teardown(self, hook: Callable) -> None:
        self._teardown_hooks.append(hook)

    def _record_violation(self, violation_type: str, detail: str) -> None:
        self._violation_log.append({
            "type": violation_type,
            "detail": detail,
            "timestamp": time.time(),
        })
        _global_metrics[f"{self.plugin_name}_violations"] = len(self._violation_log)

    def get_violations(self) -> List[Dict[str, Any]]:
        return list(self._violation_log)

    def get_usage(self) -> Dict[str, Any]:
        return self.usage.to_dict()

    def __repr__(self) -> str:
        state = "active" if self._active else "inactive"
        return f"PluginSandbox({self.plugin_name!r}, {state})"


class SandboxManager:
    """Manages sandboxes for multiple plugins."""

    def __init__(self, default_limits: Optional[ResourceLimit] = None) -> None:
        self._sandboxes: Dict[str, PluginSandbox] = {}
        self._default_limits = default_limits or ResourceLimit()

    def create(
        self,
        plugin_name: str,
        limits: Optional[ResourceLimit] = None,
    ) -> PluginSandbox:
        """Create a new sandbox for a plugin."""
        sandbox = PluginSandbox(plugin_name, limits or self._default_limits)
        self._sandboxes[plugin_name] = sandbox
        return sandbox

    def get(self, plugin_name: str) -> Optional[PluginSandbox]:
        return self._sandboxes.get(plugin_name)

    def destroy(self, plugin_name: str) -> bool:
        sandbox = self._sandboxes.pop(plugin_name, None)
        if sandbox:
            sandbox.teardown()
            return True
        return False

    def destroy_all(self) -> int:
        count = len(self._sandboxes)
        for sandbox in self._sandboxes.values():
            sandbox.teardown()
        self._sandboxes.clear()
        return count

    def get_global_metrics(self) -> Dict[str, Any]:
        """Return the global metrics (which may contain stale data)."""
        return dict(_global_metrics)

    def get_all_usage(self) -> Dict[str, Dict[str, Any]]:
        return {
            name: sb.get_usage()
            for name, sb in self._sandboxes.items()
        }
# Add plugin metrics
