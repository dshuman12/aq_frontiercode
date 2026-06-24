# Task description

The `ORSet` in `pkg/crdt/set.go` implements an observed-remove set with add-wins semantics, where each element is tracked by a set of `ORTag{NodeID, Counter}` tags. Concurrent adds of the same element on different replicas must survive a merge, but they currently do not.

When two replicas add the *same* element under different node IDs and one merges the other, the local replica ends up holding only the incoming peer's tags for that element instead of the union of both replicas' tag sets. This drops local add evidence and breaks convergence: the merge is no longer commutative for concurrently-added elements. Disjoint elements merge correctly, so the defect is specific to overlapping element keys.

Fix `Merge` so that, for every element present on either side, the resulting tag set is the union of the local and incoming tags (preserving counter accounting), while removed-element semantics and the existing `ORTag` structure, exported method set, and add-wins behavior remain unchanged. Merging must stay commutative and idempotent, and disjoint-element merges must continue to work. Keep the locking discipline consistent with the other CRDTs in this package.

# Test guidelines

Run `go test ./pkg/crdt/...` to validate. Add or extend tests under `pkg/crdt` covering concurrent adds of the same element across distinct node IDs, asserting that after a merge both replicas observe the element and retain the combined tags. Also cover commutativity (merging in either order yields the same membership), idempotent re-merges, and that disjoint-element merges remain unaffected. Avoid changing behavior of other CRDT types in this package.

# Lint guidelines

Run `go vet ./pkg/crdt/...` and `gofmt -l pkg/crdt` and ensure both are clean before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
