"""Versioned secret store."""
from __future__ import annotations

import copy
import fnmatch
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Iterator

from vaultkey.crypto.hashing import hash_digest, HashAlgorithm
from vaultkey.crypto.random import generate_id
from vaultkey.utils.errors import SecretNotFound, SecretVersionNotFound, VaultError


class SecretState(Enum):
    ACTIVE = "active"
    DELETED = "deleted"
    DESTROYED = "destroyed"


@dataclass
class SecretVersion:
    """A single version of a secret."""
    version: int
    value: bytes
    created_at: float = field(default_factory=time.time)
    deleted_at: float | None = None
    destroyed_at: float | None = None
    state: SecretState = SecretState.ACTIVE
    checksum: str = ""

    def __post_init__(self) -> None:
        if not self.checksum and self.state == SecretState.ACTIVE:
            self.checksum = hash_digest(self.value, HashAlgorithm.SHA256).hex()[:16]

    def soft_delete(self) -> None:
        self.state = SecretState.DELETED
        self.deleted_at = time.time()

    def destroy(self) -> None:
        self.state = SecretState.DESTROYED
        self.destroyed_at = time.time()
        self.value = b""
        self.checksum = ""

    def restore(self) -> None:
        if self.state == SecretState.DESTROYED:
            raise VaultError("cannot restore destroyed secret version")
        self.state = SecretState.ACTIVE
        self.deleted_at = None

    @property
    def is_active(self) -> bool:
        return self.state == SecretState.ACTIVE


@dataclass
class SecretMetadata:
    """Metadata for a secret path."""
    path: str
    namespace: str = "default"
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    current_version: int = 0
    max_versions: int = 10
    custom_metadata: dict[str, str] = field(default_factory=dict)
    owner: str = ""
    cas_required: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "path": self.path,
            "namespace": self.namespace,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "current_version": self.current_version,
            "max_versions": self.max_versions,
            "custom_metadata": dict(self.custom_metadata),
            "owner": self.owner,
            "cas_required": self.cas_required,
        }


@dataclass
class SecretEntry:
    """A secret entry with versioned values and metadata."""
    metadata: SecretMetadata
    versions: dict[int, SecretVersion] = field(default_factory=dict)

    @property
    def current(self) -> SecretVersion | None:
        v = self.metadata.current_version
        entry = self.versions.get(v)
        if entry and entry.is_active:
            return entry
        return None

    @property
    def path(self) -> str:
        return self.metadata.path

    def get_version(self, version: int) -> SecretVersion | None:
        return self.versions.get(version)

    def version_count(self) -> int:
        return len(self.versions)

    def active_versions(self) -> list[int]:
        return sorted(v for v, sv in self.versions.items() if sv.is_active)

    def _enforce_max_versions(self) -> None:
        max_v = self.metadata.max_versions
        if max_v <= 0:
            return
        active = sorted(self.versions.keys())
        while len(active) > max_v:
            oldest = active.pop(0)
            self.versions[oldest].destroy()


@dataclass
class GetResult:
    """Result of a secret retrieval."""
    value: bytes
    version: int
    metadata: SecretMetadata
    checksum: str


