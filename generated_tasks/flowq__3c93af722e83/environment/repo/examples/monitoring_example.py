"""examples/monitoring_example.py — metrics + dashboard example."""

import time
import threading

from flowq.models import Job, Priority
from flowq.monitoring import metrics
from flowq.queue import JobQueue
from flowq.storage import Storage
from flowq.worker import Worker, register


@register("compute")
def compute(payload: dict) -> int:
    n = payload.get("n", 100)
    result = sum(range(n))
    return result


def main():
    storage = Storage(":memory:")
    queue   = JobQueue()

    # Instrument worker events via metrics
    worker = Worker(queue=queue, storage=storage)

    # Enqueue some jobs
    for i in range(20):
        priority = Priority.HIGH if i % 5 == 0 else Priority.NORMAL
        job = Job(name="compute", payload={"n": (i + 1) * 50}, priority=priority)
        storage.save(job)
        queue.enqueue(job)
        metrics.increment("jobs.enqueued")

    print(f"Enqueued 20 jobs
")

    # Process with timing
    while True:
        job = queue.dequeue()
        if job is None:
            break
        with metrics.timer("job.duration"):
            worker.run_job(job)
        if job.status.value == "success":
            metrics.increment("jobs.success")
        else:
            metrics.increment("jobs.failed")

    metrics.set_gauge("queue.depth", len(queue))

    # Print snapshot
    snap = metrics.snapshot()
    print("=== Metrics snapshot ===")
    print(f"  Uptime   : {snap['uptime_seconds']:.2f}s")
    print(f"  Counters : {snap['counters']}")
    print(f"  Gauges   : {snap['gauges']}")
    hist = snap['histograms'].get('job.duration', {})
    print(f"  Duration : mean={hist.get('mean')}s  p95={hist.get('p95')}s")


if __name__ == "__main__":
    main()
