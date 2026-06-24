# Task description

`NextRetry` in `internal/engine/retry.go` computes exponential backoff with an off-by-one exponent. The first retry (attempt 1) already waits `BackoffCoefficient * InitialInterval` instead of exactly `InitialInterval`, so every returned delay is scaled by one extra factor of the coefficient before the `MaxInterval` ceiling is applied.

Correct the growth so the delays follow:

- attempt 1 → `InitialInterval`
- attempt 2 → `InitialInterval * BackoffCoefficient`
- attempt 3 → `InitialInterval * BackoffCoefficient^2`
- attempt N → `InitialInterval * BackoffCoefficient^(N-1)`

Each computed delay must still be clamped to `MaxInterval` when configured. Keep the existing guards for zero or invalid configuration (non-positive intervals, missing or <= 1 coefficient, exhausted `MaximumAttempts`) and the `(time.Duration, bool)` return contract unchanged, so callers like `CompleteActivityTask` continue to schedule retries as before. Only the exponent applied to `BackoffCoefficient` should change; do not alter the retryability rules in `IsRetryable` or any other engine behavior.

# Test guidelines

Run `go test ./internal/engine/...` to validate. Cover backoff progression across the first several attempts, confirm attempt 1 returns exactly `InitialInterval`, verify clamping to `MaxInterval`, and confirm the `ok` flag is false once attempts are exhausted or the config is invalid. Add or extend tests in `internal/engine` rather than relying on existing coverage.

# Lint guidelines

Run `make vet` (`go vet ./...`) and `make fmt` (`gofmt -s -w .`) so the package stays vet-clean and gofmt-formatted.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
