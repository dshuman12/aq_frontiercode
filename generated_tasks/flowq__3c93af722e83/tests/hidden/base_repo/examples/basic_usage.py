"""examples/basic_usage.py — minimal FlowQ example."""

from flowq.models import Job, Priority
from flowq.queue import JobQueue
from flowq.storage import Storage
from flowq.worker import Worker, register


# 1. Register handlers
@register("greet")
def greet(payload: dict) -> str:
    name = payload.get("name", "world")
    return f"Hello, {name}!"


@register("add")
def add(payload: dict) -> int:
    return payload["a"] + payload["b"]


def main():
    storage = Storage("example.db")
    queue   = JobQueue()

    # 2. Create and persist jobs
    jobs = [
        Job(name="greet", payload={"name": "Alice"}, priority=Priority.HIGH),
        Job(name="greet", payload={"name": "Bob"}),
        Job(name="add",   payload={"a": 10, "b": 32}),
    ]
    for job in jobs:
        storage.save(job)
        queue.enqueue(job)

    print(f"Queued {len(jobs)} jobs")

    # 3. Run a worker synchronously until queue is empty
    worker = Worker(queue=queue, storage=storage)
    while True:
        job = queue.dequeue()
        if job is None:
            break
        worker.run_job(job)
        print(f"  {job.name}: {job.result!r}  [{job.status.value}]")

    # 4. Check counts
    counts = storage.count_by_status()
    print("\nFinal status counts:", counts)


if __name__ == "__main__":
    main()
