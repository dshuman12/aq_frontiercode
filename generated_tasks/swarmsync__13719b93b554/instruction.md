# Task description

Add a Lamport logical clock implementation to the `clock` package in a new file `pkg/clock/lamport.go`. This is the simplest causal clock in the package and should sit alongside the existing vector and hybrid logical clocks.

Implement `LamportClock` so it satisfies the existing `Clock` interface (`Tick`, `Witness`, `Now`) and exposes additional `NodeID() string` and `Value() uint64` accessors, matching the accessor conventions used by `VectorClock`. Provide a `NewLamportClock(nodeID string)` constructor. `Tick` increments the local counter and returns the new timestamp; `Witness` takes the max of the local and remote counters then increments by one to preserve causal ordering; `Now` returns the current timestamp without advancing. Guard mutable state with a mutex as the other clocks do.

Implement `LamportTimestamp` with exported `Counter uint64` and `NodeID string` fields, satisfying the `Timestamp` interface. `Compare` must order counter-first and fall back to `NodeID` as a tiebreaker, returning `Before`/`After`/`Equal` (and `Concurrent` for a non-`LamportTimestamp` argument, as the other types do). `Bytes` must serialize deterministically for network use.

Keep existing files and behavior unchanged.

# Test guidelines

Run `go test ./...`. Add or extend tests in `pkg/clock` (e.g. `pkg/clock/clock_test.go`) covering `Tick` monotonicity, `Witness` advancing past a higher remote counter, `Now` not advancing, `Compare` counter ordering and `NodeID` tiebreak, and round-trippable `Bytes` output. Use the `errShortData` sentinel if you add a parse helper.

# Lint guidelines

Run `go vet ./...` and `gofmt -l .`; resolve any reported issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
