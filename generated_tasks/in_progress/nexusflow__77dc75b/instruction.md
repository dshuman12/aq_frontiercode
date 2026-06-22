# Task description

The circuit breaker and retry policy components fail to recognize exception subclasses. When application code raises a subclass of a configured exception (e.g., `HTTPError` when `requests.RequestException` is configured), the safety mechanisms don't respond: the circuit breaker doesn't record the failure and the retry policy doesn't retry.

Fix the exception-matching logic so that:

- Subclasses of configured exception types are recognized and handled correctly
- The circuit breaker counts subclass failures toward its state transitions
- The retry policy retries on subclass instances of retryable exceptions
- Excluded exception logic continues to work correctly for subclasses
- Public signatures, return types, and exact-match behavior remain unchanged

Review the retry/circuit-breaking stack to ensure matching is applied consistently where needed.

# Test guidelines

Run `python -m pytest tests/ -x -q --ignore=tests/test_auth` to verify the fix.

Add tests for exception subclass handling: verify that subclasses of retryable exceptions are retried, subclasses of circuit-breaker exceptions advance state transitions, and that excluded exceptions work correctly for both base and subclass types. Existing exact-match behavior must remain unchanged.

# Lint guidelines

No separate linter is configured; keep imports ordered and remove unused names. Ensure `from __future__ import annotations` style and existing type hints stay intact.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch. Match the surrounding code conventions and avoid unrelated refactors.

# Constraints

- Only modify the target source file(s) and add/modify new test files.
- Do **not** modify `tests/conftest.py`, `tests/__init__.py`, or any other existing test file.
- Do not modify existing source files outside the target module(s).