class SecretStore:
    """Versioned secret storage with namespaces."""

    def __init__(self, default_max_versions: int = 10) -> None:
        self._secrets: dict[str, SecretEntry] = {}
        self._default_max_versions = default_max_versions
        self._namespaces: dict[str, set[str]] = {"default": set()}

    def put(
        self,
        path: str,
        value: bytes,
        metadata: dict[str, str] | None = None,
        namespace: str = "default",
        cas: int | None = None,
        max_versions: int | None = None,
    ) -> SecretVersion:
        """Store a secret, creating a new version."""
        self._ensure_namespace(namespace)
        full_path = self._full_path(namespace, path)

        if full_path in self._secrets:
            entry = self._secrets[full_path]
            if entry.metadata.cas_required and cas is not None:
                if cas != entry.metadata.current_version:
                    raise VaultError(
                        f"CAS mismatch: expected {entry.metadata.current_version}, got {cas}",
                        code="CAS_MISMATCH",
                    )
        else:
            entry = SecretEntry(
                metadata=SecretMetadata(
                    path=path,
                    namespace=namespace,
                    max_versions=max_versions or self._default_max_versions,
                )
            )
            if metadata:
                entry.metadata.custom_metadata = dict(metadata)
            self._secrets[full_path] = entry
            self._namespaces[namespace].add(path)

        entry.metadata.current_version += 1
        entry.metadata.updated_at = time.time()

        if metadata:
            entry.metadata.custom_metadata.update(metadata)

        version = SecretVersion(
            version=entry.metadata.current_version,
            value=value,
        )
        entry.versions[version.version] = version
        entry._enforce_max_versions()

        return version

    def get(self, path: str, namespace: str = "default", version: int | None = None) -> GetResult:
        """Retrieve a secret."""
        full_path = self._full_path(namespace, path)
        entry = self._secrets.get(full_path)
        if entry is None:
            raise SecretNotFound(path)

        if version is not None:
            sv = entry.get_version(version)
            if sv is None:
                raise SecretVersionNotFound(path, version)
            if sv.state == SecretState.DESTROYED:
                raise SecretVersionNotFound(path, version)
        else:
            sv = entry.current
            if sv is None:
                raise SecretNotFound(path)

        return GetResult(
            value=sv.value,
            version=sv.version,
            metadata=entry.metadata,
            checksum=sv.checksum,
        )

    def delete(self, path: str, namespace: str = "default", versions: list[int] | None = None) -> int:
        """Soft-delete secret version(s). Returns count of deleted versions."""
        full_path = self._full_path(namespace, path)
        entry = self._secrets.get(full_path)
        if entry is None:
            raise SecretNotFound(path)

        count = 0
        if versions:
            for v in versions:
                sv = entry.versions.get(v)
                if sv and sv.is_active:
                    sv.soft_delete()
                    count += 1
        else:
            sv = entry.current
            if sv and sv.is_active:
                sv.soft_delete()
                count = 1

        return count

    def undelete(self, path: str, namespace: str = "default", versions: list[int] | None = None) -> int:
        """Restore soft-deleted versions."""
        full_path = self._full_path(namespace, path)
        entry = self._secrets.get(full_path)
        if entry is None:
            raise SecretNotFound(path)

        count = 0
        target_versions = versions or [entry.metadata.current_version]
        for v in target_versions:
            sv = entry.versions.get(v)
            if sv and sv.state == SecretState.DELETED:
                sv.restore()
                count += 1
        return count

    def destroy(self, path: str, namespace: str = "default", versions: list[int] | None = None) -> int:
        """Permanently destroy secret version(s)."""
        full_path = self._full_path(namespace, path)
        entry = self._secrets.get(full_path)
        if entry is None:
            raise SecretNotFound(path)

        count = 0
        if versions:
            for v in versions:
                sv = entry.versions.get(v)
                if sv and sv.state != SecretState.DESTROYED:
                    sv.destroy()
                    count += 1
        else:
            for sv in entry.versions.values():
                if sv.state != SecretState.DESTROYED:
                    sv.destroy()
                    count += 1
        return count

    def list_secrets(self, prefix: str = "", namespace: str = "default") -> list[str]:
        """List secret paths matching a prefix."""
        if namespace not in self._namespaces:
            return []
        paths = sorted(self._namespaces[namespace])
        if prefix:
            paths = [p for p in paths if p.startswith(prefix)]
        return paths

    def list_versions(self, path: str, namespace: str = "default") -> list[dict[str, Any]]:
        """List all versions of a secret."""
        full_path = self._full_path(namespace, path)
        entry = self._secrets.get(full_path)
        if entry is None:
            raise SecretNotFound(path)

        result: list[dict[str, Any]] = []
        for v in sorted(entry.versions.keys()):
            sv = entry.versions[v]
            result.append({
                "version": sv.version,
                "state": sv.state.value,
                "created_at": sv.created_at,
                "deleted_at": sv.deleted_at,
                "destroyed_at": sv.destroyed_at,
            })
        return result

    def get_metadata(self, path: str, namespace: str = "default") -> SecretMetadata:
        """Get metadata for a secret."""
        full_path = self._full_path(namespace, path)
        entry = self._secrets.get(full_path)
        if entry is None:
            raise SecretNotFound(path)
        return entry.metadata

    def update_metadata(
        self,
        path: str,
        namespace: str = "default",
        max_versions: int | None = None,
        cas_required: bool | None = None,
        custom_metadata: dict[str, str] | None = None,
    ) -> SecretMetadata:
        """Update secret metadata."""
        full_path = self._full_path(namespace, path)
        entry = self._secrets.get(full_path)
        if entry is None:
            raise SecretNotFound(path)

        if max_versions is not None:
            entry.metadata.max_versions = max_versions
        if cas_required is not None:
            entry.metadata.cas_required = cas_required
        if custom_metadata is not None:
            entry.metadata.custom_metadata.update(custom_metadata)
        entry.metadata.updated_at = time.time()
        return entry.metadata

    def batch_put(self, items: list[tuple[str, bytes]], namespace: str = "default") -> list[SecretVersion]:
        """Store multiple secrets at once."""
        results: list[SecretVersion] = []
        for path, value in items:
            sv = self.put(path, value, namespace=namespace)
            results.append(sv)
        return results

    def batch_get(self, paths: list[str], namespace: str = "default") -> dict[str, GetResult | None]:
        """Retrieve multiple secrets at once."""
        results: dict[str, GetResult | None] = {}
        for path in paths:
            try:
                results[path] = self.get(path, namespace=namespace)
            except (SecretNotFound, SecretVersionNotFound):
                results[path] = None
        return results

    def create_namespace(self, namespace: str) -> None:
        if namespace in self._namespaces:
            raise VaultError(f"namespace already exists: {namespace}")
        self._namespaces[namespace] = set()

    def delete_namespace(self, namespace: str) -> int:
        """Delete a namespace and all its secrets."""
        if namespace == "default":
            raise VaultError("cannot delete default namespace")
        if namespace not in self._namespaces:
            raise VaultError(f"namespace not found: {namespace}")

        count = 0
        paths = list(self._namespaces[namespace])
        for path in paths:
            full_path = self._full_path(namespace, path)
            if full_path in self._secrets:
                del self._secrets[full_path]
                count += 1
        del self._namespaces[namespace]
        return count

    def list_namespaces(self) -> list[str]:
        return sorted(self._namespaces.keys())

    def count(self, namespace: str | None = None) -> int:
        if namespace:
            return len(self._namespaces.get(namespace, set()))
        return sum(len(paths) for paths in self._namespaces.values())

    def glob(self, pattern: str, namespace: str = "default") -> list[str]:
        """Match secret paths against a glob pattern."""
        if namespace not in self._namespaces:
            return []
        return sorted(
            p for p in self._namespaces[namespace]
            if fnmatch.fnmatch(p, pattern)
        )

    def _ensure_namespace(self, namespace: str) -> None:
        if namespace not in self._namespaces:
            self._namespaces[namespace] = set()

    @staticmethod
    def _full_path(namespace: str, path: str) -> str:
        return f"{namespace}/{path}"

    def migrate_secret(
        self,
        path: str,
        source_namespace: str,
        target_namespace: str,
        delete_source: bool = False,
    ) -> SecretVersion | None:
        """Migrate a secret's current version to another namespace."""
        self._ensure_namespace(target_namespace)
        try:
            result = self.get(path, namespace=source_namespace)
        except (SecretNotFound, SecretVersionNotFound):
            return None
        sv = self.put(path, result.value, namespace=target_namespace)
        if delete_source:
            self.destroy(path, namespace=source_namespace)
        return sv

    def migrate_namespace(self, source: str, target: str, delete_source: bool = False) -> int:
        """Migrate all secrets from one namespace to another."""
        if source not in self._namespaces:
            raise VaultError(f"source namespace not found: {source}")
        self._ensure_namespace(target)
        paths = list(self._namespaces.get(source, set()))
        count = 0
        for path in paths:
            result = self.migrate_secret(path, source, target, delete_source=delete_source)
            if result is not None:
                count += 1
        return count

    def snapshot(self, namespace: str = "default") -> dict[str, bytes]:
        """Create a snapshot of all active secrets in a namespace."""
        result: dict[str, bytes] = {}
        for path in self.list_secrets(namespace=namespace):
            try:
                gr = self.get(path, namespace=namespace)
                result[path] = gr.value
            except (SecretNotFound, SecretVersionNotFound):
                continue
        return result

    def restore(self, snapshot_data: dict[str, bytes], namespace: str = "default") -> int:
        """Restore secrets from a snapshot."""
        self._ensure_namespace(namespace)
        count = 0
        for path, value in snapshot_data.items():
            self.put(path, value, namespace=namespace)
            count += 1
        return count

    def lock_path(self, path: str, namespace: str = "default") -> bool:
        """Lock a path by setting CAS required."""
        full_path = self._full_path(namespace, path)
        entry = self._secrets.get(full_path)
        if entry is None:
            return False
        entry.metadata.cas_required = True
        return True

    def unlock_path(self, path: str, namespace: str = "default") -> bool:
        """Unlock a path by disabling CAS requirement."""
        full_path = self._full_path(namespace, path)
        entry = self._secrets.get(full_path)
        if entry is None:
            return False
        entry.metadata.cas_required = False
        return True

    def is_path_locked(self, path: str, namespace: str = "default") -> bool:
        full_path = self._full_path(namespace, path)
        entry = self._secrets.get(full_path)
        if entry is None:
            return False
        return entry.metadata.cas_required

    def set_expiry(self, path: str, ttl_seconds: float, namespace: str = "default") -> bool:
        """Set an expiry TTL on a secret (stored in custom_metadata)."""
        full_path = self._full_path(namespace, path)
        entry = self._secrets.get(full_path)
        if entry is None:
            return False
        import time as _time
        entry.metadata.custom_metadata["_expiry"] = str(_time.time() + ttl_seconds)
        return True

    def is_expired(self, path: str, namespace: str = "default") -> bool:
        """Check if a secret has expired."""
        full_path = self._full_path(namespace, path)
        entry = self._secrets.get(full_path)
        if entry is None:
            return False
        expiry_str = entry.metadata.custom_metadata.get("_expiry")
        if expiry_str is None:
            return False
        import time as _time
        try:
            return _time.time() >= float(expiry_str)
        except ValueError:
            return False

    def purge_expired(self, namespace: str = "default") -> int:
        """Destroy all expired secrets. Returns count purged."""
        count = 0
        for path in list(self.list_secrets(namespace=namespace)):
            if self.is_expired(path, namespace=namespace):
                self.destroy(path, namespace=namespace)
                count += 1
        return count

    def storage_stats(self, namespace: str | None = None) -> dict[str, Any]:
        """Return storage statistics."""
        if namespace:
            paths = self._namespaces.get(namespace, set())
            total_versions = 0
            active_versions = 0
            total_bytes = 0
            for path in paths:
                full_path = self._full_path(namespace, path)
                entry = self._secrets.get(full_path)
                if entry:
                    total_versions += len(entry.versions)
                    for sv in entry.versions.values():
                        if sv.is_active:
                            active_versions += 1
                            total_bytes += len(sv.value)
            return {
                "namespace": namespace,
                "secret_count": len(paths),
                "total_versions": total_versions,
                "active_versions": active_versions,
                "total_bytes": total_bytes,
            }
        stats: dict[str, Any] = {"namespaces": {}}
        for ns in self._namespaces:
            stats["namespaces"][ns] = self.storage_stats(ns)
        stats["total_secrets"] = self.count()
        stats["total_namespaces"] = len(self._namespaces)
        return stats

    def recursive_delete(self, prefix: str, namespace: str = "default") -> int:
        """Destroy all secrets matching a path prefix."""
        matching = [p for p in self.list_secrets(namespace=namespace) if p.startswith(prefix)]
        count = 0
        for path in matching:
            count += self.destroy(path, namespace=namespace)
        return count


def normalize_path(path: str) -> str:
    """Normalize a secret path: strip slashes, collapse duplicates."""
    parts = [p for p in path.split("/") if p]
    return "/".join(parts)


def split_path(path: str) -> tuple[str, str]:
    """Split a path into (parent, basename)."""
    normalized = normalize_path(path)
    if "/" not in normalized:
        return ("", normalized)
    idx = normalized.rfind("/")
    return (normalized[:idx], normalized[idx + 1:])


def join_path(*parts: str) -> str:
    """Join path components with '/'."""
    return normalize_path("/".join(parts))


def path_depth(path: str) -> int:
    """Return the depth of a normalized path."""
    normalized = normalize_path(path)
    if not normalized:
        return 0
    return normalized.count("/") + 1


def is_child_path(parent: str, child: str) -> bool:
    """Check if child is a direct or indirect child of parent."""
    p = normalize_path(parent)
    c = normalize_path(child)
    if not p:
        return True
    return c.startswith(p + "/")
