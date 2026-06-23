"""Dead-letter queue (DLQ) for FlowQ.

Jobs that exhaust all retries are moved here instead of being silently
dropped. The DLQ supports inspection, replaying individual jobs back
into the main queue, and purging old entries.
"""

from __future__ import annotations

import threading
from datetime import datetime
from typing import Callable, List, Optional

from flowq.models import Job, JobStatus


class DeadLetterEntry:
    """Wrapper that records why a job was dead-lettered."""

    def __init__(self, job: Job, reason: str):
        self.job        = job
        self.reason     = reason
        self.added_at   = datetime.utcnow()
        self.replayed   = False
        self.replayed_at: Optional[datetime] = None

    def to_dict(self) -> dict:
        return {
            "job_id":      self.job.id,
            "job_name":    self.job.name,
            "reason":      self.reason,
            "added_at":    self.added_at.isoformat(),
            "replayed":    self.replayed,
            "replayed_at": self.replayed_at.isoformat() if self.replayed_at else None,
            "retries_used": self.job.retries_used,
            "error":       self.job.error,
        }

    def __repr__(self) -> str:
        return f"DeadLetterEntry(job={self.job.id[:8]}, reason={self.reason!r})"


class DeadLetterQueue:
    """Stores permanently failed jobs and supports replay.

    Thread-safe. Optionally bounded — oldest entries are evicted when
    *max_size* is exceeded to prevent unbounded memory growth.
    """

    def __init__(self, max_size: Optional[int] = 1000,
                 on_add: Optional[Callable[[DeadLetterEntry], None]] = None):
        self._entries: List[DeadLetterEntry] = []
        self._max_size = max_size
        self._on_add   = on_add
        self._lock     = threading.Lock()

    # ------------------------------------------------------------------
    # Writing
    # ------------------------------------------------------------------

    def add(self, job: Job, reason: str) -> DeadLetterEntry:
        """Move *job* into the DLQ with *reason*."""
        entry = DeadLetterEntry(job, reason)
        with self._lock:
            self._entries.append(entry)
            if self._max_size and len(self._entries) > self._max_size:
                self._entries.pop(0)   # evict oldest
        if self._on_add:
            try:
                self._on_add(entry)
            except Exception:
                pass
        return entry

    # ------------------------------------------------------------------
    # Reading
    # ------------------------------------------------------------------

    def all(self) -> List[DeadLetterEntry]:
        with self._lock:
            return list(self._entries)

    def get(self, job_id: str) -> Optional[DeadLetterEntry]:
        with self._lock:
            for e in self._entries:
                if e.job.id == job_id:
                    return e
        return None

    def filter_by_name(self, job_name: str) -> List[DeadLetterEntry]:
        with self._lock:
            return [e for e in self._entries if e.job.name == job_name]

    def not_replayed(self) -> List[DeadLetterEntry]:
        with self._lock:
            return [e for e in self._entries if not e.replayed]

    # ------------------------------------------------------------------
    # Replay
    # ------------------------------------------------------------------

    def replay(self, job_id: str, queue, reset_retries: bool = True) -> bool:
        """Re-enqueue the job for another attempt.

        Args:
            job_id: ID of the dead-lettered job.
            queue: A ``JobQueue`` instance to enqueue into.
            reset_retries: If True, reset retries_used to 0 before replay.

        Returns:
            True if replayed, False if not found or already replayed.
        """
        entry = self.get(job_id)
        if entry is None or entry.replayed:
            return False
        job = entry.job
        if reset_retries:
            job.retries_used = 0
        job.status = JobStatus.PENDING
        job.error  = None
        queue.enqueue(job)
        with self._lock:
            entry.replayed    = True
            entry.replayed_at = datetime.utcnow()
        return True

    def replay_all(self, queue, reset_retries: bool = True) -> int:
        """Replay all non-replayed entries. Returns count replayed."""
        count = 0
        for entry in self.not_replayed():
            if self.replay(entry.job.id, queue, reset_retries):
                count += 1
        return count

    # ------------------------------------------------------------------
    # Maintenance
    # ------------------------------------------------------------------

    def purge_replayed(self) -> int:
        """Remove all already-replayed entries. Returns count removed."""
        with self._lock:
            before = len(self._entries)
            self._entries = [e for e in self._entries if not e.replayed]
            return before - len(self._entries)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._entries)

    def __repr__(self) -> str:
        return f"DeadLetterQueue(size={len(self)}, max={self._max_size})"


# Global singleton
dlq = DeadLetterQueue()
