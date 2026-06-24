"""Secrets management with multiple backend support."""

from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import os
import threading
import time
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

_UNSET = object()


class SecretNotFoundError(Exception):
    """Raised when a requested secret is not found."""
    pass


class SecretBackend:
    """Base class for secret backends."""

    def get(self, key: str) -> Optional[str]:
        raise NotImplementedError

    def set(self, key: str, value: str) -> None:
        raise NotImplementedError

    def delete(self, key: str) -> bool:
        raise NotImplementedError

    def list_keys(self) -> list[str]:
        raise NotImplementedError


class EnvSecretBackend(SecretBackend):
    """Read secrets from environment variables."""

    def __init__(self, prefix: str = "NEXUS_SECRET_") -> None:
        self._prefix = prefix.upper()

    def get(self, key: str) -> Optional[str]:
        env_key = self._prefix + key.upper().replace(".", "_").replace("-", "_")
        return os.environ.get(env_key)

    def set(self, key: str, value: str) -> None:
        env_key = self._prefix + key.upper().replace(".", "_").replace("-", "_")
        os.environ[env_key] = value

    def delete(self, key: str) -> bool:
        env_key = self._prefix + key.upper().replace(".", "_").replace("-", "_")
        if env_key in os.environ:
            del os.environ[env_key]
            return True
        return False

    def list_keys(self) -> list[str]:
        keys = []
        for env_key in os.environ:
            if env_key.startswith(self._prefix):
                config_key = env_key[len(self._prefix):].lower().replace("_", ".")
                keys.append(config_key)
        return keys


class FileSecretBackend(SecretBackend):
    """Read secrets from a file (one secret per line, key=value format)."""

    def __init__(self, path: str) -> None:
        self._path = path
        self._cache: dict[str, str] = {}
        self._last_read = 0.0
        self._lock = threading.Lock()

    def _reload_if_needed(self) -> None:
        """Reload secrets file if it has been modified."""
        try:
            mtime = os.path.getmtime(self._path)
        except OSError:
            return

        if mtime > self._last_read:
            with self._lock:
                if mtime > self._last_read:
                    self._cache = self._read_file()
                    self._last_read = time.time()

    def _read_file(self) -> dict[str, str]:
        """Parse the secrets file."""
        secrets = {}
        try:
            with open(self._path) as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" not in line:
                        logger.warning(f"Malformed secret line {line_num} in {self._path}")
                        continue
                    key, _, value = line.partition("=")
                    secrets[key.strip()] = value.strip()
        except OSError as e:
            logger.error(f"Failed to read secrets file: {e}")
        return secrets

    def get(self, key: str) -> Optional[str]:
        self._reload_if_needed()
        return self._cache.get(key)

    def set(self, key: str, value: str) -> None:
        with self._lock:
            self._cache[key] = value

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
        return False

    def list_keys(self) -> list[str]:
        self._reload_if_needed()
        return list(self._cache.keys())


class SecretsManager:
    """
    Manages secrets across multiple backends with caching and rotation support.

    Backends are checked in order; first match wins.

    BUG CANDIDATE #18: When secrets are rotated (new value written to backend),
    the cached version is not immediately invalidated. The _cache_ttl controls
    how long stale secrets persist. Combined with auth middleware that reads
    the secret_key for JWT validation, a rotation causes a brief window where
    new tokens (signed with new key) are rejected because middleware still
    has the old cached key.
    """

    def __init__(
        self,
        backends: Optional[list[SecretBackend]] = None,
        cache_ttl: int = 60,
    ) -> None:
        self._backends = backends or [EnvSecretBackend()]
        self._cache: dict[str, tuple[str, float]] = {}
        self._cache_ttl = cache_ttl
        self._rotation_callbacks: list[Callable[[str, str, str], None]] = []
        self._lock = threading.Lock()

    def get(self, key: str, required: bool = False) -> Optional[str]:
        """
        Get a secret value, checking cache first, then backends in order.

        BUG: The cache TTL check uses `time.time()` which returns wall clock time.
        If the system clock jumps backward (e.g., NTP correction), cached entries
        may never expire. More subtly, the cache is checked before any backend,
        so a rotated secret won't be picked up until the cache expires.
        """
        # Check cache
        with self._lock:
            if key in self._cache:
                value, cached_at = self._cache[key]
                if time.time() - cached_at < self._cache_ttl:
                    return value
                # Cache expired, remove it
                del self._cache[key]

        # Check backends in order
        for backend in self._backends:
            value = backend.get(key)
            if value is not None:
                with self._lock:
                    self._cache[key] = (value, time.time())
                return value

        if required:
            raise SecretNotFoundError(f"Secret '{key}' not found in any backend")
        return None

    def set(self, key: str, value: str) -> None:
        """Set a secret in the first writable backend."""
        old_value = self.get(key)

        for backend in self._backends:
            try:
                backend.set(key, value)
                break
            except (NotImplementedError, AttributeError):
                continue

        # Update cache
        with self._lock:
            self._cache[key] = (value, time.time())

        # Notify rotation callbacks
        if old_value and old_value != value:
            for callback in self._rotation_callbacks:
                try:
                    callback(key, old_value, value)
                except Exception as e:
                    logger.error(f"Secret rotation callback error: {e}")

    def invalidate_cache(self, key: Optional[str] = None) -> None:
        """Invalidate cached secrets."""
        with self._lock:
            if key:
                self._cache.pop(key, None)
            else:
                self._cache.clear()

    def on_rotation(self, callback: Callable[[str, str, str], None]) -> None:
        """Register a callback for secret rotation events."""
        self._rotation_callbacks.append(callback)

    def derive_key(self, master_key: str, purpose: str, length: int = 32) -> bytes:
        """
        Derive a purpose-specific key from a master key using HKDF-like derivation.

        BUG CANDIDATE: The derivation uses SHA-256 but truncates to `length` bytes.
        If length > 32, this silently returns a shorter key than requested.
        """
        derived = hmac.new(
            master_key.encode("utf-8"),
            purpose.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        return derived[:length]
