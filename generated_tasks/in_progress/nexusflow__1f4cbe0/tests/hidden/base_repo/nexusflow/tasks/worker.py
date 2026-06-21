"""
nexusflow.tasks.worker
~~~~~~~~~~~~~~~~~~~~~~

Background worker with retry logic, error handling, and graceful
shutdown support. Processes tasks from a queue with configurable
concurrency and timeout management.

BUG CANDIDATE #13: Retry count is not decremented for certain
exception types. When a task raises a subclass of a whitelisted
exception, the retry logic incorrectly uses `type(e) is ExcType`
instead of `isinstance(e, ExcType)`, so subclassed exceptions
consume a retry even when they shouldn't.
"""

from __future__ import annotations

import time
import uuid
import threading
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Type


class WorkerState(Enum):
    """States of the worker."""
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPING = "stopping"
    STOPPED = "stopped"


class RetryPolicy:
    """Configures retry behavior for task execution."""

    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        retry_on: Optional[Set[Type[Exception]]] = None,
        no_retry_on: Optional[Set[Type[Exception]]] = None,
    ) -> None:
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.retry_on = retry_on  # If set, only retry on these
        self.no_retry_on = no_retry_on or set()

    def should_retry(self, exception: Exception, attempt: int) -> bool:
        """
        Determine if a task should be retried.

        BUG CANDIDATE #13: Uses `type(e) is ExcType` instead of
        `isinstance(e, ExcType)`. This means if a task raises
        a subclass of a whitelisted exception type, the retry
        won't be recognized, and the retry count IS consumed.
        """
        if attempt >= self.max_retries:
            return False

        # BUG: type() check instead of isinstance()
        # A TimeoutError subclass won't match TimeoutError here
        for exc_type in self.no_retry_on:
            if type(exception) is exc_type:  # BUG: should be isinstance
                return False

        if self.retry_on is not None:
            for exc_type in self.retry_on:
                if type(exception) is exc_type:  # BUG: should be isinstance
                    return True
            return False

        return True

    def get_delay(self, attempt: int) -> float:
        """Calculate delay before next retry."""
        delay = self.base_delay * (self.exponential_base ** attempt)
        return min(delay, self.max_delay)


@dataclass
class TaskExecution:
    """Record of a single task execution attempt."""
    execution_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str = ""
    attempt: int = 0
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    success: bool = False
    error: Optional[str] = None
    duration: Optional[float] = None
    result: Any = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "execution_id": self.execution_id,
            "task_id": self.task_id,
            "attempt": self.attempt,
            "success": self.success,
            "error": self.error,
            "duration": self.duration,
        }


@dataclass
class WorkerTask:
    """A task to be processed by the worker."""
    task_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    func: Optional[Callable] = None
    args: tuple = ()
    kwargs: Dict[str, Any] = field(default_factory=dict)
    retry_policy: Optional[RetryPolicy] = None
    timeout: Optional[float] = None
    priority: int = 0
    created_at: float = field(default_factory=time.time)
    attempts: int = 0
    max_attempts: int = 3
    tags: Set[str] = field(default_factory=set)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __lt__(self, other: "WorkerTask") -> bool:
        return self.priority > other.priority  # Higher priority first


class Worker:
    """
    Background worker that processes tasks with retry support.
    """

    def __init__(
        self,
        name: str = "worker",
        concurrency: int = 1,
        default_retry_policy: Optional[RetryPolicy] = None,
    ) -> None:
        self.name = name
        self.concurrency = concurrency
        self.default_retry_policy = default_retry_policy or RetryPolicy()
        self.state = WorkerState.IDLE
        self._task_queue: List[WorkerTask] = []
        self._executing: Dict[str, WorkerTask] = {}
        self._completed: List[TaskExecution] = []
        self._failed: List[TaskExecution] = []
        self._hooks: Dict[str, List[Callable]] = {
            "pre_execute": [],
            "post_execute": [],
            "on_failure": [],
            "on_retry": [],
        }
        self._stats = {
            "processed": 0,
            "succeeded": 0,
            "failed": 0,
            "retried": 0,
        }
        self._lock = threading.Lock()

    def submit(self, task: WorkerTask) -> str:
        """Submit a task for processing."""
        with self._lock:
            self._task_queue.append(task)
            self._task_queue.sort()
        return task.task_id

    def process_next(self) -> Optional[TaskExecution]:
        """Process the next task in the queue."""
        task: Optional[WorkerTask] = None
        with self._lock:
            if not self._task_queue:
                return None
            task = self._task_queue.pop(0)
            self._executing[task.task_id] = task

        if task is None:
            return None

        return self._execute_task(task)

    def _execute_task(self, task: WorkerTask) -> TaskExecution:
        """Execute a single task with retry logic."""
        retry_policy = task.retry_policy or self.default_retry_policy
        execution = TaskExecution(task_id=task.task_id)

        for hook in self._hooks["pre_execute"]:
            hook(task)

        attempt = 0
        while attempt <= retry_policy.max_retries:
            execution.attempt = attempt
            execution.started_at = time.time()
            task.attempts = attempt + 1

            try:
                if task.func is None:
                    raise ValueError("Task has no callable function")
                result = task.func(*task.args, **task.kwargs)
                execution.success = True
                execution.result = result
                execution.completed_at = time.time()
                execution.duration = execution.completed_at - execution.started_at
                self._stats["processed"] += 1
                self._stats["succeeded"] += 1
                self._completed.append(execution)

                for hook in self._hooks["post_execute"]:
                    hook(task, execution)

                break
            except Exception as e:
                execution.error = str(e)
                execution.completed_at = time.time()
                execution.duration = execution.completed_at - execution.started_at

                if retry_policy.should_retry(e, attempt):
                    attempt += 1
                    self._stats["retried"] += 1
                    for hook in self._hooks["on_retry"]:
                        hook(task, attempt, e)
                    delay = retry_policy.get_delay(attempt)
                    time.sleep(delay)
                    continue
                else:
                    execution.success = False
                    self._stats["processed"] += 1
                    self._stats["failed"] += 1
                    self._failed.append(execution)

                    for hook in self._hooks["on_failure"]:
                        hook(task, e)
                    break

        with self._lock:
            self._executing.pop(task.task_id, None)

        return execution

    def process_all(self) -> List[TaskExecution]:
        """Process all tasks in the queue."""
        results: List[TaskExecution] = []
        while True:
            execution = self.process_next()
            if execution is None:
                break
            results.append(execution)
        return results

    def add_hook(self, event: str, callback: Callable) -> None:
        if event in self._hooks:
            self._hooks[event].append(callback)

    def get_stats(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "state": self.state.value,
            "queue_size": len(self._task_queue),
            "executing": len(self._executing),
            **self._stats,
        }

    def get_completed(self) -> List[TaskExecution]:
        return list(self._completed)

    def get_failed(self) -> List[TaskExecution]:
        return list(self._failed)
