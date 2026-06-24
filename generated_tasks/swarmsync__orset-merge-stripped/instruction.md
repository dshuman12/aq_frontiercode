# Task description

The `ORSet` in `pkg/crdt/set.go` is an observed-remove set with add-wins semantics, where each element is tracked by a set of `ORTag{NodeID, Counter}` tags. Its `Merge` does not converge: when two replicas operate concurrently on different node IDs and then merge, the result depends on merge order and some concurrently-added elements are lost, so `Merge` is neither commutative nor idempotent.

Diagnose the defect in `Merge` yourself and fix it so the type converges — merging is commutative, associative, and idempotent — while preserving add-wins semantics, observed-remove (tombstone) behavior, disjoint-element merges, and the existing `ORTag` structure and exported method set. Keep the locking discipline consistent with the other CRDTs in this package. Do not change unrelated CRDTs or other packages.

# Test guidelines

Run `go test ./pkg/crdt/...`. Add or extend tests under `pkg/crdt` that add the same element on two different node IDs, merge in both orders, and assert the merged set and its tag accounting are identical and stable under re-merge; cover disjoint elements too.

# Lint guidelines

No separate linter is configured. Ensure `go test ./pkg/crdt/...` runs cleanly and `gofmt` reports no changes.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
