# Task description

Fix the FlowQ regressions around shared state between tests, nullable job timeouts, and non-blocking concurrency acquisition. The public API should continue to support creating jobs and workflow/job-group members with `timeout=None` to mean “no per-job timeout”; persisting and reloading those jobs must not fail due to SQLite constraints or type assumptions, and serialization should preserve the semantic value rather than silently replacing it with a default. Review the workflow and job-group helpers for places where generated jobs inherit timeout values or reuse mutable/shared objects, and ensure separate test cases or separate workflow/group instances cannot affect one another through lingering queues, jobs, dependency maps, or module-level state.

Also correct the semaphore-based throttling behavior in `flowq/throttle.py`. `ConcurrencyLimiter.acquire(...)` should respect its advertised blocking contract: callers that request a non-blocking acquire should get an immediate boolean result, callers that provide a finite timeout should wait up to that amount, and callers that pass `timeout=None` with blocking enabled should block normally instead of passing an invalid timeout value to `threading.Semaphore.acquire`. Keep existing public class names and method signatures intact unless the current signature already accepts optional timeout values; the observable behavior should match Python’s semaphore semantics while remaining safe for repeated test execution.

# Test guidelines

Run the full visible validation workflow:

```bash
pytest
```

The repository config in `pytest.ini` already points pytest at `tests` and enables verbose output. Add or update tests under `tests/` when the behavior is not already covered, especially `tests/test_job_groups.py`, `tests/test_throttle.py`, and `tests/test_workflows.py` for the affected areas.

Useful coverage includes: saving/loading jobs or workflow-created jobs with `timeout=None`; constructing multiple groups/workflows in one process without cross-contamination; non-blocking semaphore acquisition when capacity is exhausted; finite-timeout acquisition returning promptly; and blocking acquisition with `timeout=None` succeeding after another thread releases capacity. Avoid tests that depend on long sleeps or wall-clock timing margins; use short timeouts, events, and joins so the suite remains stable with `pytest-timeout` installed.

# Lint guidelines

There is no separate lint command configured in this repository. Treat `pytest` as the required validation command, and run any focused subset first only as a debugging aid before the full suite. Keep the working tree free of generated artifacts such as local SQLite databases, cache directories, coverage files, or temporary files created while reproducing the issue.

# Style guidelines

Preserve FlowQ’s existing lightweight, standard-library-oriented implementation style and Python 3.10 compatibility from `setup.py`. Prefer small, local fixes in `flowq/job_groups.py`, `flowq/throttle.py`, `flowq/workflows.py`, and any directly necessary persistence/model code over broad rewrites or new dependencies.

Maintain current exported names, dataclass fields, and user-facing method signatures. Where nullable timeout handling touches type annotations or serialization, keep the contract consistent across `Job`, storage, workflow, and group code so callers see the same value they supplied. Do not introduce global cleanup hooks that mask state-sharing bugs; isolate mutable defaults and per-instance state at construction time.
