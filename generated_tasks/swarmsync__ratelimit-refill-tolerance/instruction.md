# Task description

The concurrent token bucket regression test in `pkg/ratelimit` is too strict for a limiter that refills based on elapsed wall-clock time while goroutines are calling `Allow` in parallel. It asserts an exact allowed count, but scheduling and refill timing can legitimately move that count by a small amount on slow or busy machines. The result is a flaky test, not a runtime limiter bug.

Relax the assertion into a tight, justified tolerance band that still verifies the limiter's real invariants. The test must continue to fail if the limiter grants zero throughput, grants far beyond the configured burst plus plausible refill, or ignores the burst cap. It should pass reliably under repeated concurrent runs and the race detector. Do not change token bucket runtime behavior, public APIs, refill math, or default configuration; this task is about making the test reflect the existing concurrent timing contract.

Confine changes to the relevant rate-limit test file unless the existing test helpers genuinely require a narrow local adjustment.

# Test guidelines

Run `go test ./...` from the repository root. Also run the focused stress command `go test ./pkg/ratelimit -run Concurrent -race -count=20` and make sure it is stable. Update the concurrent test so it documents the lower and upper bounds it expects, and keep existing single-threaded tests for burst limits, refill over time, exhausted tokens, and zero-token cases intact.

Avoid sleeping longer than necessary. Prefer deterministic setup and clearly named bounds over broad assertions that would let real limiter regressions slip through.

# Lint guidelines

Run `gofmt -l pkg/ratelimit` and `go vet ./pkg/ratelimit/...`; both should report no issues.

# Style guidelines

Follow the existing Go test style in `pkg/ratelimit`. Do not alter production limiter code, public configuration, package APIs, unrelated tests, or generated files.

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Include only the files required to make the concurrent tolerance test stable and meaningful. Exclude unrelated cleanup and formatting churn.
