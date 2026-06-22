# Task description

The work-stealing deque in `pkg/queue/deque.go` exhibits a data race under concurrent steal and pop operations, and unbounded internal bookkeeping causes memory to grow without limit during long-running simulations. Address the following:

- Eliminate the data race so that concurrent owner-side `Push`/`Pop` and thief-side `Steal` calls are correctly synchronized and pass the race detector.
- Bound the SWIM probe history retained in `pkg/membership/swim.go` so it cannot grow without limit; older entries should be evicted once a reasonable cap is reached.
- Bound the discrete-event log in `pkg/sim/network.go` similarly, so long simulations do not accumulate events indefinitely.

Existing public behavior must remain intact: queue ordering semantics, membership state transitions, and simulation event delivery should be unchanged for callers. Only the concurrency safety and the retention limits change. Keep the zero-dependency, stdlib-only constraint and do not alter exported signatures unless a bound parameter is genuinely required.

# Test guidelines

Run `go test ./...` to validate. Use `go test -race ./pkg/queue/...` to confirm the deque is race-free under contention.

Add or extend tests in `pkg/queue` for concurrent steal/pop correctness, and in `pkg/membership` for probe-history eviction once the cap is exceeded. Cover edge cases such as stealing from an empty or single-element deque and history bounds at exactly the cap boundary. Ensure existing tests across all packages continue to pass.

# Lint guidelines

Run `gofmt -l .` and ensure it reports no files; format any flagged files in place. Run `go vet ./...` and resolve all reported issues before completing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
