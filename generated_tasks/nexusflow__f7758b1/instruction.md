# Task description

The `DeadLetterQueue.can_requeue` method in `nexusflow/tasks/deadletter.py` incorrectly treats `max_retries=0` as unlimited retries. A task added to the dead letter queue with `max_retries=0` must never be requeued, but the current logic returns `True` from `can_requeue`, allowing the task to be requeued indefinitely.

Fix the retry-limit semantics so that:

- `max_retries=0` means no requeue is ever allowed (`can_requeue` returns `False` regardless of the current retry count).
- `max_retries=None` continues to mean unlimited retries (`can_requeue` keeps returning `True`).
- Any positive `max_retries` still permits requeueing until the retry count reaches that limit.

The likely cause is a falsy check (e.g. `if not max_retries`) that conflates `0` with `None`. Distinguish the two cases explicitly so the boundary at zero behaves correctly.

Keep the public signature and return type of `can_requeue` unchanged, and do not alter unrelated requeue accounting, stored entry fields, or other methods in the module. Only the zero-versus-unlimited decision should change.

# Test guidelines

Run the visible test command `python -m pytest tests/ -x -q` and confirm the suite passes.

Add or extend tests in `tests/test_tasks/test_deadletter.py` covering the three cases: `max_retries=0` is never requeueable, `max_retries=None` is always requeueable, and a positive limit allows requeueing only until the count is reached. Include the boundary where the retry count equals the limit.

# Lint guidelines

Ensure no new warnings are introduced; the suite runs with `filterwarnings = ["error"]`, so any warning will fail tests. Keep type hints and imports consistent with the rest of the module.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
