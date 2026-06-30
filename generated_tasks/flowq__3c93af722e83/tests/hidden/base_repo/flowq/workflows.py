"""
Lightweight workflow (DAG) engine for FlowQ.

Build directed acyclic graphs of jobs where each node only runs after all its
upstream dependencies have completed successfully.

Example::

    wf = Workflow("etl")
    extract  = wf.add_step("extract",  handler="extract_data")
    validate = wf.add_step("validate", handler="validate_data", depends_on=[extract])
    load     = wf.add_step("load",     handler="load_data",     depends_on=[validate])

    result = WorkflowRunner(worker, storage).run(wf)
    print(result.status)   # WorkflowStatus.SUCCESS
"""

from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Optional

from flowq.models import Job, JobStatus, Priority
from flowq.exceptions import FlowQError


class WorkflowStatus(Enum):
    PENDING  = auto()
    RUNNING  = auto()
    SUCCESS  = auto()
    FAILED   = auto()
    CANCELLED = auto()


class WorkflowError(FlowQError):
    pass


class CyclicDependencyError(WorkflowError):
    pass


@dataclass
class WorkflowStep:
    name: str
    handler: str
    payload: dict = field(default_factory=dict)
    depends_on: list[str] = field(default_factory=list)   # step names
    priority: Priority = Priority.NORMAL
    max_retries: int = 0
    timeout: Optional[float] = None

    # runtime
    job_id: Optional[str] = None
    status: JobStatus = JobStatus.PENDING

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "handler": self.handler,
            "payload": self.payload,
            "depends_on": self.depends_on,
            "priority": self.priority.name,
            "max_retries": self.max_retries,
            "timeout": self.timeout,
            "job_id": self.job_id,
            "status": self.status.name,
        }


class Workflow:
    """A named DAG of WorkflowStep objects."""

    def __init__(self, name: str) -> None:
        self.name = name
        self.id = str(uuid.uuid4())
        self._steps: dict[str, WorkflowStep] = {}

    def add_step(
        self,
        name: str,
        handler: str,
        payload: Optional[dict] = None,
        depends_on: Optional[list[str]] = None,
        priority: Priority = Priority.NORMAL,
        max_retries: int = 0,
        timeout: Optional[float] = None,
    ) -> str:
        """Add a step and return its name (for use in depends_on)."""
        if name in self._steps:
            raise WorkflowError(f"Step {name!r} already exists in workflow {self.name!r}")
        self._steps[name] = WorkflowStep(
            name=name,
            handler=handler,
            payload=payload or {},
            depends_on=depends_on or [],
            priority=priority,
            max_retries=max_retries,
            timeout=timeout,
        )
        return name

    def steps(self) -> list[WorkflowStep]:
        return list(self._steps.values())

    def validate(self) -> None:
        """Raise CyclicDependencyError if the graph has cycles."""
        visited: set[str] = set()
        stack: set[str] = set()

        def dfs(name: str) -> None:
            visited.add(name)
            stack.add(name)
            step = self._steps.get(name)
            if step is None:
                raise WorkflowError(f"Unknown step {name!r}")
            for dep in step.depends_on:
                if dep not in self._steps:
                    raise WorkflowError(
                        f"Step {name!r} depends on unknown step {dep!r}"
                    )
                if dep in stack:
                    raise CyclicDependencyError(
                        f"Cycle detected: {name!r} → {dep!r}"
                    )
                if dep not in visited:
                    dfs(dep)
            stack.discard(name)

        for s in self._steps:
            if s not in visited:
                dfs(s)

    def topological_order(self) -> list[str]:
        """Return step names in dependency-safe execution order."""
        self.validate()
        visited: set[str] = set()
        order: list[str] = []

        def visit(name: str) -> None:
            if name in visited:
                return
            for dep in self._steps[name].depends_on:
                visit(dep)
            visited.add(name)
            order.append(name)

        for s in self._steps:
            visit(s)
        return order

    def ready_steps(self) -> list[WorkflowStep]:
        """Return steps whose dependencies are all SUCCESS."""
        ready = []
        for step in self._steps.values():
            if step.status != JobStatus.PENDING:
                continue
            deps_done = all(
                self._steps[d].status == JobStatus.SUCCESS
                for d in step.depends_on
            )
            if deps_done:
                ready.append(step)
        return ready

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "steps": [s.to_dict() for s in self._steps.values()],
        }


@dataclass
class WorkflowResult:
    workflow_id: str
    workflow_name: str
    status: WorkflowStatus
    step_results: dict[str, JobStatus] = field(default_factory=dict)
    error: Optional[str] = None
    started_at: float = field(default_factory=time.time)
    finished_at: Optional[float] = None

    @property
    def duration(self) -> Optional[float]:
        if self.finished_at:
            return self.finished_at - self.started_at
        return None

    def to_dict(self) -> dict:
        return {
            "workflow_id": self.workflow_id,
            "workflow_name": self.workflow_name,
            "status": self.status.name,
            "step_results": {k: v.name for k, v in self.step_results.items()},
            "error": self.error,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "duration": self.duration,
        }


class WorkflowRunner:
    """
    Synchronous workflow executor.

    Uses a Worker and Storage to create, execute, and track each step.
    Polls until all steps are terminal or a step fails.
    """

    POLL_INTERVAL = 0.05

    def __init__(self, worker, storage, poll_interval: float = POLL_INTERVAL) -> None:
        self._worker = worker
        self._storage = storage
        self._poll = poll_interval

    def run(self, workflow: Workflow) -> WorkflowResult:
        workflow.validate()
        result = WorkflowResult(
            workflow_id=workflow.id,
            workflow_name=workflow.name,
            status=WorkflowStatus.RUNNING,
        )

        while True:
            ready = workflow.ready_steps()
            if not ready:
                break

            for step in ready:
                job = Job(
                    name=step.handler,
                    payload=dict(step.payload, _workflow_step=step.name),
                    priority=step.priority,
                    max_retries=step.max_retries,
                    timeout=step.timeout,
                )
                try:
                    self._storage.save(job)
                except Exception:
                    pass
                step.job_id = job.id
                step.status = JobStatus.RUNNING
                self._worker.run_job(job)

                try:
                    latest = self._storage.fetch(job.id)
                    step.status = latest.status
                except Exception:
                    step.status = job.status

                result.step_results[step.name] = step.status

                if step.status == JobStatus.FAILED:
                    result.status = WorkflowStatus.FAILED
                    result.error = f"Step {step.name!r} failed"
                    result.finished_at = time.time()
                    return result

            time.sleep(self._poll)

        all_done = all(
            s.status == JobStatus.SUCCESS for s in workflow.steps()
        )
        result.status = WorkflowStatus.SUCCESS if all_done else WorkflowStatus.FAILED
        result.finished_at = time.time()
        return result
