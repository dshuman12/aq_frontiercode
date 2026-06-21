"""
nexusflow.tasks.deadletter
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Dead letter queue for tasks that have permanently failed. Supports
inspection, requeue, and purge operations.

BUG CANDIDATE #14: When max_retries is set to 0, the dead letter
queue enters a requeue loop. The code treats 0 as "unlimited retries"
(confusing 0 with None sentinel), causing failed tasks to be
continuously requeued instead of staying dead.
"""

from __future__ import annotations

import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Set


@dataclass
class DeadLetterEntry:
    """A failed task entry in the dead letter queue."""
    entry_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str = ""
    task_name: str = ""
    payload: Any = None
    error: str = ""
    error_type: str = ""
    failed_at: float = field(default_factory=time.time)
    attempts: int = 0
    max_retries: Optional[int] = None
    original_queue: str = "default"
    metadata: Dict[str, Any] = field(default_factory=dict)
    requeue_count: int = 0
    tags: Set[str] = field(default_factory=set)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entry_id": self.entry_id,
            "task_id": self.task_id,
            "task_name": self.task_name,
            "error": self.error,
            "error_type": self.error_type,
            "failed_at": self.failed_at,
            "attempts": self.attempts,
            "max_retries": self.max_retries,
            "original_queue": self.original_queue,
            "requeue_count": self.requeue_count,
        }


class DeadLetterQueue:
    """
    Dead letter queue for permanently failed tasks.

    BUG CANDIDATE #14: The can_requeue method treats max_retries=0
    as "no limit" instead of "never retry", because it checks
    `if not entry.max_retries` which is True for both None AND 0.
    This causes tasks with max_retries=0 to be requeued indefinitely.
    """

    def __init__(
        self,
        max_size: int = 10000,
        retention_hours: float = 168.0,  # 7 days
    ) -> None:
        self._entries: Dict[str, DeadLetterEntry] = {}
        self._max_size = max_size
        self._retention_hours = retention_hours
        self._on_add_hooks: List[Callable[[DeadLetterEntry], None]] = []
        self._on_requeue_hooks: List[Callable[[DeadLetterEntry], None]] = []
        self._stats = {
            "total_added": 0,
            "total_requeued": 0,
            "total_purged": 0,
        }

    def add(
        self,
        task_id: str,
        task_name: str,
        payload: Any,
        error: str,
        error_type: str = "",
        attempts: int = 0,
        max_retries: Optional[int] = None,
        original_queue: str = "default",
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[Set[str]] = None,
    ) -> str:
        """Add a failed task to the dead letter queue."""
        if len(self._entries) >= self._max_size:
            self._evict_oldest()

        entry = DeadLetterEntry(
            task_id=task_id,
            task_name=task_name,
            payload=payload,
            error=error,
            error_type=error_type or type(Exception).__name__,
            attempts=attempts,
            max_retries=max_retries,
            original_queue=original_queue,
            metadata=metadata or {},
            tags=tags or set(),
        )
        self._entries[entry.entry_id] = entry
        self._stats["total_added"] += 1

        for hook in self._on_add_hooks:
            try:
                hook(entry)
            except Exception:
                pass

        return entry.entry_id

    def get(self, entry_id: str) -> Optional[DeadLetterEntry]:
        """Get a dead letter entry by ID."""
        return self._entries.get(entry_id)

    def get_by_task(self, task_id: str) -> List[DeadLetterEntry]:
        """Get all entries for a task ID."""
        return [e for e in self._entries.values() if e.task_id == task_id]

    def get_by_error_type(self, error_type: str) -> List[DeadLetterEntry]:
        """Get all entries with a specific error type."""
        return [e for e in self._entries.values() if e.error_type == error_type]

    def get_all(
        self,
        limit: int = 100,
        offset: int = 0,
        tag: Optional[str] = None,
    ) -> List[DeadLetterEntry]:
        """Get entries with pagination and optional tag filter."""
        entries = list(self._entries.values())
        if tag:
            entries = [e for e in entries if tag in e.tags]
        entries.sort(key=lambda e: e.failed_at, reverse=True)
        return entries[offset: offset + limit]

    def can_requeue(self, entry: DeadLetterEntry) -> bool:
        """
        Check if an entry can be requeued.

        BUG CANDIDATE #14: Uses `if not entry.max_retries` which
        treats 0 the same as None. When max_retries=0, this returns
        True (meaning "requeue allowed") instead of False.
        The correct check should be `if entry.max_retries is None`.
        """
        # BUG: `not 0` is True, so max_retries=0 falls through
        # to return True, allowing infinite requeues
        if not entry.max_retries:  # BUG: should be `is None`
            return True  # Treats 0 and None the same

        return entry.requeue_count < entry.max_retries

    def requeue(self, entry_id: str) -> Optional[Dict[str, Any]]:
        """
        Prepare a dead letter entry for re-processing.

        Returns the requeue payload or None if not allowed.
        """
        entry = self._entries.get(entry_id)
        if entry is None:
            return None

        if not self.can_requeue(entry):
            return None

        entry.requeue_count += 1
        self._stats["total_requeued"] += 1

        for hook in self._on_requeue_hooks:
            try:
                hook(entry)
            except Exception:
                pass

        return {
            "task_id": entry.task_id,
            "task_name": entry.task_name,
            "payload": entry.payload,
            "original_queue": entry.original_queue,
            "metadata": {
                **entry.metadata,
                "requeued_from_dlq": True,
                "requeue_count": entry.requeue_count,
                "original_error": entry.error,
            },
        }

    def requeue_all(self, filter_fn: Optional[Callable[[DeadLetterEntry], bool]] = None) -> List[Dict[str, Any]]:
        """Requeue all eligible entries."""
        results: List[Dict[str, Any]] = []
        for entry_id, entry in list(self._entries.items()):
            if filter_fn and not filter_fn(entry):
                continue
            result = self.requeue(entry_id)
            if result:
                results.append(result)
        return results

    def remove(self, entry_id: str) -> bool:
        """Remove an entry from the dead letter queue."""
        if entry_id in self._entries:
            del self._entries[entry_id]
            return True
        return False

    def purge(self, older_than_hours: Optional[float] = None) -> int:
        """Purge old entries. Returns count of removed entries."""
        cutoff_hours = older_than_hours or self._retention_hours
        cutoff_time = time.time() - (cutoff_hours * 3600)
        to_remove = [
            eid for eid, entry in self._entries.items()
            if entry.failed_at < cutoff_time
        ]
        for eid in to_remove:
            del self._entries[eid]
        self._stats["total_purged"] += len(to_remove)
        return len(to_remove)

    def _evict_oldest(self) -> None:
        """Evict the oldest entry to make room."""
        if not self._entries:
            return
        oldest_id = min(
            self._entries,
            key=lambda eid: self._entries[eid].failed_at,
        )
        del self._entries[oldest_id]

    def on_add(self, callback: Callable[[DeadLetterEntry], None]) -> None:
        self._on_add_hooks.append(callback)

    def on_requeue(self, callback: Callable[[DeadLetterEntry], None]) -> None:
        self._on_requeue_hooks.append(callback)

    def size(self) -> int:
        return len(self._entries)

    def get_stats(self) -> Dict[str, Any]:
        error_counts: Dict[str, int] = defaultdict(int)
        for entry in self._entries.values():
            error_counts[entry.error_type] += 1
        return {
            "size": len(self._entries),
            "max_size": self._max_size,
            "error_types": dict(error_counts),
            **self._stats,
        }
