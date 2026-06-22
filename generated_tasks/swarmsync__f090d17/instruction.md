# Task description

`ORSet.Merge` in `pkg/crdt/set.go` corrupts the local replica when an element is present in both the local and remote sets. For shared elements it replaces the local tag set with the remote tag set instead of unioning the two, so any tags the local replica added concurrently are lost. This silently drops locally-added entries and breaks the add-wins convergence guarantee that the OR-Set relies on.

Fix `Merge` so that, for every element present in either replica, the resulting tag set is the union of the local and remote `ORTag` observations. Elements only present remotely must still be copied in, elements only present locally must be preserved unchanged, and the per-node `counters` map must continue to advance to the maximum seen across both replicas so future adds generate fresh tags. Removals already observed on either side must remain consistent with add-wins semantics.

Keep the existing method signature, the `ORTag` struct, the `entries`/`counters` field layout, and locking discipline intact. Only `Merge` behavior should change; `Add`, `Remove`, `Contains`, and the `ORMap` integration that reaches into these fields must keep working unchanged.

# Test guidelines

Run `go test ./pkg/crdt/...` to validate. Add or extend tests in `pkg/crdt` covering the case where the same element is concurrently added on two replicas with distinct tags: after a bidirectional merge both replicas must contain the union of tags and report the element as present. Also cover that a merge does not resurrect or drop elements whose tag sets diverge, and that idempotent re-merges leave state unchanged.

# Lint guidelines

Run `go vet ./pkg/crdt/...` and `gofmt -l pkg/crdt` and ensure both report nothing before submitting.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
