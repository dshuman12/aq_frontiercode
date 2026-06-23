# Task description

The bounded-load consistent hashing implementation in `pkg/consistent/consistent.go` tracks two related quantities: a per-node load counter and an aggregate total-load counter representing the number of outstanding key assignments across the ring. These must stay in lockstep so that the reported total always equals the sum of the per-node loads.

There is a discrepancy on the normal assignment path. When a key is placed on the first candidate node that is within its load bound, the per-node load is incremented but the aggregate total is left unchanged. The fallback path that handles the over-bound case (where the walk wraps to a node that exceeds the bound) updates both counters, so the bug only surfaces when assignments succeed without hitting the bound — which is the common case.

Fix the assignment logic so the aggregate total-load counter is incremented exactly once per successful assignment, regardless of which path is taken. Decrement/removal accounting and the existing bound-checking behavior must remain unchanged, and the exported method signatures and return values must stay as they are.

# Test guidelines

Run `go test ./pkg/consistent/...` to validate. Add or extend tests in `pkg/consistent` so they assert that the reported total load equals the sum of per-node loads after a sequence of within-bound assignments, not only when the load bound is hit. Cover repeated assignments of distinct keys, mixed assignment-and-removal sequences, and the boundary between the within-bound and over-bound paths to lock in the invariant and prevent regressions.

# Lint guidelines

Run `gofmt -l .` and `go vet ./pkg/consistent/...` and ensure both report no issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
