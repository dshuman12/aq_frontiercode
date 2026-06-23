# Task description

The enable-wins flag (`EWFlag`) in `pkg/crdt/ewflag.go` violates its defining guarantee under concurrent updates. An EWFlag tracks a set of enable "dots" (per-node `(nodeID, counter)` observations); the flag reads as enabled whenever at least one enable dot is active. Disabling records the set of currently observed dots so a remove only clears what it has seen, while a concurrent enable—producing an unseen dot—survives. This is the enable-wins property.

The current `Merge` mishandles the case where the other replica concurrently disabled the flag and arrives with an empty dot set: merging clears a local enable dot that the other replica never observed, so a concurrent enable no longer wins over a concurrent disable. Symmetric ordering (merging in the other direction) and fully-converged states still behave correctly, which is why the defect only surfaces under a genuine concurrent enable/disable.

Fix `Merge` so that an enable dot is dropped only when it is causally dominated (observed and removed) by the other replica, never merely because the other replica carries no dots. Keep the existing exported method set, constructor, and value semantics (`Enabled() bool`) unchanged; the value must remain a deterministic function of the merged dot set, and convergence between any two replicas must hold regardless of merge order.

# Test guidelines

Run `go test ./pkg/crdt/...`. Add or extend table-driven tests in `pkg/crdt` covering: a concurrent enable on one replica versus a disable (empty dot set) on another, asserting the merged flag stays enabled in both merge directions; a disable that does observe an enable correctly clearing it; and repeated merges remaining idempotent and commutative.

# Lint guidelines

Run `gofmt -l pkg/crdt` and `go vet ./pkg/crdt/...`; both must report no issues before completion.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
