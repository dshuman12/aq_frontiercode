# Task description

`HybridLogicalClock.Witness` in `pkg/clock/hlc.go` merges an observed remote HLC timestamp into the local clock. An HLC timestamp combines a physical wall-clock component with a logical counter that breaks ties when wall times are equal. The merge picks the maximum wall time among the local last wall time, the remote wall time, and the current physical reading, then derives the logical counter so the result strictly succeeds every event it has observed.

A defect exists in the tie case: when the chosen wall time equals **both** the local last wall time and the remote wall time, the logical counter must advance past the **larger** of the local and remote logical counters. The current code advances only past the local counter. As a result, witnessing a remote event with a higher logical counter at the same wall time yields a timestamp that does not strictly succeed the remote one, breaking causal monotonicity.

Fix the logical-counter selection so the returned timestamp strictly follows both observed timestamps in all wall-time relationships (chosen wall time greater than both, equal to one, or equal to both). Keep the existing `Clock`/`Timestamp` interfaces, exported names, locking, and serialization format unchanged.

# Test guidelines

Run `go test ./pkg/clock/...` to validate. Add or extend table-driven cases in `pkg/clock` covering the Witness tie scenarios: remote logical counter higher, lower, and equal at the same wall time, and cases where the physical clock advances past both. Assert via `Compare` that the witnessed timestamp returns `After` relative to the remote timestamp and that repeated witnessing stays monotonic. Avoid relying on real wall-clock sleeps; prefer an injectable or deterministic time source if one exists.

# Lint guidelines

Run `go vet ./pkg/clock/...` and `gofmt -l pkg/clock` (expect no listed files) before finishing. Resolve any reported issues without suppressing them.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
