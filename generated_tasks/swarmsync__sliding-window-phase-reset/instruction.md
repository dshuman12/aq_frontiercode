# Task description

The sliding-window rate limiter in `pkg/ratelimit/bucket.go` over-counts requests immediately after a window rotation. The limiter approximates the current rate by interpolating between the previous window's count and the current window's count, weighted by how far into the current window we are. When at least one full window has elapsed since the recorded window origin, the code resets the origin to the current instant. This zeroes the elapsed fraction, so the interpolation weight gives the previous window its full count and legitimate requests are denied right after rotation.

Fix the rotation logic so the window origin advances forward by exactly one window duration (sliding the window), rather than jumping to the current instant. After a single rotation, the prior count should become the count from the just-ended window and the interpolation weight should reflect the true position within the new window. When more than one full window has elapsed with no activity, the limiter must treat both windows as empty.

Keep the public constructor and method signatures unchanged, and preserve steady-state behavior that does not cross a rotation boundary.

# Test guidelines

Run `go test ./pkg/ratelimit/...` and ensure it passes. Add or extend tests in `pkg/ratelimit` to cover requests that arrive just after a single window rotation, behavior when multiple windows elapse with no traffic, and that the interpolation weight is correct mid-window. Tests should drive time deterministically so rotation boundaries are exercised without flakiness, and should confirm steady-state limiting within a single window still behaves as before.

# Lint guidelines

Run `go vet ./pkg/ratelimit/...` and `gofmt -l pkg/ratelimit` (which must report no files) before completing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch. Limit changes to the `pkg/ratelimit` package and avoid touching unrelated rate limiter strategies or other packages.
