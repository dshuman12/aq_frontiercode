# Task description

The retry backoff in `internal/jobqueue/jobqueue.go` grows one doubling too many. The exponential doubling loop runs one extra iteration relative to the number of attempts, so after the very first failure the computed delay is already twice what it should be, and every subsequent retry is similarly inflated.

Fix the backoff computation so the delay tracks the attempt count correctly: the first retry waits the configured base delay, the second waits twice the base, the third four times the base, and so on, doubling once per additional attempt. Any configured maximum delay cap and jitter behavior must continue to apply as before, and the public function signatures and exported names in the package must stay unchanged. This is a focused arithmetic fix; do not restructure the queue, change how attempts are tracked, or alter unrelated scheduling logic.

Success is observable as a sequence of retry delays that begins at the base delay and doubles per attempt, rather than starting at double the base.

# Test guidelines

Run `go test ./internal/jobqueue/...` and ensure it passes.

Add or update tests in `internal/jobqueue` that assert the exact delay produced for the first several attempts, confirming the first retry equals the base delay and each subsequent retry doubles. Cover the boundary where the maximum delay cap clamps the growth, and a zero or single-attempt case so the off-by-one cannot silently return.

# Lint guidelines

Run `go build ./...` and `go vet ./...` and resolve any reported issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
