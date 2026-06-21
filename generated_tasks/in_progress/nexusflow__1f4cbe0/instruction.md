# Task description

The cron scheduler in `nexusflow/tasks/scheduler.py` computes next-run times using naive `datetime` arithmetic combined with a fixed UTC offset. This approach breaks whenever the configured timezone observes daylight saving time: because the fixed offset cannot track DST transitions, scheduled tasks resolve to incorrect UTC epochs around spring-forward and fall-back boundaries, firing an hour early or late.

Make next-run computation fully timezone-aware so that the resulting UTC epoch is correct across DST transitions. Resolve wall-clock cron times within the task's configured timezone using a real zone implementation (for example `zoneinfo.ZoneInfo`) rather than a constant offset, then convert to UTC for scheduling. Times that fall in a skipped or repeated wall-clock window must resolve to a sensible, well-defined UTC instant rather than a naive miscalculation.

Preserve the existing public interface of the scheduler: method names, argument lists, and return types (UTC epoch seconds / aware datetimes) must remain unchanged so callers and other task components are unaffected. Behavior for UTC and fixed-offset zones without DST must stay identical to today. Keep the change confined to the scheduler; do not modify the queue, worker, or dead letter modules.

# Test guidelines

Run `python -m pytest tests/test_tasks/ -x -q` and ensure it passes.

Extend `tests/test_tasks/test_scheduler.py` to cover DST behavior: spring-forward (a skipped local hour), fall-back (a repeated local hour), and at least one non-DST zone to confirm unchanged behavior. Assert on the computed UTC epoch, not on naive local values. Avoid relying on the host machine's local timezone—construct zones explicitly so tests are deterministic.

# Lint guidelines

Ensure new code keeps existing type annotations consistent and introduces no unused imports. `filterwarnings = ["error"]` is enabled, so resolve any deprecation warnings rather than suppressing them.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Match the module's existing style: `from __future__ import annotations`, standard-library imports only, and dataclass/typing conventions already present in the tasks package.

# Constraints

- Only modify the target source file(s) and add/modify tests in `tests/test_tasks/`.
- Do **not** modify `tests/conftest.py`, `tests/__init__.py`, or any other existing test file.
- Do not modify files outside the target module(s) and `tests/test_tasks/`.
