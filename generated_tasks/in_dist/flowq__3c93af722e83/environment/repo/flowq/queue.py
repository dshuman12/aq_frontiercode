"""In-memory priority queue for FlowQ jobs."""

from __future__ import annotations

import heapq
import threading
from typing import List, Optional

from flowq.exceptions import DuplicateJobError, JobNotFoundError, QueueFullError
from flowq.models import Job, JobStatus


class JobQueue:
    """Thread-safe, priority-ordered job queue.

    Higher priority value = dequeued first.
    Equal-priority jobs are served FIFO by creation time.
    """

    def __init__(self, capacity: Optional[int] = None):
        self._capacity = capacity
        self._lock = threading.Lock()
        self._heap: List[tuple] = []   # (-priority, timestamp, job)
        self._id_set: set = set()


    def enqueue(self, job: Job) -> None:
        """Add *job* respecting capacity and uniqueness constraints."""
        with self._lock:
            if self._capacity is not None and len(self._heap) >= self._capacity:
                raise QueueFullError(self._capacity)
            if job.id in self._id_set:
                raise DuplicateJobError(job.id)
            heapq.heappush(self._heap, (-job.priority.value, job.created_at.timestamp(), job))
            self._id_set.add(job.id)

    def dequeue(self) -> Optional[Job]:
        """Remove and return the highest-priority PENDING job, or None."""
        with self._lock:
            while self._heap:
                _, _, job = heapq.heappop(self._heap)
                self._id_set.discard(job.id)
                if job.status == JobStatus.PENDING:
                    return job
            return None


    def peek(self) -> Optional[Job]:
        """Return the next job without removing it."""
        with self._lock:
            for entry in sorted(self._heap):
                job = entry[2]
                if job.status == JobStatus.PENDING:
                    return job
            return None

    def cancel(self, job_id: str) -> Job:
        """Mark a queued job CANCELLED (stays in heap until dequeued)."""
        with self._lock:
            for _, _, job in self._heap:
                if job.id == job_id:
                    job.mark_cancelled()
                    return job
            raise JobNotFoundError(job_id)


    def filter_by_status(self, status: JobStatus) -> List[Job]:
        with self._lock:
            return [job for _, _, job in self._heap if job.status == status]

    def filter_by_tag(self, tag: str) -> List[Job]:
        with self._lock:
            return [job for _, _, job in self._heap if tag in job.tags]

    def stats(self) -> dict:
        with self._lock:
            counts: dict = {}
            for _, _, job in self._heap:
                counts[job.status.value] = counts.get(job.status.value, 0) + 1
            return counts

    def __len__(self) -> int:
        with self._lock:
            return len(self._heap)

    def __contains__(self, job_id: str) -> bool:
        with self._lock:
            return job_id in self._id_set

    def __repr__(self) -> str:
        return f"JobQueue(size={len(self)}, capacity={self._capacity})"


__all__ = ["JobQueue"]
