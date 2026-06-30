# Task description

FlowQ's job-group, workflow, and throttle subsystems have several defects that break test isolation and core behavior. Address the following observable problems across `flowq/job_groups.py`, `flowq/workflows.py`, and `flowq/throttle.py`.

`JobGroup(name, queue, storage)` must accept a positional name, queue, and storage. `add(handler, payload)` returns the created `Job`, tags it with a `group:<id>` marker, and raises `JobGroupError` once the group has been submitted. `submit_all()` enqueues every job, returns the count, and raises `JobGroupError` if called twice. Provide `stats()` returning a `GroupStats` with `total`, `success`, and a `success_rate` property; `is_complete()`; `__len__`; `to_dict()` exposing `id`, `name`, and `job_count`; and a `__repr__` including the group name.

`Workflow(name)` needs `add_step(name, handler, depends_on=None)` returning the step name and rejecting duplicates with `WorkflowError`. `validate()` raises `WorkflowError` for unknown dependencies and `CyclicDependencyError` for cycles; `topological_order()` honors dependencies. `WorkflowRunner(worker, storage).run(wf)` executes steps in order, returning a result whose `status` is a `WorkflowStatus`, with `step_results` mapping step names to `JobStatus` and `error` set on failure.

Fix `Storage` persistence so jobs with `timeout=None` are accepted, and ensure `Semaphore.acquire` in `throttle.py` does not block indefinitely. Tests must not leak state between runs.

# Test guidelines

Run `pytest`. Tests live in `tests/`, notably exercising job groups, workflows, and throttling. Add or update tests there when introducing behavior not already covered, including edge cases like duplicate submission, unknown/cyclic dependencies, failure propagation that stops a workflow, and `timeout=None` jobs round-tripping through storage. Ensure handler registries and storage fixtures do not leak between tests.

# Lint guidelines

Keep imports and exported names consistent with existing modules. Ensure new public symbols (`JobGroup`, `GroupStats`, `JobGroupError`, `Workflow`, `WorkflowRunner`, `WorkflowStatus`, `WorkflowError`, `CyclicDependencyError`, `WorkflowStep`) are importable from their modules and, where already listed, from `flowq/__init__.py`.

# Style guidelines

Match the existing dataclass and `from __future__ import annotations` conventions. Do not alter unrelated subsystems (queue, scheduler, CLI, dashboard) or change the `Job` model's public fields beyond accepting `timeout=None`. You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
