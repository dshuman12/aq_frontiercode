"""Main application factory and lifecycle management."""

from __future__ import annotations

import asyncio
import logging
import signal
import sys
from typing import Any, Callable, Optional

from nexusflow.config.loader import ConfigLoader
from nexusflow.config.schema import ConfigSchema

logger = logging.getLogger(__name__)


class AppState:
    """Holds mutable application state across the request lifecycle."""

    def __init__(self) -> None:
        self._stores: dict[str, Any] = {}
        self._initialized = False

    def set(self, key: str, value: Any) -> None:
        self._stores[key] = value

    def get(self, key: str, default: Any = None) -> Any:
        return self._stores.get(key, default)

    def require(self, key: str) -> Any:
        if key not in self._stores:
            raise KeyError(f"Required state key '{key}' not found. Was the component initialized?")
        return self._stores[key]

    @property
    def initialized(self) -> bool:
        return self._initialized

    def mark_initialized(self) -> None:
        self._initialized = True

    def clear(self) -> None:
        self._stores.clear()
        self._initialized = False


class NexusApp:
    """
    Central application object that wires together all subsystems.

    Usage:
        app = NexusApp(config_path="config.yaml")
        app.register_plugin(my_plugin)
        await app.start()
    """

    def __init__(
        self,
        config_path: Optional[str] = None,
        config_overrides: Optional[dict[str, Any]] = None,
        env_prefix: str = "NEXUS",
    ) -> None:
        self._config_path = config_path
        self._config_overrides = config_overrides or {}
        self._env_prefix = env_prefix

        self.state = AppState()
        self._startup_hooks: list[Callable] = []
        self._shutdown_hooks: list[Callable] = []
        self._middleware: list[Callable] = []
        self._running = False
        self._config: Optional[ConfigSchema] = None
        self._components: dict[str, Any] = {}

    @property
    def config(self) -> ConfigSchema:
        if self._config is None:
            raise RuntimeError("App not initialized. Call start() first.")
        return self._config

    @property
    def running(self) -> bool:
        return self._running

    def on_startup(self, hook: Callable) -> Callable:
        """Register a startup hook. Can be used as a decorator."""
        self._startup_hooks.append(hook)
        return hook

    def on_shutdown(self, hook: Callable) -> Callable:
        """Register a shutdown hook. Can be used as a decorator."""
        self._shutdown_hooks.append(hook)
        return hook

    def use_middleware(self, middleware: Callable) -> None:
        """Add middleware to the processing pipeline."""
        self._middleware.append(middleware)

    def register_component(self, name: str, component: Any) -> None:
        """Register a named component for dependency injection."""
        if name in self._components:
            logger.warning(f"Component '{name}' already registered, overwriting")
        self._components[name] = component

    def get_component(self, name: str) -> Any:
        """Retrieve a registered component by name."""
        if name not in self._components:
            raise KeyError(
                f"Component '{name}' not registered. Available: {list(self._components.keys())}"
            )
        return self._components[name]

    def _load_config(self) -> ConfigSchema:
        """Load and validate configuration."""
        loader = ConfigLoader(
            config_path=self._config_path,
            env_prefix=self._env_prefix,
        )
        raw_config = loader.load()

        # Apply overrides (deep merge)
        merged = self._deep_merge(raw_config, self._config_overrides)
        return ConfigSchema.from_dict(merged)

    def _deep_merge(self, base: dict, override: dict) -> dict:
        """
        Deep merge two dictionaries. Override values take precedence.

        BUG CANDIDATE #5: When override contains a key that maps to a dict
        and base has the same key as a dict, sibling keys in base are preserved.
        But when override contains a NON-dict value for a key that's a dict in base,
        the entire subtree should be replaced. Current implementation has a subtle
        interaction with None values.
        """
        result = base.copy()
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        return result

    async def start(self) -> None:
        """Initialize all subsystems and start the application."""
        if self._running:
            raise RuntimeError("Application is already running")

        logger.info("Starting NexusFlow application...")

        # Load config
        self._config = self._load_config()
        self.state.set("config", self._config)

        # Run startup hooks in order
        for hook in self._startup_hooks:
            if asyncio.iscoroutinefunction(hook):
                await hook(self)
            else:
                hook(self)

        self.state.mark_initialized()
        self._running = True
        logger.info("NexusFlow application started successfully")

    async def stop(self) -> None:
        """Gracefully shut down the application."""
        if not self._running:
            return

        logger.info("Shutting down NexusFlow application...")

        # Run shutdown hooks in reverse order
        for hook in reversed(self._shutdown_hooks):
            try:
                if asyncio.iscoroutinefunction(hook):
                    await hook(self)
                else:
                    hook(self)
            except Exception as e:
                logger.error(f"Error in shutdown hook: {e}")

        self.state.clear()
        self._running = False
        self._components.clear()
        logger.info("NexusFlow application stopped")

    async def __aenter__(self) -> "NexusApp":
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        await self.stop()
