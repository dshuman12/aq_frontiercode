# Task description

A recent change regressed the retry-backoff policy in the workflow engine. The `NextRetry` function in `internal/engine/retry.go` now produces delays and an attempt count that no longer match the `types.RetryPolicy` fields. Two failures are observable:

- The first retry already applies the backoff coefficient instead of waiting the base `InitialInterval`, and every later delay carries the same extra factor, so retries wait longer than configured.
- A failing activity or workflow is retried one time beyond what `MaxAttempts` permits.

Fix `NextRetry` so the backoff schedule and the attempt limit are exactly what the `RetryPolicy` fields (`InitialInterval`, `BackoffCoefficient`, `MaxInterval`, `MaxAttempts`) are meant to produce, with no off-by-one in either the delay growth or the attempt count. Keep the existing `NextRetry` signature and its `(time.Duration, bool)` return so callers in `internal/engine/tasks.go` (`CompleteActivityTask`) continue to compile. `IsRetryable` behavior must remain unchanged.

# Test guidelines

Add a test under `internal/engine/` that pins the corrected backoff sequence (base interval, coefficient growth, cap clamping) and the exact `MaxAttempts` boundary, including the "no extra retry" edge. Run `go test ./internal/engine/` to confirm; use `make test` for the full race-enabled run. Cover both the retryable activity path and a zero/unset-policy default.

# Lint guidelines

Run `make vet` (or `make ci`) and ensure it passes cleanly. Format with `make fmt` before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch. Limit changes to retry logic and its tests; do not alter unrelated engine files, storage, or public types.
