# FlowQ

A lightweight, embeddable Python job queue and cron scheduler.

## Features

- Priority-based in-memory job queue (thread-safe)
- SQLite-backed persistence
- Retry logic with configurable back-off
- Cron-style scheduler with five-field expressions
- Multi-worker pool
- CLI interface (`flowq enqueue`, `flowq status`, `flowq list`, `flowq cancel`)

## Quick start

```bash
pip install -e .
flowq enqueue my_job --payload '{"x": 1}' --priority high
flowq list
flowq worker --workers 4
```


## Usage

### Enqueue a job

```bash
flowq enqueue send_email --payload '{"to": "user@example.com"}' --tag notifications
```

### Check job status

```bash
flowq status <job-id>
```

### Run a worker pool

```bash
flowq worker --workers 4 --poll 0.5
```

### Register a handler

```python
from flowq.worker import register

@register("send_email")
def send_email(payload):
    print(f"Sending to {payload['to']}")
    return "sent"
```


## Scheduler

```python
from flowq.scheduler import CronExpression, ScheduledJob, Scheduler
from flowq.queue import JobQueue

queue = JobQueue()
scheduler = Scheduler(queue=queue)

sj = ScheduledJob(
    name="cleanup",
    cron="0 2 * * *",          # every day at 02:00 UTC
    job_factory=lambda: {"target": "tmp"},
)
scheduler.add(sj)
scheduler.start()              # ticks every 60 s in background
```

## Cron expression format

```
┌──── minute  (0-59)
│ ┌── hour    (0-23)
│ │ ┌ day     (1-31)
│ │ │ ┌ month (1-12)
│ │ │ │ ┌ weekday (0-6, Mon=0)
* * * * *
```

Supports `*`, ranges (`1-5`), steps (`*/5`, `0-30/10`), and lists (`1,3,5`).


## Architecture

```
flowq/
├── models.py        Job dataclass, JobStatus, Priority
├── queue.py         Thread-safe priority queue
├── storage.py       SQLite persistence
├── worker.py        Job executor + WorkerPool
├── scheduler.py     Cron-style scheduler
├── cli.py           Click CLI
├── middleware.py    Pre/post-execution pipeline
├── events.py        Pub/sub event hooks
├── monitoring.py    Counters, gauges, histograms
├── rate_limiter.py  Token bucket + sliding window
├── deadletter.py    Failed-job DLQ with replay
├── serializers.py   JSON / Pickle / Base64
├── backends/        Swappable storage backends
├── dashboard.py     Stdlib HTTP status page
├── config.py        Env-var driven configuration
└── utils.py         Retry, backoff, JSON helpers
```
