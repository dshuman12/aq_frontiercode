"""Key and secret rotation management."""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

from vaultkey.crypto.random import generate_id
from vaultkey.utils.errors import RotationError, VaultError


class RotationState(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


@dataclass
class RotationPolicy:
    """Defines when and how rotation should occur."""
    policy_id: str
    path_pattern: str
    rotation_interval: float
    grace_period: float = 3600.0
    max_versions: int = 5
    auto_rotate: bool = True
    notify_before: float = 86400.0
    created_at: float = field(default_factory=time.time)

    def is_due(self, last_rotation: float, now: float | None = None) -> bool:
        now = now or time.time()
        return (now - last_rotation) >= self.rotation_interval

    def in_grace_period(self, rotation_time: float, now: float | None = None) -> bool:
        now = now or time.time()
        return (now - rotation_time) <= self.grace_period

    def needs_notification(self, last_rotation: float, now: float | None = None) -> bool:
        now = now or time.time()
        time_until_due = self.rotation_interval - (now - last_rotation)
        return 0 < time_until_due <= self.notify_before

    def to_dict(self) -> dict[str, Any]:
        return {
            "policy_id": self.policy_id,
            "path_pattern": self.path_pattern,
            "rotation_interval": self.rotation_interval,
            "grace_period": self.grace_period,
            "max_versions": self.max_versions,
            "auto_rotate": self.auto_rotate,
            "notify_before": self.notify_before,
        }


@dataclass
class RotationRecord:
    """Record of a single rotation event."""
    record_id: str
    path: str
    old_version: int
    new_version: int
    policy_id: str | None
    state: RotationState
    started_at: float = field(default_factory=time.time)
    completed_at: float | None = None
    error: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def complete(self) -> None:
        self.state = RotationState.COMPLETED
        self.completed_at = time.time()

    def fail(self, error: str) -> None:
        self.state = RotationState.FAILED
        self.error = error
        self.completed_at = time.time()

    def rollback(self) -> None:
        self.state = RotationState.ROLLED_BACK
        self.completed_at = time.time()

    def to_dict(self) -> dict[str, Any]:
        return {
            "record_id": self.record_id,
            "path": self.path,
            "old_version": self.old_version,
            "new_version": self.new_version,
            "policy_id": self.policy_id,
            "state": self.state.value,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "error": self.error,
        }


class RotationManager:
    """Manages rotation of keys and secrets."""

    def __init__(self) -> None:
        self._policies: dict[str, RotationPolicy] = {}
        self._history: dict[str, list[RotationRecord]] = {}
        self._last_rotation: dict[str, float] = {}
        self._active_rotations: dict[str, RotationRecord] = {}
        self._callbacks: list[Callable[[RotationRecord], None]] = []
        self._key_cache: dict[str, Any] = {}

    def add_policy(self, policy: RotationPolicy) -> None:
        self._policies[policy.policy_id] = policy

    def remove_policy(self, policy_id: str) -> bool:
        return self._policies.pop(policy_id, None) is not None

    def get_policy(self, policy_id: str) -> RotationPolicy | None:
        return self._policies.get(policy_id)

    def list_policies(self) -> list[RotationPolicy]:
        return list(self._policies.values())

    def register_callback(self, callback: Callable[[RotationRecord], None]) -> None:
        self._callbacks.append(callback)

    def start_rotation(
        self,
        path: str,
        old_version: int,
        new_version: int,
        policy_id: str | None = None,
    ) -> RotationRecord:
        """Begin a rotation operation."""
        if path in self._active_rotations:
            raise RotationError(f"rotation already in progress for: {path}")

        record = RotationRecord(
            record_id=generate_id("rot"),
            path=path,
            old_version=old_version,
            new_version=new_version,
            policy_id=policy_id,
            state=RotationState.IN_PROGRESS,
        )

        self._active_rotations[path] = record
        return record

    def complete_rotation(self, path: str) -> RotationRecord:
        """Mark a rotation as completed."""
        record = self._active_rotations.get(path)
        if record is None:
            raise RotationError(f"no active rotation for: {path}")

        record.complete()
        self._last_rotation[path] = time.time()

        if path not in self._history:
            self._history[path] = []
        self._history[path].append(record)

        del self._active_rotations[path]

        self._invalidate_cached_keys(path)

        for callback in self._callbacks:
            try:
                callback(record)
            except Exception:
                pass

        return record

    def fail_rotation(self, path: str, error: str) -> RotationRecord:
        """Mark a rotation as failed."""
        record = self._active_rotations.get(path)
        if record is None:
            raise RotationError(f"no active rotation for: {path}")

        record.fail(error)

        if path not in self._history:
            self._history[path] = []
        self._history[path].append(record)

        del self._active_rotations[path]
        return record

    def rollback_rotation(self, path: str) -> RotationRecord:
        """Roll back an active rotation."""
        record = self._active_rotations.get(path)
        if record is None:
            raise RotationError(f"no active rotation for: {path}")

        record.rollback()

        if path not in self._history:
            self._history[path] = []
        self._history[path].append(record)

        del self._active_rotations[path]
        return record

    def get_history(self, path: str) -> list[RotationRecord]:
        return list(self._history.get(path, []))

    def get_last_rotation_time(self, path: str) -> float | None:
        return self._last_rotation.get(path)

    def paths_due_for_rotation(self, now: float | None = None) -> list[tuple[str, RotationPolicy]]:
        """Find paths that are due for rotation based on their policies."""
        now = now or time.time()
        due: list[tuple[str, RotationPolicy]] = []

        for policy in self._policies.values():
            for path, last_time in self._last_rotation.items():
                if self._path_matches_policy(path, policy):
                    if policy.is_due(last_time, now):
                        due.append((path, policy))

        return due

    def is_in_grace_period(self, path: str, policy_id: str | None = None) -> bool:
        """Check if a path is within the grace period after rotation."""
        last_time = self._last_rotation.get(path)
        if last_time is None:
            return False

        if policy_id:
            policy = self._policies.get(policy_id)
            if policy:
                return policy.in_grace_period(last_time)

        for policy in self._policies.values():
            if self._path_matches_policy(path, policy):
                if policy.in_grace_period(last_time):
                    return True
        return False

    def cache_key(self, path: str, key_data: Any) -> None:
        """Cache a key for a given path."""
        self._key_cache[path] = key_data

    def get_cached_key(self, path: str) -> Any | None:
        return self._key_cache.get(path)

    def _invalidate_cached_keys(self, path: str) -> None:
        """Invalidate cached keys for a path after rotation."""
        self._key_cache.pop(path, None)

    def invalidate_all_caches(self) -> None:
        self._key_cache.clear()

    def active_rotation_count(self) -> int:
        return len(self._active_rotations)

    def total_rotations(self, path: str | None = None) -> int:
        if path:
            return len(self._history.get(path, []))
        return sum(len(records) for records in self._history.values())

    def set_last_rotation_time(self, path: str, ts: float) -> None:
        self._last_rotation[path] = ts

    @staticmethod
    def _path_matches_policy(path: str, policy: RotationPolicy) -> bool:
        import fnmatch
        return fnmatch.fnmatch(path, policy.path_pattern)


@dataclass
class ScheduledRotation:
    """A scheduled rotation event."""
    schedule_id: str
    path: str
    policy_id: str
    next_rotation_at: float
    enabled: bool = True
    last_executed_at: float | None = None
    execution_count: int = 0

    @property
    def is_due(self) -> bool:
        return self.enabled and time.time() >= self.next_rotation_at


class ScheduledRotationExecutor:
    """Executes scheduled rotations against a RotationManager."""

    def __init__(self, manager: RotationManager) -> None:
        self._manager = manager
        self._schedules: dict[str, ScheduledRotation] = {}

    def add_schedule(
        self,
        path: str,
        policy_id: str,
        interval: float,
        start_at: float | None = None,
    ) -> ScheduledRotation:
        schedule_id = generate_id("sched")
        sched = ScheduledRotation(
            schedule_id=schedule_id,
            path=path,
            policy_id=policy_id,
            next_rotation_at=start_at or (time.time() + interval),
        )
        self._schedules[schedule_id] = sched
        return sched

    def remove_schedule(self, schedule_id: str) -> bool:
        return self._schedules.pop(schedule_id, None) is not None

    def get_due_schedules(self) -> list[ScheduledRotation]:
        return [s for s in self._schedules.values() if s.is_due]

    def execute_due(self, version_provider: Callable[[str], tuple[int, int]]) -> list[RotationRecord]:
        """Execute all due rotations. version_provider(path) -> (old_version, new_version)."""
        records: list[RotationRecord] = []
        for sched in self.get_due_schedules():
            try:
                old_v, new_v = version_provider(sched.path)
                record = self._manager.start_rotation(
                    sched.path, old_v, new_v, policy_id=sched.policy_id,
                )
                self._manager.complete_rotation(sched.path)
                sched.last_executed_at = time.time()
                sched.execution_count += 1
                policy = self._manager.get_policy(sched.policy_id)
                interval = policy.rotation_interval if policy else 86400.0
                sched.next_rotation_at = time.time() + interval
                records.append(record)
            except RotationError:
                continue
        return records

    def list_schedules(self) -> list[ScheduledRotation]:
        return list(self._schedules.values())

    @property
    def schedule_count(self) -> int:
        return len(self._schedules)


class RotationConflictResolver:
    """Detects and resolves rotation conflicts."""

    def __init__(self, manager: RotationManager) -> None:
        self._manager = manager
        self._conflict_log: list[dict[str, Any]] = []

    def check_conflict(self, path: str) -> bool:
        """Check if there is an active rotation conflict for a path."""
        return path in self._manager._active_rotations

    def resolve_by_priority(self, path: str, new_version: int) -> RotationRecord | None:
        """Resolve a conflict by completing the existing rotation."""
        if not self.check_conflict(path):
            return None
        self._conflict_log.append({
            "path": path,
            "resolution": "force_complete",
            "timestamp": time.time(),
        })
        try:
            return self._manager.complete_rotation(path)
        except RotationError:
            return self._manager.fail_rotation(path, "conflict resolution forced completion")

    def resolve_by_rollback(self, path: str) -> RotationRecord | None:
        """Resolve a conflict by rolling back the active rotation."""
        if not self.check_conflict(path):
            return None
        self._conflict_log.append({
            "path": path,
            "resolution": "rollback",
            "timestamp": time.time(),
        })
        try:
            return self._manager.rollback_rotation(path)
        except RotationError:
            return None

    @property
    def conflict_count(self) -> int:
        return len(self._conflict_log)

    def get_conflict_log(self) -> list[dict[str, Any]]:
        return list(self._conflict_log)


@dataclass
class RotationAuditEntry:
    """An auditable record of a rotation event."""
    entry_id: str
    record: RotationRecord
    audited_at: float = field(default_factory=time.time)
    auditor: str = ""
    notes: str = ""


class RotationAuditor:
    """Auditing system for rotation events."""

    def __init__(self) -> None:
        self._entries: list[RotationAuditEntry] = []

    def audit(self, record: RotationRecord, auditor: str = "", notes: str = "") -> RotationAuditEntry:
        entry = RotationAuditEntry(
            entry_id=generate_id("raud"),
            record=record,
            auditor=auditor,
            notes=notes,
        )
        self._entries.append(entry)
        return entry

    def get_entries(
        self,
        path: str | None = None,
        state: RotationState | None = None,
        since: float = 0,
    ) -> list[RotationAuditEntry]:
        results = self._entries
        if path:
            results = [e for e in results if e.record.path == path]
        if state:
            results = [e for e in results if e.record.state == state]
        if since:
            results = [e for e in results if e.audited_at >= since]
        return results

    @property
    def total_entries(self) -> int:
        return len(self._entries)

    def clear(self) -> None:
        self._entries.clear()


class RotationAnalytics:
    """Computes analytics from rotation history."""

    def __init__(self, manager: RotationManager) -> None:
        self._manager = manager

    def success_rate(self, path: str | None = None) -> float:
        """Calculate the rotation success rate (0.0 to 1.0)."""
        if path:
            records = self._manager.get_history(path)
        else:
            records = []
            for p in list(self._manager._history.keys()):
                records.extend(self._manager.get_history(p))
        if not records:
            return 0.0
        successes = sum(1 for r in records if r.state == RotationState.COMPLETED)
        return successes / len(records)

    def average_duration(self, path: str | None = None) -> float:
        """Average rotation duration in seconds."""
        if path:
            records = self._manager.get_history(path)
        else:
            records = []
            for p in list(self._manager._history.keys()):
                records.extend(self._manager.get_history(p))
        durations = [
            r.completed_at - r.started_at
            for r in records
            if r.completed_at is not None
        ]
        return sum(durations) / len(durations) if durations else 0.0

    def failure_reasons(self, path: str | None = None) -> dict[str, int]:
        """Count failure reasons."""
        if path:
            records = self._manager.get_history(path)
        else:
            records = []
            for p in list(self._manager._history.keys()):
                records.extend(self._manager.get_history(p))
        reasons: dict[str, int] = {}
        for r in records:
            if r.state == RotationState.FAILED and r.error:
                reasons[r.error] = reasons.get(r.error, 0) + 1
        return reasons

    def rotation_count_by_state(self) -> dict[str, int]:
        """Count rotations grouped by state."""
        counts: dict[str, int] = {}
        for records in self._manager._history.values():
            for r in records:
                state = r.state.value
                counts[state] = counts.get(state, 0) + 1
        return counts

    def most_rotated_paths(self, limit: int = 10) -> list[tuple[str, int]]:
        """Return paths with the most rotations."""
        path_counts = [(p, len(records)) for p, records in self._manager._history.items()]
        path_counts.sort(key=lambda x: x[1], reverse=True)
        return path_counts[:limit]


class BatchRotation:
    """Rotate multiple paths in a single operation."""

    def __init__(self, manager: RotationManager) -> None:
        self._manager = manager

    def rotate_batch(
        self,
        items: list[tuple[str, int, int]],
        policy_id: str | None = None,
    ) -> list[RotationRecord]:
        """Rotate multiple paths. Each item is (path, old_version, new_version)."""
        records: list[RotationRecord] = []
        for path, old_v, new_v in items:
            try:
                record = self._manager.start_rotation(path, old_v, new_v, policy_id=policy_id)
                self._manager.complete_rotation(path)
                records.append(record)
            except RotationError as e:
                error_record = RotationRecord(
                    record_id=generate_id("rot"),
                    path=path,
                    old_version=old_v,
                    new_version=new_v,
                    policy_id=policy_id,
                    state=RotationState.FAILED,
                    error=str(e),
                )
                error_record.completed_at = time.time()
                records.append(error_record)
        return records

    def dry_run(self, items: list[tuple[str, int, int]]) -> list[dict[str, Any]]:
        """Preview what a batch rotation would do without executing."""
        previews: list[dict[str, Any]] = []
        for path, old_v, new_v in items:
            has_conflict = path in self._manager._active_rotations
            previews.append({
                "path": path,
                "old_version": old_v,
                "new_version": new_v,
                "has_conflict": has_conflict,
                "would_succeed": not has_conflict,
            })
        return previews
