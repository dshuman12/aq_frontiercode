# Task description

`Histogram.Observe` in `internal/metrics/metrics.go` assigns boundary
observations to the wrong bucket. The histogram uses cumulative
semantics: each bucket counts every observation whose value is less than
or equal to its configured upper bound. Currently a value that exactly
equals a bucket's upper bound is treated as greater than that bound, so
it skips the matching bucket and lands in the next higher bucket (or in
the overflow count when it equals the largest bound).

Fix the bucket-selection logic so an observation equal to a boundary is
counted in the bucket whose upper bound it equals, and in every bucket
above it, consistent with cumulative histograms. Values strictly between
two boundaries, values below the smallest bound, and values above the
largest bound must keep their current placement, and the total
observation count and running sum must remain unchanged.

Keep the existing `Histogram` API, exported names, and bucket
configuration intact; this is purely a comparison-boundary fix. Do not
alter unrelated metric types or other packages.

# Test guidelines

Run `go test ./internal/metrics/...` to validate the change. Add or
extend tests under `internal/metrics` covering observations exactly on
each bucket boundary, just below and just above a boundary, a value
equal to the largest bound, and values that fall into the overflow.
Assert per-bucket cumulative counts as well as the unchanged total count
and sum.

# Lint guidelines

Run `make vet` and `make fmt` before submitting. The full suite via
`make ci` (which runs `go vet ./...` then the race-enabled tests) must
pass cleanly.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from
this state. Do not rebase or start from master, main, or any other
branch.
