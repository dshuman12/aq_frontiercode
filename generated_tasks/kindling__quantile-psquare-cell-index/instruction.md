# Task description

The P-square quantile estimator in `internal/quantile/quantile.go` maintains five markers and, after the bootstrap phase, updates them on each `Observe` call. It first calls `findCell` to determine which inter-marker gap a new sample lands in, then increments the marker positions above that cell before applying the parabolic/linear adjustment.

There is a bug in how the cell index is computed when a sample exceeds the current maximum (the highest marker). In that case `findCell` returns an index that is off, so the top interior marker is no longer incremented as it should be. Its desired position then drifts away from its actual position, and on a monotonically increasing stream `Value()` stays stuck near the bootstrap estimate instead of converging toward the true quantile.

Correct the cell selection so that a new-maximum sample is attributed to the topmost cell and the highest interior marker keeps advancing. The estimate should track the quantile of an increasing stream. Keep the marker count at five, the existing exported method set (`Observe`, `Value`), and the bootstrap behavior unchanged; this should be a localized fix to the cell-index logic.

# Test guidelines

Run `go test ./internal/quantile/...` to validate. Add or extend tests in `internal/quantile` to cover new-maximum and new-minimum samples, monotonically increasing and decreasing streams, and convergence of `Value()` toward a known quantile within tolerance. Confirm prior cases (uniform/random inputs, bootstrap window) still pass.

# Lint guidelines

Run `go vet ./internal/quantile/...` and `gofmt -l internal/quantile` (expect no output) before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from `main` or any other branch.
