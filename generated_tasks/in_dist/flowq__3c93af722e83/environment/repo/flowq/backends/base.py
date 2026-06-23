"""Abstract base class for FlowQ storage backends."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict, List, Optional

from flowq.models import Job, JobStatus


class BaseBackend(ABC):
    """Interface that every FlowQ storage backend must implement."""

    @abstractmethod
    def save(self, job: Job) -> None:
        """Persist a new job. Must raise DuplicateJobError if ID exists."""

    @abstractmethod
    def fetch(self, job_id: str) -> Job:
        """Return Job by ID. Must raise JobNotFoundError if missing."""

    @abstractmethod
    def update(self, job: Job) -> None:
        """Overwrite mutable fields. Must raise JobNotFoundError if missing."""

    @abstractmethod
    def delete(self, job_id: str) -> None:
        """Remove job record. Must raise JobNotFoundError if missing."""

    @abstractmethod
    def list_jobs(self, status: Optional[JobStatus] = None,
                  limit: int = 100, offset: int = 0) -> List[Job]:
        """List jobs, optionally filtered by status."""

    @abstractmethod
    def search_by_tag(self, tag: str) -> List[Job]:
        """Return all jobs whose tags include *tag*."""

    @abstractmethod
    def count_by_status(self) -> Dict[str, int]:
        """Return {status_value: count} for all statuses present."""

    def bulk_save(self, jobs: List[Job]) -> None:
        """Save multiple jobs. Default: iterate save(); backends may override."""
        for job in jobs:
            self.save(job)

    def health_check(self) -> bool:
        """Return True if the backend is reachable. Default: always True."""
        return True
