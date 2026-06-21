"""
nexusflow.plugins.lifecycle
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Plugin lifecycle management handling start, stop, restart, health
checks, and graceful degradation of plugins.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set


class LifecyclePhase(Enum):
    """Phases in a plugin's lifecycle."""
    CREATED = "created"
    CONFIGURING = "configuring"
    CONFIGURED = "configured"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    STOPPED = "stopped"
    FAILED = "failed"
    DEGRADED = "degraded"


@dataclass
class LifecycleEvent:
    """Records a lifecycle transition."""
    plugin_name: str
    from_phase: LifecyclePhase
    to_phase: LifecyclePhase
    timestamp: float = field(default_factory=time.time)
    reason: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "plugin_name": self.plugin_name,
            "from": self.from_phase.value,
            "to": self.to_phase.value,
            "timestamp": self.timestamp,
            "reason": self.reason,
        }


class PluginLifecycle:
    """Manages the lifecycle of a single plugin."""

    VALID_TRANSITIONS: Dict[LifecyclePhase, Set[LifecyclePhase]] = {
        LifecyclePhase.CREATED: {LifecyclePhase.CONFIGURING, LifecyclePhase.FAILED},
        LifecyclePhase.CONFIGURING: {LifecyclePhase.CONFIGURED, LifecyclePhase.FAILED},
        LifecyclePhase.CONFIGURED: {LifecyclePhase.STARTING, LifecyclePhase.FAILED},
        LifecyclePhase.STARTING: {LifecyclePhase.RUNNING, LifecyclePhase.FAILED},
        LifecyclePhase.RUNNING: {
            LifecyclePhase.STOPPING, LifecyclePhase.DEGRADED,
            LifecyclePhase.FAILED,
        },
        LifecyclePhase.DEGRADED: {
            LifecyclePhase.RUNNING, LifecyclePhase.STOPPING,
            LifecyclePhase.FAILED,
        },
        LifecyclePhase.STOPPING: {LifecyclePhase.STOPPED, LifecyclePhase.FAILED},
        LifecyclePhase.STOPPED: {LifecyclePhase.CONFIGURING},
        LifecyclePhase.FAILED: {LifecyclePhase.CONFIGURING, LifecyclePhase.STOPPED},
    }

    def __init__(self, plugin_name: str) -> None:
        self.plugin_name = plugin_name
        self.phase = LifecyclePhase.CREATED
        self._history: List[LifecycleEvent] = []
        self._callbacks: Dict[LifecyclePhase, List[Callable]] = defaultdict_factory()
        self._health_check: Optional[Callable[[], bool]] = None
        self._started_at: Optional[float] = None
        self._stopped_at: Optional[float] = None
        self._failure_count: int = 0
        self._restart_count: int = 0

    def transition(self, to_phase: LifecyclePhase, reason: str = "") -> bool:
        """Attempt a lifecycle transition."""
        valid = self.VALID_TRANSITIONS.get(self.phase, set())
        if to_phase not in valid:
            return False

        event = LifecycleEvent(
            plugin_name=self.plugin_name,
            from_phase=self.phase,
            to_phase=to_phase,
            reason=reason,
        )
        self._history.append(event)

        old_phase = self.phase
        self.phase = to_phase

        if to_phase == LifecyclePhase.RUNNING:
            self._started_at = time.time()
        elif to_phase == LifecyclePhase.STOPPED:
            self._stopped_at = time.time()
        elif to_phase == LifecyclePhase.FAILED:
            self._failure_count += 1

        # Fire callbacks
        for callback in self._callbacks.get(to_phase, []):
            try:
                callback(event)
            except Exception:
                pass

        return True

    def start(self) -> bool:
        """Start the plugin following the lifecycle phases."""
        if self.phase == LifecyclePhase.CREATED:
            self.transition(LifecyclePhase.CONFIGURING, "auto-start")
        if self.phase == LifecyclePhase.CONFIGURING:
            self.transition(LifecyclePhase.CONFIGURED, "auto-configure")
        if self.phase == LifecyclePhase.CONFIGURED:
            if self.transition(LifecyclePhase.STARTING, "starting"):
                return self.transition(LifecyclePhase.RUNNING, "started")
        return False

    def stop(self, reason: str = "manual") -> bool:
        """Stop the plugin."""
        if self.phase in (LifecyclePhase.RUNNING, LifecyclePhase.DEGRADED):
            if self.transition(LifecyclePhase.STOPPING, reason):
                return self.transition(LifecyclePhase.STOPPED, "stopped")
        return False

    def restart(self, reason: str = "restart requested") -> bool:
        """Restart the plugin."""
        if self.stop(reason):
            self._restart_count += 1
            self.transition(LifecyclePhase.CONFIGURING, "restarting")
            return self.start()
        return False

    def mark_degraded(self, reason: str = "") -> bool:
        """Mark the plugin as degraded."""
        return self.transition(LifecyclePhase.DEGRADED, reason)

    def mark_failed(self, reason: str = "") -> bool:
        """Mark the plugin as failed."""
        return self.transition(LifecyclePhase.FAILED, reason)

    def set_health_check(self, check: Callable[[], bool]) -> None:
        """Set a health check function."""
        self._health_check = check

    def check_health(self) -> bool:
        """Run the health check."""
        if self._health_check is None:
            return self.phase == LifecyclePhase.RUNNING
        try:
            return self._health_check()
        except Exception:
            return False

    def on_phase(self, phase: LifecyclePhase, callback: Callable) -> None:
        """Register a callback for a specific phase transition."""
        if phase not in self._callbacks:
            self._callbacks[phase] = []
        self._callbacks[phase].append(callback)

    @property
    def uptime(self) -> Optional[float]:
        if self._started_at is None:
            return None
        end = self._stopped_at or time.time()
        return end - self._started_at

    def get_history(self) -> List[Dict[str, Any]]:
        return [e.to_dict() for e in self._history]

    def get_status(self) -> Dict[str, Any]:
        return {
            "plugin_name": self.plugin_name,
            "phase": self.phase.value,
            "uptime": self.uptime,
            "failures": self._failure_count,
            "restarts": self._restart_count,
            "healthy": self.check_health(),
        }


