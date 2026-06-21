"""
nexusflow.events.handlers
~~~~~~~~~~~~~~~~~~~~~~~~~~

Event handler registry with type-based filtering, handler groups,
and lifecycle management. Provides decorators for easy handler
registration with automatic type inference.
"""

from __future__ import annotations

import inspect
import re
from collections import defaultdict
from dataclasses import dataclass, field
from typing import (
    Any,
    Callable,
    Dict,
    List,
    Optional,
    Pattern,
    Set,
    Type,
    Union,
)


@dataclass
class HandlerInfo:
    """Metadata about a registered event handler."""
    name: str
    handler: Callable
    event_types: Set[str]
    group: str = ""
    priority: int = 50
    enabled: bool = True
    tags: Set[str] = field(default_factory=set)
    description: str = ""
    call_count: int = 0
    error_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "event_types": sorted(self.event_types),
            "group": self.group,
            "priority": self.priority,
            "enabled": self.enabled,
            "tags": sorted(self.tags),
            "call_count": self.call_count,
            "error_count": self.error_count,
        }


class HandlerGroup:
    """Groups handlers together for bulk operations."""

    def __init__(self, name: str, enabled: bool = True) -> None:
        self.name = name
        self.enabled = enabled
        self._handlers: Dict[str, HandlerInfo] = {}

    def add(self, info: HandlerInfo) -> None:
        self._handlers[info.name] = info

    def remove(self, name: str) -> bool:
        if name in self._handlers:
            del self._handlers[name]
            return True
        return False

    def enable(self) -> None:
        self.enabled = True
        for h in self._handlers.values():
            h.enabled = True

    def disable(self) -> None:
        self.enabled = False
        for h in self._handlers.values():
            h.enabled = False

    def get_handlers(self) -> List[HandlerInfo]:
        return list(self._handlers.values())


class TypeFilter:
    """Filters events based on type patterns."""

    def __init__(self, pattern: str) -> None:
        self._pattern_str = pattern
        if "*" in pattern or "?" in pattern:
            regex = pattern.replace(".", "\\.").replace("*", ".*").replace("?", ".")
            self._regex: Optional[Pattern] = re.compile(f"^{regex}$")
        else:
            self._regex = None

    def matches(self, event_type: str) -> bool:
        if self._regex:
            return bool(self._regex.match(event_type))
        return event_type == self._pattern_str

    def __repr__(self) -> str:
        return f"TypeFilter({self._pattern_str!r})"


class HandlerRegistry:
    """
    Central registry for event handlers with type filtering,
    grouping, and lifecycle management.
    """

    def __init__(self) -> None:
        self._handlers: Dict[str, HandlerInfo] = {}
        self._type_index: Dict[str, List[str]] = defaultdict(list)
        self._pattern_handlers: List[tuple] = []  # (TypeFilter, handler_name)
        self._groups: Dict[str, HandlerGroup] = {}
        self._interceptors: List[Callable] = []

    def register(
        self,
        handler: Callable,
        event_types: Union[str, List[str], Set[str]],
        name: Optional[str] = None,
        group: str = "",
        priority: int = 50,
        tags: Optional[Set[str]] = None,
        description: str = "",
    ) -> str:
        """Register an event handler."""
        handler_name = name or handler.__name__
        if isinstance(event_types, str):
            event_types_set = {event_types}
        else:
            event_types_set = set(event_types)

        info = HandlerInfo(
            name=handler_name,
            handler=handler,
            event_types=event_types_set,
            group=group,
            priority=priority,
            tags=tags or set(),
            description=description or (inspect.getdoc(handler) or ""),
        )

        self._handlers[handler_name] = info

        for et in event_types_set:
            if "*" in et or "?" in et:
                self._pattern_handlers.append((TypeFilter(et), handler_name))
            else:
                self._type_index[et].append(handler_name)

        if group:
            if group not in self._groups:
                self._groups[group] = HandlerGroup(group)
            self._groups[group].add(info)

        return handler_name

    def unregister(self, name: str) -> bool:
        """Unregister a handler by name."""
        info = self._handlers.pop(name, None)
        if info is None:
            return False

        for et in info.event_types:
            if et in self._type_index:
                self._type_index[et] = [
                    n for n in self._type_index[et] if n != name
                ]

        self._pattern_handlers = [
            (f, n) for f, n in self._pattern_handlers if n != name
        ]

        if info.group and info.group in self._groups:
            self._groups[info.group].remove(name)

        return True

    def get_handlers_for_event(self, event_type: str) -> List[HandlerInfo]:
        """Get all handlers matching an event type, sorted by priority."""
        handler_names: Set[str] = set()

        # Exact match
        handler_names.update(self._type_index.get(event_type, []))

        # Pattern match
        for type_filter, name in self._pattern_handlers:
            if type_filter.matches(event_type):
                handler_names.add(name)

        # Collect and filter
        handlers = []
        for name in handler_names:
            info = self._handlers.get(name)
            if info and info.enabled:
                handlers.append(info)

        return sorted(handlers, key=lambda h: h.priority)

    def get_handler(self, name: str) -> Optional[HandlerInfo]:
        """Get a handler by name."""
        return self._handlers.get(name)

    def get_group(self, name: str) -> Optional[HandlerGroup]:
        """Get a handler group."""
        return self._groups.get(name)

    def enable_group(self, name: str) -> None:
        """Enable all handlers in a group."""
        group = self._groups.get(name)
        if group:
            group.enable()

    def disable_group(self, name: str) -> None:
        """Disable all handlers in a group."""
        group = self._groups.get(name)
        if group:
            group.disable()

    def get_all_handlers(self) -> List[HandlerInfo]:
        """Return all registered handlers."""
        return sorted(self._handlers.values(), key=lambda h: h.priority)

    def add_interceptor(self, interceptor: Callable) -> None:
        """Add an interceptor that runs before every handler."""
        self._interceptors.append(interceptor)

    def invoke(self, handler_name: str, event: Any) -> Any:
        """Invoke a handler by name with interceptor chain."""
        info = self._handlers.get(handler_name)
        if info is None or not info.enabled:
            return None

        for interceptor in self._interceptors:
            event = interceptor(event, info)
            if event is None:
                return None

        try:
            result = info.handler(event)
            info.call_count += 1
            return result
        except Exception as e:
            info.error_count += 1
            raise

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_handlers": len(self._handlers),
            "groups": len(self._groups),
            "pattern_handlers": len(self._pattern_handlers),
            "by_group": {
                name: len(group.get_handlers())
                for name, group in self._groups.items()
            },
        }


def handler(
    *event_types: str,
    priority: int = 50,
    group: str = "",
    tags: Optional[Set[str]] = None,
) -> Callable:
    """Decorator to mark a function as an event handler."""
    def decorator(func: Callable) -> Callable:
        func._event_handler_meta = {
            "event_types": set(event_types),
            "priority": priority,
            "group": group,
            "tags": tags or set(),
        }
        return func
    return decorator


def discover_handlers(obj: Any, registry: HandlerRegistry) -> List[str]:
    """Discover and register handlers from an object's methods."""
    registered: List[str] = []
    for name in dir(obj):
        if name.startswith("_"):
            continue
        attr = getattr(obj, name, None)
        if callable(attr) and hasattr(attr, "_event_handler_meta"):
            meta = attr._event_handler_meta
            handler_name = registry.register(
                attr,
                meta["event_types"],
                name=f"{type(obj).__name__}.{name}",
                group=meta.get("group", ""),
                priority=meta.get("priority", 50),
                tags=meta.get("tags", set()),
            )
            registered.append(handler_name)
    return registered
# Add webhook support
