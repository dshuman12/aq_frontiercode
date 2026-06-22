# Task description

The cron scheduler fails to correctly compute next-run times when the task is configured for a timezone that observes daylight saving time. Scheduled tasks fire at incorrect times around DST boundaries (typically off by one hour).

Identify and fix the timezone handling in the scheduler so that:

- Cron schedules respect DST transitions in the configured timezone
- The computed UTC epoch for the next run is correct even around spring-forward and fall-back dates
- The fix works for any configured timezone, including UTC and fixed offsets
- Public method signatures and return types are unchanged

Do not modify queue, worker, or dead-letter modules. Keep changes confined to the scheduler.

# Test guidelines

Run `python -m pytest tests/ -x -q --ignore=tests/test_auth --ignore=tests/test_db --ignore=tests/test_plugins` to verify the fix passes all tests.

Add tests that verify correct UTC epoch computation around DST transitions (both spring-forward and fall-back scenarios), and ensure non-DST timezones work correctly. Tests must use explicit timezone objects, not the host machine's local timezone.

# Lint guidelines

Ensure new code keeps existing type annotations consistent and introduces no unused imports. `filterwarnings = ["error"]` is enabled, so resolve any deprecation warnings rather than suppressing them.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Match the module's existing style: `from __future__ import annotations`, standard-library imports only, and dataclass/typing conventions already present in the tasks package.

# Constraints

- Only modify the target source file(s) and add/modify tests in `tests/test_tasks/`.
- Do **not** modify `tests/conftest.py`, `tests/__init__.py`, or any other existing test file.
- Do not modify files outside the target module(s) and `tests/test_tasks/`.
