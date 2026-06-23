"""Job execution engine for FlowQ."""

from __future__ import annotations

import logging
import threading
import time
from typing import Callable, Dict, Optional

from flowq.models import Job, JobStatus
from flowq.queue import JobQueue
from flowq.storage import Storage

logger = logging.getLogger(__name__)

_HANDLERS: Dict[str, Callable] = {}


def register(name: str):
    """Decorator: register a callable as the handler for job *name*."""
    def decorator(fn: Callable) -> Callable:
        _HANDLERS[name] = fn
        return fn
    return decorator


class Worker:
    """Pulls jobs from a queue and executes them."""

    def __init__(self, queue: JobQueue, storage: Optional[Storage] = None,
                 poll_interval: float = 1.0, worker_id: Optional[str] = None):
        self.queue         = queue
        self.storage       = storage
        self.poll_interval = poll_interval
        self.worker_id     = worker_id or threading.current_thread().name
        self._running      = False
        self._processed    = 0
        self._failed       = 0


    def start(self) -> None:
        self._running = True
        logger.info("Worker %s started", self.worker_id)
        while self._running:
            job = self.queue.dequeue()
            if job is None:
                time.sleep(self.poll_interval)
                continue
            self.run_job(job)

    def stop(self) -> None:
        self._running = False

    def run_job(self, job: Job) -> None:
        logger.info("Worker %s → job %s (%s)", self.worker_id, job.id[:8], job.name)
        job.mark_running()
        self._persist(job)
        try:
            result = self._execute(job)
            job.mark_success(result)
            self._processed += 1
        except Exception as exc:
            self._handle_failure(job, exc)
        finally:
            self._persist(job)


    def _execute(self, job: Job) -> object:
        handler = _HANDLERS.get(job.name)
        if handler is None:
            raise ValueError(f"No handler registered for '{job.name}'")
        result_box: list = []
        error_box:  list = []

        def _run():
            try:    result_box.append(handler(job.payload))
            except Exception as exc: error_box.append(exc)

        t = threading.Thread(target=_run, daemon=True)
        t.start()
        t.join(timeout=job.timeout)
        if t.is_alive():
            raise TimeoutError(f"Job {job.id[:8]} exceeded {job.timeout}s timeout")
        if error_box:
            raise error_box[0]
        return result_box[0] if result_box else None


    def _handle_failure(self, job: Job, exc: Exception) -> None:
        error_msg = str(exc)
        if job.retries_remaining > 0:
            job.mark_retrying(error_msg)
            logger.warning("Job %s retrying (%d left): %s",
                           job.id[:8], job.retries_remaining, error_msg)
            job.status = JobStatus.PENDING
            self.queue.enqueue(job)
        else:
            job.mark_failed(error_msg)
            self._failed += 1
            logger.error("Job %s permanently failed: %s", job.id[:8], error_msg)

    def _persist(self, job: Job) -> None:
        if self.storage:
            try: self.storage.update(job)
            except Exception: pass

    @property
    def stats(self) -> dict:
        return {"worker_id": self.worker_id,
                "processed": self._processed, "failed": self._failed}



class WorkerPool:
    """Manages a pool of Worker threads."""

    def __init__(self, queue: JobQueue, storage: Optional[Storage] = None,
                 num_workers: int = 2, poll_interval: float = 1.0):
        self.queue         = queue
        self.storage       = storage
        self.num_workers   = num_workers
        self.poll_interval = poll_interval
        self._workers: list = []
        self._threads: list = []

    def start(self) -> None:
        for i in range(self.num_workers):
            w = Worker(self.queue, self.storage, self.poll_interval, f"worker-{i}")
            t = threading.Thread(target=w.start, daemon=True, name=f"worker-{i}")
            self._workers.append(w)
            self._threads.append(t)
            t.start()
        logger.info("WorkerPool started with %d workers", self.num_workers)

    def stop(self) -> None:
        for w in self._workers: w.stop()
        for t in self._threads: t.join(timeout=5)

    def wait_until_empty(self, timeout: float = 30.0) -> bool:
        deadline = time.time() + timeout
        while time.time() < deadline:
            if len(self.queue) == 0:
                return True
            time.sleep(0.2)
        return False

    @property
    def stats(self) -> list:
        return [w.stats for w in self._workers]


__all__ = ["Worker", "WorkerPool", "register"]
