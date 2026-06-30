"""SQLite-backed persistence layer for FlowQ."""

from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from typing import Dict, List, Optional

from flowq.exceptions import DuplicateJobError, JobNotFoundError, StorageError
from flowq.models import Job, JobStatus, Priority

_SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    status       TEXT NOT NULL,
    priority     INTEGER NOT NULL,
    payload      TEXT NOT NULL,
    tags         TEXT NOT NULL,
    max_retries  INTEGER NOT NULL,
    timeout      INTEGER NOT NULL,
    retries_used INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL,
    started_at   TEXT,
    finished_at  TEXT,
    error        TEXT,
    result       TEXT
);
CREATE INDEX IF NOT EXISTS idx_status   ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_priority ON jobs (priority DESC);
"""


class Storage:
    """Thread-safe SQLite job store."""

    def __init__(self, db_path: str = ":memory:"):
        self._db_path = db_path
        self._local   = threading.local()
        self._init_db()

    def _conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn"):
            conn = sqlite3.connect(self._db_path, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            self._local.conn = conn
        return self._local.conn

    @contextmanager
    def _cursor(self):
        conn = self._conn()
        cur  = conn.cursor()
        try:
            yield cur
            conn.commit()
        except sqlite3.IntegrityError as exc:
            conn.rollback()
            raise StorageError(str(exc)) from exc
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()

    def _init_db(self) -> None:
        with self._cursor() as cur:
            cur.executescript(_SCHEMA)


    def save(self, job: Job) -> None:
        """Persist a new job; raises DuplicateJobError if ID exists."""
        try:
            with self._cursor() as cur:
                cur.execute(
                    "INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (job.id, job.name, job.status.value, job.priority.value,
                     json.dumps(job.payload), json.dumps(job.tags),
                     job.max_retries, job.timeout, job.retries_used,
                     job.created_at.isoformat(),
                     job.started_at.isoformat()  if job.started_at  else None,
                     job.finished_at.isoformat() if job.finished_at else None,
                     job.error,
                     json.dumps(job.result) if job.result is not None else None),
                )
        except StorageError as exc:
            if "UNIQUE" in str(exc):
                raise DuplicateJobError(job.id) from exc
            raise

    def fetch(self, job_id: str) -> Job:
        """Return a Job by ID; raises JobNotFoundError if missing."""
        with self._cursor() as cur:
            cur.execute("SELECT * FROM jobs WHERE id=?", (job_id,))
            row = cur.fetchone()
        if row is None:
            raise JobNotFoundError(job_id)
        return self._row_to_job(row)


    def update(self, job: Job) -> None:
        """Overwrite mutable fields of an existing job."""
        with self._cursor() as cur:
            cur.execute(
                """UPDATE jobs SET status=?, retries_used=?,
                   started_at=?, finished_at=?, error=?, result=?
                   WHERE id=?""",
                (job.status.value, job.retries_used,
                 job.started_at.isoformat()  if job.started_at  else None,
                 job.finished_at.isoformat() if job.finished_at else None,
                 job.error,
                 json.dumps(job.result) if job.result is not None else None,
                 job.id),
            )
            if cur.rowcount == 0:
                raise JobNotFoundError(job.id)

    def delete(self, job_id: str) -> None:
        """Remove a job record; raises JobNotFoundError if missing."""
        with self._cursor() as cur:
            cur.execute("DELETE FROM jobs WHERE id=?", (job_id,))
            if cur.rowcount == 0:
                raise JobNotFoundError(job_id)


    def list_jobs(self, status: Optional[JobStatus] = None,
                  limit: int = 100, offset: int = 0) -> List[Job]:
        with self._cursor() as cur:
            if status:
                cur.execute(
                    "SELECT * FROM jobs WHERE status=? ORDER BY priority DESC, created_at ASC LIMIT ? OFFSET ?",
                    (status.value, limit, offset))
            else:
                cur.execute(
                    "SELECT * FROM jobs ORDER BY priority DESC, created_at ASC LIMIT ? OFFSET ?",
                    (limit, offset))
            return [self._row_to_job(r) for r in cur.fetchall()]

    def search_by_tag(self, tag: str) -> List[Job]:
        with self._cursor() as cur:
            cur.execute("SELECT * FROM jobs")
            rows = cur.fetchall()
        return [self._row_to_job(r) for r in rows if tag in json.loads(r["tags"])]

    def count_by_status(self) -> Dict[str, int]:
        with self._cursor() as cur:
            cur.execute("SELECT status, COUNT(*) AS cnt FROM jobs GROUP BY status")
            return {r["status"]: r["cnt"] for r in cur.fetchall()}

    @staticmethod
    def _row_to_job(row: sqlite3.Row) -> Job:
        from datetime import datetime
        d = dict(row)
        d["payload"] = json.loads(d["payload"])
        d["tags"]    = json.loads(d["tags"])
        d["result"]  = json.loads(d["result"]) if d.get("result") else None
        return Job.from_dict(d)


__all__ = ["Storage"]
