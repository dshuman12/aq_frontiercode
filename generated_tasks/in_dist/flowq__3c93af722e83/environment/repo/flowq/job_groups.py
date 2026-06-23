"""
Job group (batch) management for FlowQ.

A JobGroup collects multiple jobs under a single logical unit, so you can:
  • submit them all at once
  • poll overall completion
  • get aggregated statistics

Example::

    group = JobGroup("nightly_reports", queue, storage)
    group.add("send_email",  {"to": "a@b.com"}, priority=Priority.HIGH)
    group.add("update_cache", {})
    group.submit_all()

    while not group.is_complete():
        time.sleep(1)

    print(group.stats())
"""

from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

from flowq.models import Job, JobStatus, Priority
from flowq.exceptions import FlowQError


class JobGroupError(FlowQError):
    pass


@dataclass
class GroupStats:
    total: int
    pending: int
    running: int
    success: int
    failed: int
    cancelled: int
    retrying: int

    @property
    def complete(self) -> bool:
        return self.pending == 0 and self.running == 0 and self.retrying == 0

    @property
    def success_rate(self) -> float:
        terminal = self.success + self.failed + self.cancelled
        if terminal == 0:
            return 0.0
        return self.success / terminal

    def to_dict(self) -> dict:
        return {
            "total": self.total,
            "pending": self.pending,
            "running": self.running,
            "success": self.success,
            "failed": self.failed,
            "cancelled": self.cancelled,
            "retrying": self.retrying,
            "complete": self.complete,
            "success_rate": round(self.success_rate, 4),
        }


class JobGroup:
    """
    A named collection of jobs submitted and tracked together.

    Parameters
    ----------
    name:
        Logical group name (not required to be unique).
    queue:
        FlowQ JobQueue instance for submission.
    storage:
        FlowQ Storage instance for status polling.
    max_failures:
        If more than this many jobs fail, ``is_failed`` returns True.
        Set to None to never short-circuit on failures.
    """

    def __init__(
        self,
        name: str,
        queue,
        storage,
        max_failures: Optional[int] = None,
    ) -> None:
        self.name = name
        self.id = str(uuid.uuid4())
        self._queue = queue
        self._storage = storage
        self._max_failures = max_failures
        self._jobs: list[Job] = []
        self._submitted = False
        self._lock = threading.Lock()

    # ── building ─────────────────────────────────────────────────────────────

    def add(
        self,
        handler_name: str,
        payload: Optional[dict] = None,
        priority: Priority = Priority.NORMAL,
        max_retries: int = 0,
        timeout: Optional[float] = None,
        tags: Optional[list[str]] = None,
    ) -> Job:
        """Create and stage a job (not yet submitted to the queue)."""
        if self._submitted:
            raise JobGroupError("Cannot add jobs after group has been submitted")
        job = Job(
            name=handler_name,
            payload=payload or {},
            priority=priority,
            max_retries=max_retries,
            timeout=timeout,
            tags=(tags or []) + [f"group:{self.id}"],
        )
        with self._lock:
            self._jobs.append(job)
        return job

    def submit_all(self) -> int:
        """Persist all staged jobs and enqueue them. Returns count submitted."""
        with self._lock:
            if self._submitted:
                raise JobGroupError("Group already submitted")
            self._submitted = True
            jobs = list(self._jobs)

        count = 0
        for job in jobs:
            try:
                self._storage.save(job)
                self._queue.enqueue(job)
                count += 1
            except Exception:
                pass
        return count

    # ── querying ─────────────────────────────────────────────────────────────

    def stats(self) -> GroupStats:
        """Fetch current status of every job in the group from storage."""
        counts = {s: 0 for s in JobStatus}
        with self._lock:
            job_ids = [j.id for j in self._jobs]

        for jid in job_ids:
            try:
                job = self._storage.fetch(jid)
                counts[job.status] += 1
            except Exception:
                counts[JobStatus.PENDING] += 1

        return GroupStats(
            total=len(job_ids),
            pending=counts[JobStatus.PENDING],
            running=counts[JobStatus.RUNNING],
            success=counts[JobStatus.SUCCESS],
            failed=counts[JobStatus.FAILED],
            cancelled=counts[JobStatus.CANCELLED],
            retrying=counts[JobStatus.RETRYING],
        )

    def is_complete(self) -> bool:
        return self.stats().complete

    def is_failed(self) -> bool:
        if self._max_failures is None:
            return False
        return self.stats().failed > self._max_failures

    def wait(self, poll_interval: float = 0.5, timeout: Optional[float] = None) -> GroupStats:
        """Block until all jobs are terminal (or timeout expires)."""
        deadline = time.time() + timeout if timeout else None
        while True:
            s = self.stats()
            if s.complete:
                return s
            if deadline and time.time() > deadline:
                return s
            time.sleep(poll_interval)

    def cancel_pending(self) -> int:
        """Cancel all still-PENDING jobs in this group. Returns count cancelled."""
        cancelled = 0
        with self._lock:
            jobs = list(self._jobs)
        for job in jobs:
            try:
                fetched = self._storage.fetch(job.id)
                if fetched.status == JobStatus.PENDING:
                    self._queue.cancel(job.id)
                    cancelled += 1
            except Exception:
                pass
        return cancelled

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "submitted": self._submitted,
            "job_count": len(self._jobs),
            "stats": self.stats().to_dict() if self._submitted else None,
        }

    def __len__(self) -> int:
        return len(self._jobs)

    def __repr__(self) -> str:
        return f"JobGroup(name={self.name!r}, jobs={len(self._jobs)}, submitted={self._submitted})"
