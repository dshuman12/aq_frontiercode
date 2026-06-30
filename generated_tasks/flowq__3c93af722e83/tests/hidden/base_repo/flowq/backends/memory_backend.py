"""In-memory storage backend for FlowQ (useful for testing)."""

from __future__ import annotations

import threading
from typing import Dict, List, Optional

from flowq.backends.base import BaseBackend
from flowq.exceptions import DuplicateJobError, JobNotFoundError
from flowq.models import Job, JobStatus


class MemoryBackend(BaseBackend):
    """Pure in-memory backend. Data is lost when the process exits.

    Suitable for unit tests, ephemeral workers, and embedded use cases
    where durability is not required.
    """

    def __init__(self):
        self._store: Dict[str, Job] = {}
        self._lock = threading.RLock()

    def save(self, job: Job) -> None:
        with self._lock:
            if job.id in self._store:
                raise DuplicateJobError(job.id)
            self._store[job.id] = job

    def fetch(self, job_id: str) -> Job:
        with self._lock:
            if job_id not in self._store:
                raise JobNotFoundError(job_id)
            return self._store[job_id]

    def update(self, job: Job) -> None:
        with self._lock:
            if job.id not in self._store:
                raise JobNotFoundError(job.id)
            self._store[job.id] = job

    def delete(self, job_id: str) -> None:
        with self._lock:
            if job_id not in self._store:
                raise JobNotFoundError(job_id)
            del self._store[job_id]

    def list_jobs(self, status: Optional[JobStatus] = None,
                  limit: int = 100, offset: int = 0) -> List[Job]:
        with self._lock:
            jobs = sorted(self._store.values(),
                          key=lambda j: (-j.priority.value, j.created_at))
            if status:
                jobs = [j for j in jobs if j.status == status]
            return jobs[offset : offset + limit]

    def search_by_tag(self, tag: str) -> List[Job]:
        with self._lock:
            return [j for j in self._store.values() if tag in j.tags]

    def count_by_status(self) -> Dict[str, int]:
        with self._lock:
            counts: Dict[str, int] = {}
            for job in self._store.values():
                counts[job.status.value] = counts.get(job.status.value, 0) + 1
            return counts

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._store)

    def __repr__(self) -> str:
        return f"MemoryBackend(jobs={len(self)})"