def defaultdict_factory() -> Dict[LifecyclePhase, List[Callable]]:
    """Factory for callback dict."""
    return {}


class LifecycleManager:
    """Manages lifecycles of multiple plugins."""

    def __init__(self) -> None:
        self._lifecycles: Dict[str, PluginLifecycle] = {}
        self._global_hooks: Dict[str, List[Callable]] = {
            "on_start": [],
            "on_stop": [],
            "on_fail": [],
        }

    def register(self, plugin_name: str) -> PluginLifecycle:
        """Create and register a lifecycle for a plugin."""
        lifecycle = PluginLifecycle(plugin_name)
        self._lifecycles[plugin_name] = lifecycle
        return lifecycle

    def get(self, plugin_name: str) -> Optional[PluginLifecycle]:
        return self._lifecycles.get(plugin_name)

    def start_all(self) -> Dict[str, bool]:
        """Start all registered plugins."""
        results: Dict[str, bool] = {}
        for name, lifecycle in self._lifecycles.items():
            success = lifecycle.start()
            results[name] = success
            if success:
                for hook in self._global_hooks["on_start"]:
                    hook(name)
        return results

    def stop_all(self, reason: str = "shutdown") -> Dict[str, bool]:
        """Stop all running plugins."""
        results: Dict[str, bool] = {}
        for name, lifecycle in self._lifecycles.items():
            success = lifecycle.stop(reason)
            results[name] = success
            if success:
                for hook in self._global_hooks["on_stop"]:
                    hook(name)
        return results

    def health_check_all(self) -> Dict[str, bool]:
        return {
            name: lifecycle.check_health()
            for name, lifecycle in self._lifecycles.items()
        }

    def add_hook(self, event: str, callback: Callable) -> None:
        if event in self._global_hooks:
            self._global_hooks[event].append(callback)

    def get_all_status(self) -> Dict[str, Dict[str, Any]]:
        return {
            name: lifecycle.get_status()
            for name, lifecycle in self._lifecycles.items()
        }
