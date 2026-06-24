# Task description

`Histogram.CumulativeBelow` in `internal/histogram/histogram.go` undercounts observations at bucket boundaries. When the requested bound is exactly equal to a bucket's bound, that bucket is currently excluded from the running total, so the function stops one bucket too early and reports fewer observations than it should.

The documented contract is that `CumulativeBelow` returns the count of all observations recorded in buckets whose bound is at or below the given bound, inclusive of any bucket whose bound equals the argument. Adjust the accumulation logic so the boundary bucket is counted.

Keep the existing function signature, exported name, and return type unchanged; only the boundary handling should change. Buckets ordering, observation recording, and any other histogram methods must keep their current behavior. A bound that falls strictly between two bucket bounds, a bound below the smallest bucket, and a bound at or above the largest bucket should all continue to behave consistently with the inclusive definition.

# Test guidelines

Run `go test ./internal/histogram/...` to validate the change.

Add or extend tests in `internal/histogram` so they cover the boundary case where the requested bound equals a bucket's bound, a bound between buckets, a bound below the first bucket, and a bound at or above the last bucket. Confirm the inclusive count is returned in each case and that existing observation-recording behavior is unaffected.

# Lint guidelines

Run `go vet ./internal/histogram/...` and `go build ./...` and ensure both pass cleanly with no new warnings.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from `main` or any other branch.

Match the surrounding Go style: tab indentation, keep doc comments on exported identifiers accurate, and limit the change to the boundary accumulation logic without reformatting unrelated code.
