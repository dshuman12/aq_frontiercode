# Task description

The concurrent token bucket test in `pkg/ratelimit` is flaky. It exercises the token bucket limiter under parallel goroutines while the bucket refills tokens based on elapsed wall-clock time, and it asserts on the exact number of allowed requests. Because refill timing races with the concurrent `Allow` calls, the count can legitimately drift by a small amount across runs, causing spurious failures on busy or slow CI machines.

Relax the concurrency assertion so it tolerates the inherent rate-refill race rather than demanding an exact allowed count. The test should still verify the limiter's essential guarantees: it must never grant more than the configured burst plus the tokens that could plausibly refill during the test window, and it must grant at least the initial burst. Choose a tolerance band that reflects realistic refill behavior so the test passes reliably under load without becoming so loose that genuine regressions (e.g., unlimited granting or zero throughput) slip through.

Confine changes to the test file. Do not alter `bucket.go` or change the limiter's runtime behavior, public API, or default configuration.

# Test guidelines

Run `go test ./...` for the full suite, and focus on `pkg/ratelimit` for this change. Verify stability by repeating the concurrency test with `go test ./pkg/ratelimit -run Concurrent -race -count=20`; it should pass consistently. Keep existing single-threaded and edge-case coverage in `bucket_test.go` intact, including burst limits, refill over time, and zero/exhausted-token paths.

# Lint guidelines

Run `gofmt -l .` and ensure it reports no files. Run `go vet ./...` and confirm it passes clean.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
