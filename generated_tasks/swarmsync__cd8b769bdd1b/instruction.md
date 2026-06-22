# Task description

Add protocol period scaling to the `pkg/membership` package so SWIM parameters adapt to cluster size instead of using fixed values. Introduce a new file `pkg/membership/scaling.go` exposing:

- `ScaledConfig`: a configuration type that adjusts core SWIM parameters (such as the protocol period and related timing/fanout values) logarithmically as the number of nodes grows. Larger clusters should yield longer periods so per-node overhead stays bounded, while small clusters remain responsive.
- `DefaultScaling()`: returns a `ScaledConfig` populated with sensible log2-based defaults that produce stable, monotonic scaling.
- `ClusterSizeEstimator`: tracks observed nodes over time and reports a current size estimate that the scaling logic can consume.

Scaling must be deterministic and monotonic: a larger cluster size never produces a smaller protocol period. Keep the API self-contained within `pkg/membership` and do not alter existing `member.go` or `swim.go` behavior or their exported signatures. Use the standard library only.

# Test guidelines

Run `go test ./...` to validate. Add or extend tests in `pkg/membership` covering: default values from `DefaultScaling()`, monotonic period growth across increasing sizes, log2 boundary cases (sizes of 1, powers of two, and large counts), and the estimator's behavior as nodes are added or repeated. Cover edge cases such as a zero or single-node cluster without panics or division errors.

# Lint guidelines

Run `gofmt -l .` and ensure it reports no files, and run `go vet ./...` with no findings before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
