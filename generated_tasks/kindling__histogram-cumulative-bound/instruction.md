# Task description

`Histogram.CumulativeBelow` in `internal/histogram/histogram.go` returns how many observations fall at or below a queried bound by summing the counts of buckets whose inclusive upper bound lies within range. The current implementation has an off-by-one error: when the queried value lands exactly on a configured bucket boundary, the bucket whose upper bound equals that value is excluded, so the cumulative total under-counts by that bucket's contribution.

Make the comparison inclusive so that a query landing exactly on a bound counts the matching bucket. Queries between boundaries, below the lowest bound, and above the highest bound must keep their current results, and the returned type and method signature must stay unchanged. Per-bucket counts, totals, and observation recording are correct and must not be altered; only the cumulative summation logic should change. Downstream percentile/quantile readouts that build on this method should become correct as a side effect without any change to their own code.

Keep the fix minimal and confined to this package; do not touch unrelated histogram fields or other internal packages.

# Test guidelines

Run `go test ./internal/histogram/...` and ensure it passes.

Add or extend table-driven cases in `internal/histogram` covering: a query exactly on each configured boundary (counts the matching bucket), a query strictly between two boundaries, a query below the smallest bound (zero), and a query at or above the largest bound (full total). Include a histogram with several populated buckets so the cumulative sum across multiple boundaries is exercised.

# Lint guidelines

Run `go build ./...`, `go vet ./...`, and `gofmt` so the tree stays formatted and vet-clean before submitting.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from `main` or any other branch.
