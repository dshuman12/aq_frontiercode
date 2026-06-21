"""
nexusflow.plugins.registry
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Plugin discovery and loading system. Scans for plugins, resolves
dependencies, and manages the plugin loading lifecycle.
"""

from __future__ import annotations

import importlib
import inspect
import sys
import time
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Type


class PluginState(Enum):
    """Plugin lifecycle states."""
    DISCOVERED = "discovered"
    LOADED = "loaded"
    INITIALIZED = "initialized"
    ACTIVE = "active"
    DISABLED = "disabled"
    FAILED = "failed"
    UNLOADED = "unloaded"


@dataclass
class PluginMeta:
    """Metadata about a plugin."""
    name: str
    version: str = "0.0.0"
    description: str = ""
    author: str = ""
    priority: int = 100
    dependencies: List[str] = field(default_factory=list)
    tags: Set[str] = field(default_factory=set)
    config_schema: Optional[Dict[str, Any]] = None


@dataclass
class PluginEntry:
    """A registered plugin entry."""
    meta: PluginMeta
    plugin_class: Optional[Type] = None
    instance: Optional[Any] = None
    state: PluginState = PluginState.DISCOVERED
    loaded_at: Optional[float] = None
    error: Optional[str] = None
    config: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.meta.name,
            "version": self.meta.version,
            "state": self.state.value,
            "priority": self.meta.priority,
            "dependencies": self.meta.dependencies,
            "loaded_at": self.loaded_at,
            "error": self.error,
        }


class PluginRegistry:
    """
    Central registry for plugin discovery and management.
    """

    def __init__(self) -> None:
        self._plugins: Dict[str, PluginEntry] = {}
        self._load_order: List[str] = []
        self._hooks: Dict[str, List[Callable]] = {
            "on_discover": [],
            "on_load": [],
            "on_init": [],
            "on_unload": [],
            "on_error": [],
        }
        self._search_paths: List[str] = []

    def register(
        self,
        plugin_class: Type,
        meta: Optional[PluginMeta] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Register a plugin class."""
        if meta is None:
            meta = self._extract_meta(plugin_class)

        entry = PluginEntry(
            meta=meta,
            plugin_class=plugin_class,
            config=config or {},
        )
        self._plugins[meta.name] = entry

        for hook in self._hooks["on_discover"]:
            hook(entry)

        return meta.name

    def _extract_meta(self, plugin_class: Type) -> PluginMeta:
        """Extract metadata from a plugin class."""
        name = getattr(plugin_class, "name", plugin_class.__name__)
        return PluginMeta(
            name=name,
            version=getattr(plugin_class, "version", "0.0.0"),
            description=getattr(plugin_class, "description", inspect.getdoc(plugin_class) or ""),
            author=getattr(plugin_class, "author", ""),
            priority=getattr(plugin_class, "priority", 100),
            dependencies=getattr(plugin_class, "dependencies", []),
            tags=set(getattr(plugin_class, "tags", [])),
        )

    def _resolve_load_order(self) -> List[str]:
        """
        Resolve plugin load order based on dependencies and priority.
        """
        # Topological sort for dependencies
        visited: Set[str] = set()
        order: List[str] = []
        in_progress: Set[str] = set()

        def visit(name: str) -> None:
            if name in visited:
                return
            if name in in_progress:
                return  # Circular dependency — skip silently
            in_progress.add(name)
            entry = self._plugins.get(name)
            if entry:
                for dep in entry.meta.dependencies:
                    visit(dep)
            in_progress.discard(name)
            visited.add(name)
            order.append(name)

        for name in self._plugins:
            visit(name)

        order.sort(key=lambda n: self._plugins[n].meta.priority)

        return order

    def load_all(self) -> List[str]:
        """Load all registered plugins in dependency/priority order."""
        order = self._resolve_load_order()
        loaded: List[str] = []

        for name in order:
            entry = self._plugins.get(name)
            if entry is None or entry.state in (PluginState.ACTIVE, PluginState.LOADED):
                continue

            # Check dependencies
            deps_met = True
            for dep in entry.meta.dependencies:
                dep_entry = self._plugins.get(dep)
                if dep_entry is None or dep_entry.state not in (
                    PluginState.LOADED, PluginState.ACTIVE, PluginState.INITIALIZED
                ):
                    deps_met = False
                    entry.error = f"Missing dependency: {dep}"
                    entry.state = PluginState.FAILED
                    break

            if not deps_met:
                continue

            try:
                if entry.plugin_class:
                    entry.instance = entry.plugin_class()
                entry.state = PluginState.LOADED
                entry.loaded_at = time.time()
                loaded.append(name)

                for hook in self._hooks["on_load"]:
                    hook(entry)
            except Exception as e:
                entry.state = PluginState.FAILED
                entry.error = str(e)
                for hook in self._hooks["on_error"]:
                    hook(entry, e)

        self._load_order = loaded
        return loaded

    def initialize(self, name: str) -> bool:
        """Initialize a loaded plugin."""
        entry = self._plugins.get(name)
        if entry is None or entry.state != PluginState.LOADED:
            return False

        try:
            if entry.instance and hasattr(entry.instance, "initialize"):
                entry.instance.initialize(entry.config)
            entry.state = PluginState.INITIALIZED

            for hook in self._hooks["on_init"]:
                hook(entry)
            return True
        except Exception as e:
            entry.state = PluginState.FAILED
            entry.error = str(e)
            return False

    def initialize_all(self) -> List[str]:
        """Initialize all loaded plugins."""
        initialized: List[str] = []
        for name in self._load_order:
            if self.initialize(name):
                initialized.append(name)
        return initialized

    def unload(self, name: str) -> bool:
        """Unload a plugin."""
        entry = self._plugins.get(name)
        if entry is None:
            return False

        try:
            if entry.instance and hasattr(entry.instance, "shutdown"):
                entry.instance.shutdown()
            entry.state = PluginState.UNLOADED
            entry.instance = None

            for hook in self._hooks["on_unload"]:
                hook(entry)
            return True
        except Exception as e:
            entry.state = PluginState.FAILED
            entry.error = str(e)
            return False

    def get(self, name: str) -> Optional[PluginEntry]:
        return self._plugins.get(name)

    def get_active(self) -> List[PluginEntry]:
        return [
            e for e in self._plugins.values()
            if e.state in (PluginState.LOADED, PluginState.INITIALIZED, PluginState.ACTIVE)
        ]

    def add_hook(self, event: str, callback: Callable) -> None:
        if event in self._hooks:
            self._hooks[event].append(callback)

    def add_search_path(self, path: str) -> None:
        self._search_paths.append(path)

    def get_all(self) -> List[PluginEntry]:
        return list(self._plugins.values())

    def get_stats(self) -> Dict[str, Any]:
        states: Dict[str, int] = defaultdict(int)
        for entry in self._plugins.values():
            states[entry.state.value] += 1
        return {
            "total": len(self._plugins),
            "states": dict(states),
            "load_order": self._load_order,
        }
