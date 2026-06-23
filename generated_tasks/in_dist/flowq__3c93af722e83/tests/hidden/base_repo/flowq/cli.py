"""FlowQ command-line interface."""

from __future__ import annotations

import json
import os
import sys
from typing import Optional

import click

from flowq.models import Job, JobStatus, Priority
from flowq.queue import JobQueue
from flowq.storage import Storage
from flowq.worker import Worker, WorkerPool, _HANDLERS


def _get_storage() -> Storage:
    db_path = os.environ.get("FLOWQ_DB_PATH", "flowq.db")
    return Storage(db_path)


@click.group()
@click.version_option()
def cli():
    """FlowQ — lightweight job queue and scheduler."""


# ── enqueue ──────────────────────────────────────────────────────────────────

@cli.command()
@click.argument("handler")
@click.option("--payload", "-p", default="{}", help="JSON payload string")
@click.option("--priority", "-P",
              type=click.Choice([p.name for p in Priority], case_sensitive=False),
              default="NORMAL")
@click.option("--retries", "-r", default=0, type=int, help="Max retry attempts")
@click.option("--timeout", "-t", default=None, type=float, help="Timeout in seconds")
@click.option("--tag", "-T", multiple=True, help="Tags (repeatable)")
def enqueue(handler, payload, priority, retries, timeout, tag):
    """Enqueue a job for asynchronous execution."""
    try:
        data = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise click.BadParameter(f"Invalid JSON payload: {exc}")

    job = Job(
        name=handler,
        payload=data,
        priority=Priority[priority.upper()],
        max_retries=retries,
        timeout=timeout,
        tags=list(tag),
    )
    storage = _get_storage()
    q = JobQueue()
    storage.save(job)
    q.enqueue(job)
    click.echo(f"Enqueued job {job.id} ({handler})")


# ── status ───────────────────────────────────────────────────────────────────

@cli.command()
@click.argument("job_id")
def status(job_id):
    """Show status of a specific job."""
    storage = _get_storage()
    try:
        job = storage.fetch(job_id)
    except Exception:
        raise click.ClickException(f"Job {job_id!r} not found")
    click.echo(json.dumps(job.to_dict(), indent=2, default=str))


# ── list ─────────────────────────────────────────────────────────────────────

@cli.command("list")
@click.option("--status-filter", "-s", "status_filter",
              type=click.Choice([s.name for s in JobStatus], case_sensitive=False),
              default=None)
@click.option("--limit", "-n", default=20, type=int)
@click.option("--json-output", "-j", is_flag=True)
def list_jobs(status_filter, limit, json_output):
    """List jobs in storage."""
    storage = _get_storage()
    filt = JobStatus[status_filter.upper()] if status_filter else None
    jobs = storage.list_jobs(status=filt, limit=limit)
    if json_output:
        click.echo(json.dumps([j.to_dict() for j in jobs], indent=2, default=str))
    else:
        for job in jobs:
            click.echo(f"{job.id[:8]}  {job.status.name:<10}  {job.name}")


# ── cancel ───────────────────────────────────────────────────────────────────

@cli.command()
@click.argument("job_id")
def cancel(job_id):
    """Cancel a pending job."""
    storage = _get_storage()
    q = JobQueue()
    try:
        job = storage.fetch(job_id)
        q._jobs = []  # reset in-memory queue
        jobs = storage.list_jobs(status=JobStatus.PENDING)
        for j in jobs:
            q.enqueue(j)
        q.cancel(job_id)
        storage.update(storage.fetch(job_id))
        click.echo(f"Cancelled {job_id}")
    except Exception as exc:
        raise click.ClickException(str(exc))


# ── worker ───────────────────────────────────────────────────────────────────

@cli.command()
@click.option("--concurrency", "-c", default=1, type=int, help="Worker pool size")
@click.option("--poll-interval", default=1.0, type=float)
def worker(concurrency, poll_interval):
    """Start a worker process to consume jobs."""
    storage = _get_storage()
    q = JobQueue()
    jobs = storage.list_jobs(status=JobStatus.PENDING)
    for j in jobs:
        q.enqueue(j)
    click.echo(f"Starting worker pool (concurrency={concurrency})")
    pool = WorkerPool(size=concurrency, storage=storage)
    pool.start()
    import time
    try:
        while True:
            job = q.dequeue()
            if job:
                pool._queue.put(job)
            time.sleep(poll_interval)
    except KeyboardInterrupt:
        click.echo("Shutting down...")
        pool.stop()


# ── stats ─────────────────────────────────────────────────────────────────────

@cli.command()
@click.option("--json-output", "-j", is_flag=True)
def stats(json_output):
    """Show job count by status."""
    storage = _get_storage()
    counts = storage.count_by_status()
    if json_output:
        click.echo(json.dumps(counts, indent=2))
    else:
        for status_name, count in counts.items():
            click.echo(f"  {status_name:<12} {count}")


# ── purge ─────────────────────────────────────────────────────────────────────

@cli.command()
@click.option("--status-filter", "-s",
              type=click.Choice([s.name for s in JobStatus], case_sensitive=False),
              required=True)
@click.option("--yes", is_flag=True, help="Skip confirmation prompt")
def purge(status_filter, yes):
    """Delete all jobs with the given status."""
    storage = _get_storage()
    filt = JobStatus[status_filter.upper()]
    jobs = storage.list_jobs(status=filt, limit=10000)
    if not jobs:
        click.echo("No jobs to purge.")
        return
    if not yes:
        click.confirm(f"Purge {len(jobs)} {status_filter} jobs?", abort=True)
    for job in jobs:
        try:
            storage.delete(job.id)
        except Exception:
            pass
    click.echo(f"Purged {len(jobs)} jobs.")


# ── retry ─────────────────────────────────────────────────────────────────────

@cli.command()
@click.argument("job_id")
def retry(job_id):
    """Re-queue a failed job for immediate retry."""
    storage = _get_storage()
    q = JobQueue()
    try:
        job = storage.fetch(job_id)
    except Exception:
        raise click.ClickException(f"Job {job_id!r} not found")
    if job.status != JobStatus.FAILED:
        raise click.ClickException(f"Job is {job.status.name}, not FAILED")
    job.status = JobStatus.PENDING
    job.retry_count = 0
    storage.update(job)
    q.enqueue(job)
    click.echo(f"Re-queued {job_id}")


# ── handlers ──────────────────────────────────────────────────────────────────

@cli.command()
def handlers():
    """List all registered job handlers."""
    if not _HANDLERS:
        click.echo("No handlers registered.")
        return
    for name in sorted(_HANDLERS):
        fn = _HANDLERS[name]
        click.echo(f"  {name:<30} {fn.__module__}.{fn.__qualname__}")


# ── dashboard ─────────────────────────────────────────────────────────────────

@cli.command()
@click.option("--host", default="127.0.0.1")
@click.option("--port", "-p", default=8765, type=int)
def dashboard(host, port):
    """Start the HTTP monitoring dashboard."""
    from flowq.dashboard import Dashboard
    storage = _get_storage()
    db = Dashboard(storage=storage, host=host, port=port)
    click.echo(f"Dashboard running at http://{host}:{port}/")
    db.start()
    import time
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        db.stop()
        click.echo("Dashboard stopped.")
