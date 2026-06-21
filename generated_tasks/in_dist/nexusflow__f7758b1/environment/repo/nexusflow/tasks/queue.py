"""
nexusflow.tasks.queue
~~~~~~~~~~~~~~~~~~~~~

Priority-based task queue with dequeue ordering, deduplication,
and queue management. Supports multiple named queues with independent
configurations.
"""

from __future__ import annotations

import heapq
import threading
import time
import uuid
from collections import defaultdict, deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Tuple


class QueueState(Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    DRAINING = "draining"


@dataclass
class QueueItem:
    """An item in the task queue."""
    item_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    payload: Any = None
    priority: int = 0
    created_at: float = field(default_factory=time.time)
    dequeue_after: Optional[float] = None
    dedup_key: Optional[str] = None
    tags: Set[str] = field(default_factory=set)
    attempts: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __lt__(self, other: "QueueItem") -> bool:
        """Higher priority number = higher priority (dequeued first)."""
        if self.priority != other.priority:
            return self.priority > other.priority
        return self.created_at < other.created_at


class TaskQueue:
    """Priority-based task queue with deduplication support."""

    def __init__(
        self,
        name: str = "default",
        max_size: int = 10000,
        enable_dedup: bool = True,
    ) -> None:
        self.name = name
        self._max_size = max_size
        self._enable_dedup = enable_dedup
        self._heap: List[QueueItem] = []
        self._dedup_set: Set[str] = set()
        self._state = QueueState.ACTIVE
        self._lock = threading.RLock()
        self._stats = {
            "enqueued": 0,
            "dequeued": 0,
            "duplicates_rejected": 0,
            "expired_removed": 0,
        }

    def enqueue(
        self,
        payload: Any,
        priority: int = 0,
        dedup_key: Optional[str] = None,
        delay: Optional[float] = None,
        tags: Optional[Set[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """Add an item to the queue. Returns item_id or None if rejected."""
        with self._lock:
            if self._state == QueueState.DRAINING:
                return None

            if len(self._heap) >= self._max_size:
                return None

            if self._enable_dedup and dedup_key:
                if dedup_key in self._dedup_set:
                    self._stats["duplicates_rejected"] += 1
                    return None
                self._dedup_set.add(dedup_key)

            item = QueueItem(
                payload=payload,
                priority=priority,
                dedup_key=dedup_key,
                dequeue_after=time.time() + delay if delay else None,
                tags=tags or set(),
                metadata=metadata or {},
            )
            heapq.heappush(self._heap, item)
            self._stats["enqueued"] += 1
            return item.item_id

    def dequeue(self) -> Optional[QueueItem]:
        """Remove and return the highest priority item."""
        with self._lock:
            if self._state == QueueState.PAUSED:
                return None

            now = time.time()
            skipped: List[QueueItem] = []

            result = None
            while self._heap:
                item = heapq.heappop(self._heap)
                if item.dequeue_after and item.dequeue_after > now:
                    skipped.append(item)
                    continue
                result = item
                break

            # Put back skipped items
            for item in skipped:
                heapq.heappush(self._heap, item)

            if result:
                self._stats["dequeued"] += 1
                if result.dedup_key:
                    self._dedup_set.discard(result.dedup_key)

            return result

    def peek(self) -> Optional[QueueItem]:
        """Look at the highest priority item without removing it."""
        with self._lock:
            if self._heap:
                return self._heap[0]
            return None

    def size(self) -> int:
        with self._lock:
            return len(self._heap)

    def is_empty(self) -> bool:
        return self.size() == 0

    def pause(self) -> None:
        self._state = QueueState.PAUSED

    def resume(self) -> None:
        self._state = QueueState.ACTIVE

    def drain(self) -> List[QueueItem]:
        """Drain all items from the queue."""
        with self._lock:
            self._state = QueueState.DRAINING
            items = []
            while self._heap:
                items.append(heapq.heappop(self._heap))
            self._dedup_set.clear()
            self._state = QueueState.ACTIVE
            return items

    def remove_by_tag(self, tag: str) -> int:
        """Remove all items with a specific tag."""
        with self._lock:
            original = len(self._heap)
            self._heap = [
                item for item in self._heap
                if tag not in item.tags
            ]
            heapq.heapify(self._heap)
            removed = original - len(self._heap)
            return removed

    def cleanup_expired(self, max_age: float = 3600.0) -> int:
        """Remove items older than max_age seconds."""
        with self._lock:
            cutoff = time.time() - max_age
            original = len(self._heap)
            self._heap = [
                item for item in self._heap
                if item.created_at > cutoff
            ]
            heapq.heapify(self._heap)
            removed = original - len(self._heap)
            self._stats["expired_removed"] += removed
            return removed

    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "name": self.name,
                "size": len(self._heap),
                "state": self._state.value,
                "max_size": self._max_size,
                **self._stats,
            }


class QueueManager:
    """Manages multiple named task queues."""

    def __init__(self) -> None:
        self._queues: Dict[str, TaskQueue] = {}

    def get_queue(
        self,
        name: str = "default",
        create: bool = True,
        **kwargs: Any,
    ) -> Optional[TaskQueue]:
        """Get or create a named queue."""
        if name not in self._queues and create:
            self._queues[name] = TaskQueue(name=name, **kwargs)
        return self._queues.get(name)

    def remove_queue(self, name: str) -> bool:
        if name in self._queues:
            del self._queues[name]
            return True
        return False

    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        return {
            name: queue.get_stats()
            for name, queue in self._queues.items()
        }

    def total_size(self) -> int:
        return sum(q.size() for q in self._queues.values())
