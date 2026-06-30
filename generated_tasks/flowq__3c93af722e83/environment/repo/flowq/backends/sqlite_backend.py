"""SQLite storage backend for FlowQ."""

from __future__ import annotations

from flowq.storage import Storage
from flowq.backends.base import BaseBackend
from flowq.models import Job, JobStatus
from typing import Dict, List, Optional


class SQLiteBackend(BaseBackend):
    """Wraps the built-in ``Storage`` class as a ``BaseBackend``.

    This adapter lets the SQLite store be used interchangeably with any
    other backend implementation.
    """

    def __init__(self, db_path: str = ":memory:"):
        self._storage = Storage(db_path)

    def save(self, job: Job) -> None:
        self._storage.save(job)

    def fetch(self, job_id: str) -> Job:
        return self._storage.fetch(job_id)

    def update(self, job: Job) -> None:
        self._storage.update(job)

    def delete(self, job_id: str) -> None:
        self._storage.delete(job_id)

    def list_jobs(self, status: Optional[JobStatus] = None,
                  limit: int = 100, offset: int = 0) -> List[Job]:
        return self._storage.list_jobs(status=status, limit=limit, offset=offset)

    def search_by_tag(self, tag: str) -> List[Job]:
        return self._storage.search_by_tag(tag)

    def count_by_status(self) -> Dict[str, int]:
        return self._storage.count_by_status()

    def health_check(self) -> bool:
        try:
            self._storage.count_by_status()
            return True
        except Exception:
            return False

    def __repr__(self) -> str:
        return f"SQLiteBackend(db={self._storage._db_path!r})"
