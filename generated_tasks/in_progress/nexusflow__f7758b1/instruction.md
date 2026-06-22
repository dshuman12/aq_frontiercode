# Task description

There is a correctness bug in the dead-letter queue implementation affecting retry logic.

The requeue mechanism supports configurable retry limits: `max_retries=None` (unlimited), `max_retries=0` (zero allowed), and `max_retries=N` (positive limit). The system is not correctly distinguishing between all three cases in production.

Identify and fix the bug so that:

- A task with `max_retries=None` requeues indefinitely (never exhausted).
- A task with `max_retries=0` never requeues (always exhausted).
- A task with `max_retries=N` requeues N times, then stops.

The fix must preserve the public method signatures, return types, and existing error-handling behavior. Do not alter unrelated requeue accounting, entry fields, or other module functions.

# Test guidelines

Run `python -m pytest tests/ -x -q --ignore=tests/test_auth --ignore=tests/test_db --ignore=tests/test_plugins --ignore=tests/test_tasks/test_scheduler.py` to verify the fix.

Your tests must cover the three configurations (None, 0, and positive N) with boundary cases where the count reaches or exceeds the limit. Ensure the requeue behavior is correct for each case.

# Lint guidelines

Ensure no new warnings are introduced; the suite runs with `filterwarnings = ["error"]`, so any warning will fail tests. Keep type hints and imports consistent with the rest of the module.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

# Constraints

- Only modify `nexusflow/tasks/deadletter.py` and add/modify `tests/test_tasks/test_deadletter.py`.
- Do **not** modify `tests/conftest.py`, `tests/__init__.py`, or any other existing test file.
- Do not modify any files outside of `nexusflow/tasks/` and `tests/test_tasks/`.
