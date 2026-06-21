# Task description

`CircuitBreaker` and `RetryPolicy` in `nexusflow/utils/retry.py` decide whether an exception is "expected" by comparing it against a configured set of exception classes. Both currently use exact `type()` identity checks, so only the precise registered class matches. When application code raises a subclass of a configured exception, the circuit breaker fails to record it and the retry policy fails to retry it — the exception slips through both safety mechanisms.

Update the comparison logic so exception-hierarchy matching works: an exception that is an instance of (or subclass of) any configured exception type must be recognised. Concretely, `CircuitBreaker.record_failure` should count subclass instances toward its failure threshold and state transitions, and `RetryPolicy.should_retry` should return `True` for subclass instances of its retryable exceptions (and continue to respect its non-retryable/excluded set with the same subclass semantics).

Apply the fix consistently wherever this matching occurs in the retry/circuit-breaking stack, including the worker integration in `nexusflow/tasks/worker.py` if it performs its own exception-set comparisons. Keep all existing public signatures, return types, and state-machine behaviour for exactly-matching exceptions unchanged; only broaden matching to include subclasses.

# Test guidelines

Run `python -m pytest tests/ -x -q` and ensure all tests pass. Add or extend tests under `tests/test_utils/test_retry.py` and `tests/test_tasks/test_worker.py` to cover subclass exceptions: a subclass of a retryable error should be retried, a subclass of a configured circuit-breaker exception should advance the breaker toward opening, and exact-match plus excluded-exception behaviour must remain correct. Avoid weakening existing assertions.

# Lint guidelines

No separate linter is configured; keep imports ordered and remove unused names. Ensure `from __future__ import annotations` style and existing type hints stay intact.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch. Match the surrounding code conventions and avoid unrelated refactors.
