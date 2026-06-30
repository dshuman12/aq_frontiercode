"""examples/custom_middleware.py — middleware pipeline example."""

import time

from flowq.middleware import MiddlewareStack
from flowq.models import Job
from flowq.queue import JobQueue
from flowq.worker import Worker, register, _HANDLERS


@register("process")
def process(payload: dict) -> dict:
    time.sleep(0.01)   # simulate work
    return {"processed": True, "items": payload.get("count", 0)}


def audit_middleware(job: Job, next_handler):
    """Log job details before and after execution."""
    print(f"  [AUDIT] starting job {job.id[:8]} — name={job.name}, tags={job.tags}")
    result = next_handler(job)
    print(f"  [AUDIT] finished job {job.id[:8]} — status={job.status.value}")
    return result


def payload_check_middleware(job: Job, next_handler):
    """Reject jobs with empty payloads."""
    if not job.payload:
        raise ValueError(f"Job {job.name} has an empty payload")
    return next_handler(job)


def main():
    stack = MiddlewareStack()
    stack.use(audit_middleware)
    stack.use(payload_check_middleware)
    stack.use(MiddlewareStack.timing())

    queue = JobQueue()
    jobs = [
        Job(name="process", payload={"count": 5},  tags=["batch"]),
        Job(name="process", payload={"count": 10}, tags=["batch"]),
    ]
    for job in jobs:
        queue.enqueue(job)

    # Wrap the raw handler through middleware
    raw_handler = _HANDLERS["process"]
    wrapped     = stack.wrap(raw_handler)

    worker = Worker(queue=queue)
    while True:
        job = queue.dequeue()
        if job is None:
            break
        job.mark_running()
        try:
            result = wrapped(job)
            job.mark_success(result)
        except Exception as exc:
            job.mark_failed(str(exc))
        print(f"  Result: {job.result}
")


if __name__ == "__main__":
    main()
