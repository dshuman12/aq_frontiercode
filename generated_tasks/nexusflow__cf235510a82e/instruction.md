# Task description

The exponential backoff function in `nexusflow/utils/retry.py` has a **bug** when retry attempts are very high. It computes:
```
delay = base * (exp_factor ** attempt_number)
```

For high attempt numbers, the exponent grows so large that it causes **overflow** or **nonsensical delays** (longer than the configured maximum).

**Your task:** Fix the backoff calculation to:
1. **Cap the delay** at the configured maximum delay ceiling
2. **Prevent overflow** for high attempt numbers (e.g., attempt 100+)
3. **Preserve existing behavior** for normal (low) attempt counts

**Hint:** Apply a `min()` cap to clamp the computed delay to the maximum before it overflows. For example, if the delay would be 1e308 seconds but max_delay is 300, return 300 instead.

Keep all public function signatures unchanged.

# Test guidelines

Run `pytest tests/test_utils/test_retry.py` to validate. The existing tests should pass once you fix the overflow issue. Test that:
- High attempt numbers (e.g., 100) return the max_delay, not an overflow error
- Low attempt numbers still work correctly (no regression)

# Lint guidelines

No separate linter is configured. Ensure the test suite imports and runs cleanly; note that `filterwarnings = ["error"]` is set, so any new warning will fail the run.

# Style guidelines

Match the existing module conventions: `from __future__ import annotations`, full type hints, and the established class/function structure. Confine changes to `nexusflow/utils/retry.py` and its test file; do not modify unrelated utilities or alter the public API. You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master or main.
