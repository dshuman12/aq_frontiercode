"""
File-system backend for FlowQ.

Stores each job as a JSON file under a configurable directory.
Suitable for lightweight deployments without a database.

Layout::

    <root>/
        <job_id>.json
        ...

Thread-safe via a per-instance lock. Not suitable for multi-process
concurrent writers (use SQLiteBackend for that).
"""

from __future__ import annotations

import json
import os
import threading
import uuid
from typing import Any, Optional

from flowq.backends.base import BaseBackend
from flowq.models import Job, JobStatus
from flowq.exceptions import StorageError, JobNotFoundError


class FileBackend(BaseBackend):
    """
    JSON-file-per-job storage backend.

    Parameters
    ----------
    root_dir:
        Directory in which job files will be written. Created if absent.
    """

    def __init__(self, root_dir: str) -> None:
        self._root = root_dir
        os.makedirs(root_dir, exist_ok=True)
        self._lock = threading.Lock()

    # ── helpers ──────────────────────────────────────────────────────────────

    def _path(self, job_id: str) -> str:
        return os.path.join(self._root, f"{job_id}.json")

    def _write(self, job: Job) -> None:
        path = self._path(job.id)
        tmp = path + ".tmp"
        try:
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(job.to_dict(), f, default=str)
            os.replace(tmp, path)
        except OSError as exc:
            raise StorageError(f"Failed to write job {job.id}: {exc}") from exc

    def _read(self, job_id: str) -> Job:
        path = self._path(job_id)
        if not os.path.exists(path):
            raise JobNotFoundError(job_id)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return Job.from_dict(data)
        except (OSError, json.JSONDecodeError, KeyError) as exc:
            raise StorageError(f"Failed to read job {job_id}: {exc}") from exc

    # ── BaseBackend interface ─────────────────────────────────────────────────

    def save(self, job: Job) -> None:
        with self._lock:
            if os.path.exists(self._path(job.id)):
                from flowq.exceptions import DuplicateJobError
                raise DuplicateJobError(job.id)
            self._write(job)

    def fetch(self, job_id: str) -> Job:
        with self._lock:
            return self._read(job_id)

    def update(self, job: Job) -> None:
        with self._lock:
            if not os.path.exists(self._path(job.id)):
                raise JobNotFoundError(job.id)
            self._write(job)

    def delete(self, job_id: str) -> None:
        with self._lock:
            path = self._path(job_id)
            if not os.path.exists(path):
                raise JobNotFoundError(job_id)
            try:
                os.remove(path)
            except OSError as exc:
                raise StorageError(f"Failed to delete job {job_id}: {exc}") from exc

    def list_jobs(
        self,
        status: Optional[JobStatus] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Job]:
        with self._lock:
            try:
                filenames = sorted(os.listdir(self._root))
            except OSError:
                return []
            jobs = []
            for fn in filenames:
                if not fn.endswith(".json") or fn.endswith(".tmp"):
                    continue
                job_id = fn[:-5]
                try:
                    job = self._read(job_id)
                except Exception:
                    continue
                if status is None or job.status == status:
                    jobs.append(job)
            return jobs[offset: offset + limit]

    def search_by_tag(self, tag: str) -> list[Job]:
        with self._lock:
            try:
                filenames = os.listdir(self._root)
            except OSError:
                return []
            results = []
            for fn in filenames:
                if not fn.endswith(".json") or fn.endswith(".tmp"):
                    continue
                try:
                    job = self._read(fn[:-5])
                except Exception:
                    continue
                if tag in (job.tags or []):
                    results.append(job)
            return results

    def count_by_status(self) -> dict[str, int]:
        counts: dict[str, int] = {s.name: 0 for s in JobStatus}
        try:
            filenames = os.listdir(self._root)
        except OSError:
            return counts
        for fn in filenames:
            if not fn.endswith(".json") or fn.endswith(".tmp"):
                continue
            try:
                job = self._read(fn[:-5])
                counts[job.status.name] += 1
            except Exception:
                pass
        return counts

    def health_check(self) -> dict:
        try:
            test_path = os.path.join(self._root, ".health")
            with open(test_path, "w") as f:
                f.write("ok")
            os.remove(test_path)
            count = sum(1 for f in os.listdir(self._root) if f.endswith(".json"))
            return {"root": self._root, "job_files": count}
        except OSError as exc:
            raise StorageError(f"FileBackend health check failed: {exc}") from exc

    def close(self) -> None:
        pass   # nothing to close for file backend

    def __repr__(self) -> str:
        return f"FileBackend(root={self._root!r})"
