"""examples/scheduled_tasks.py — cron scheduler example."""

import time
from datetime import datetime

from flowq.queue import JobQueue
from flowq.scheduler import CronExpression, Scheduler, ScheduledJob
from flowq.worker import Worker, register


@register("heartbeat")
def heartbeat(payload: dict) -> str:
    ts = datetime.utcnow().isoformat()
    print(f"  [heartbeat] tick at {ts}")
    return ts


@register("cleanup")
def cleanup(payload: dict) -> str:
    target = payload.get("target", "tmp")
    print(f"  [cleanup] removing {target!r}")
    return f"cleaned {target}"


def main():
    queue     = JobQueue()
    scheduler = Scheduler(queue=queue)
    worker    = Worker(queue=queue, poll_interval=0.1)

    # Schedule heartbeat every minute (simulated with tick)
    hb = ScheduledJob(
        name="heartbeat",
        cron="* * * * *",
        job_factory=lambda: {"source": "scheduler"},
    )
    # Schedule cleanup daily at midnight
    cl = ScheduledJob(
        name="cleanup",
        cron="0 0 * * *",
        job_factory=lambda: {"target": "logs/old"},
    )
    scheduler.add(hb)
    scheduler.add(cl)

    print("Scheduled jobs:", [sj.name for sj in scheduler.list_jobs()])
    print()

    # Simulate 3 ticks manually (instead of waiting 3 real minutes)
    from datetime import timedelta
    now = datetime(2024, 6, 1, 0, 0)
    for i in range(3):
        tick_time = now + timedelta(minutes=i)
        fired = scheduler.tick(now=tick_time)
        print(f"Tick {i+1} at {tick_time.strftime('%H:%M')} — fired: {len(fired)} job(s)")
        # Drain queue
        while True:
            job = queue.dequeue()
            if job is None:
                break
            worker.run_job(job)


if __name__ == "__main__":
    main()
