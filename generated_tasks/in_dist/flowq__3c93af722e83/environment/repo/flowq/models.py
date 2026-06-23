"""Core data models for FlowQ."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from flowq.exceptions import InvalidStatusTransitionError


class JobStatus(str, Enum):
    PENDING   = "pending"
    RUNNING   = "running"
    SUCCESS   = "success"
    FAILED    = "failed"
    RETRYING  = "retrying"
    CANCELLED = "cancelled"


class Priority(int, Enum):
    LOW      = 1
    NORMAL   = 5
    HIGH     = 10
    CRITICAL = 20


# Allowed status transitions
_TRANSITIONS: Dict[JobStatus, set] = {
    JobStatus.PENDING:   {JobStatus.RUNNING, JobStatus.CANCELLED},
    JobStatus.RUNNING:   {JobStatus.SUCCESS, JobStatus.FAILED, JobStatus.RETRYING},
    JobStatus.RETRYING:  {JobStatus.RUNNING, JobStatus.FAILED, JobStatus.CANCELLED},
    JobStatus.FAILED:    set(),
    JobStatus.SUCCESS:   set(),
    JobStatus.CANCELLED: set(),
}


@dataclass
class Job:
    """Represents a unit of work in the queue."""

    name: str
    payload: Dict[str, Any]   = field(default_factory=dict)
    priority: Priority        = Priority.NORMAL
    max_retries: int          = 3
    timeout: int              = 300
    tags: List[str]           = field(default_factory=list)

    # managed internally
    id: str                   = field(default_factory=lambda: str(uuid.uuid4()))
    status: JobStatus         = field(default=JobStatus.PENDING)
    retries_used: int         = 0
    created_at: datetime      = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime]  = None
    finished_at: Optional[datetime] = None
    error: Optional[str]      = None
    result: Optional[Any]     = None


    def transition(self, new_status: JobStatus) -> None:
        allowed = _TRANSITIONS.get(self.status, set())
        if new_status not in allowed:
            raise InvalidStatusTransitionError(self.status.value, new_status.value)
        self.status = new_status

    def mark_running(self) -> None:
        self.transition(JobStatus.RUNNING)
        self.started_at = datetime.utcnow()

    def mark_success(self, result: Any = None) -> None:
        self.transition(JobStatus.SUCCESS)
        self.finished_at = datetime.utcnow()
        self.result = result

    def mark_failed(self, error: str) -> None:
        self.transition(JobStatus.FAILED)
        self.finished_at = datetime.utcnow()
        self.error = error

    def mark_retrying(self, error: str) -> None:
        self.transition(JobStatus.RETRYING)
        self.retries_used += 1
        self.error = error

    def mark_cancelled(self) -> None:
        self.transition(JobStatus.CANCELLED)
        self.finished_at = datetime.utcnow()


    @property
    def retries_remaining(self) -> int:
        return self.max_retries - self.retries_used

    @property
    def is_terminal(self) -> bool:
        return self.status in (JobStatus.SUCCESS, JobStatus.FAILED, JobStatus.CANCELLED)

    @property
    def duration(self) -> Optional[float]:
        if self.started_at is None or self.finished_at is None:
            return None
        return (self.finished_at - self.started_at).total_seconds()


    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id, "name": self.name, "payload": self.payload,
            "priority": self.priority.value, "max_retries": self.max_retries,
            "timeout": self.timeout, "tags": self.tags,
            "status": self.status.value, "retries_used": self.retries_used,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "error": self.error, "result": self.result,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Job":
        job = cls(
            name=data["name"], payload=data.get("payload", {}),
            priority=Priority(data.get("priority", Priority.NORMAL.value)),
            max_retries=data.get("max_retries", 3),
            timeout=data.get("timeout", 300),
            tags=data.get("tags", []), id=data["id"],
        )
        job.status      = JobStatus(data["status"])
        job.retries_used = data.get("retries_used", 0)
        job.error       = data.get("error")
        job.result      = data.get("result")
        job.created_at  = datetime.fromisoformat(data["created_at"])
        job.started_at  = datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None
        job.finished_at = datetime.fromisoformat(data["finished_at"]) if data.get("finished_at") else None
        return job

    def __repr__(self) -> str:
        return (f"Job(id={self.id[:8]}, name={self.name!r}, "
                f"status={self.status.value}, priority={self.priority.name})")
