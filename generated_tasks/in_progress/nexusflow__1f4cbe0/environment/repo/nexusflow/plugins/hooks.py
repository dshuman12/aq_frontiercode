"""
nexusflow.plugins.hooks
~~~~~~~~~~~~~~~~~~~~~~~~

Plugin hook system with priority-based execution. Allows plugins
to register hooks at specific extension points and execute them
in a defined order.
"""

from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Set, Tuple


@dataclass
class HookRegistration:
    """A registered hook handler."""
    name: str
    handler: Callable
    plugin_name: str
    priority: int = 100
    enabled: bool = True
    call_count: int = 0
    total_time: float = 0.0

    @property
    def avg_time_ms(self) -> float:
        if self.call_count == 0:
            return 0.0
        return (self.total_time / self.call_count) * 1000


class HookPoint:
    """A named extension point where plugins can register hooks."""

    def __init__(
        self,
        name: str,
        description: str = "",
        required_params: Optional[List[str]] = None,
    ) -> None:
        self.name = name
        self.description = description
        self.required_params = required_params or []
        self._handlers: List[HookRegistration] = []
        self._sorted = False

    def register(
        self,
        handler: Callable,
        plugin_name: str,
        priority: int = 100,
    ) -> None:
        """Register a handler for this hook point."""
        reg = HookRegistration(
            name=f"{plugin_name}:{self.name}",
            handler=handler,
            plugin_name=plugin_name,
            priority=priority,
        )
        self._handlers.append(reg)
        self._sorted = False

    def unregister(self, plugin_name: str) -> int:
        """Unregister all handlers from a plugin."""
        original = len(self._handlers)
        self._handlers = [
            h for h in self._handlers if h.plugin_name != plugin_name
        ]
        return original - len(self._handlers)

    def _ensure_sorted(self) -> None:
        if not self._sorted:
            self._handlers.sort(key=lambda h: h.priority)
            self._sorted = True

    def execute(self, **kwargs: Any) -> List[Any]:
        """Execute all registered handlers and collect results."""
        self._ensure_sorted()
        results: List[Any] = []

        for reg in self._handlers:
            if not reg.enabled:
                continue
            start = time.time()
            try:
                result = reg.handler(**kwargs)
                results.append(result)
                reg.call_count += 1
            except Exception as e:
                results.append(None)
            finally:
                reg.total_time += time.time() - start

        return results

    def execute_pipeline(self, value: Any, **kwargs: Any) -> Any:
        """Execute handlers as a pipeline — each receives the output of the previous."""
        self._ensure_sorted()
        current = value

        for reg in self._handlers:
            if not reg.enabled:
                continue
            start = time.time()
            try:
                current = reg.handler(current, **kwargs)
                reg.call_count += 1
            except Exception:
                pass  # Skip failing handlers
            finally:
                reg.total_time += time.time() - start

        return current

    def execute_first(self, **kwargs: Any) -> Optional[Any]:
        """Execute handlers until one returns a non-None result."""
        self._ensure_sorted()
        for reg in self._handlers:
            if not reg.enabled:
                continue
            start = time.time()
            try:
                result = reg.handler(**kwargs)
                reg.call_count += 1
                if result is not None:
                    return result
            except Exception:
                pass
            finally:
                reg.total_time += time.time() - start
        return None

    def get_handlers(self) -> List[HookRegistration]:
        self._ensure_sorted()
        return list(self._handlers)

    def handler_count(self) -> int:
        return len(self._handlers)


class HookSystem:
    """Manages all hook points in the application."""

    def __init__(self) -> None:
        self._hooks: Dict[str, HookPoint] = {}
        self._global_interceptors: List[Callable] = []

    def define(
        self,
        name: str,
        description: str = "",
        required_params: Optional[List[str]] = None,
    ) -> HookPoint:
        """Define a new hook point."""
        hook = HookPoint(name, description, required_params)
        self._hooks[name] = hook
        return hook

    def register(
        self,
        hook_name: str,
        handler: Callable,
        plugin_name: str,
        priority: int = 100,
    ) -> bool:
        """Register a handler for a named hook point."""
        hook = self._hooks.get(hook_name)
        if hook is None:
            return False
        hook.register(handler, plugin_name, priority)
        return True

    def unregister_plugin(self, plugin_name: str) -> int:
        """Unregister all hooks from a plugin."""
        count = 0
        for hook in self._hooks.values():
            count += hook.unregister(plugin_name)
        return count

    def execute(self, hook_name: str, **kwargs: Any) -> List[Any]:
        """Execute a hook point."""
        hook = self._hooks.get(hook_name)
        if hook is None:
            return []
        return hook.execute(**kwargs)

    def execute_pipeline(
        self, hook_name: str, value: Any, **kwargs: Any
    ) -> Any:
        """Execute a hook as a pipeline."""
        hook = self._hooks.get(hook_name)
        if hook is None:
            return value
        return hook.execute_pipeline(value, **kwargs)

    def get_hook(self, name: str) -> Optional[HookPoint]:
        return self._hooks.get(name)

    def get_all_hooks(self) -> Dict[str, HookPoint]:
        return dict(self._hooks)

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_hooks": len(self._hooks),
            "hooks": {
                name: {
                    "handlers": hook.handler_count(),
                    "description": hook.description,
                }
                for name, hook in self._hooks.items()
            },
        }
