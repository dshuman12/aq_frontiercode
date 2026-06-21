# Task description

Two bugs exist in `pkg/crdt/set.go`:

**Bug 1 — `Merge` destroys local state:** `ORSet.Merge` corrupts the local replica when an element is present in both the local and remote sets. Any tags that the local replica added concurrently are lost during the merge. After merging, elements that were added locally but not yet seen by the remote peer disappear — the add-wins convergence guarantee of the OR-Set is broken.

**Bug 2 — `Contains` is inverted:** `ORSet.Contains` returns `true` for elements that are *not* present in the set and `false` for elements that *are* present. All membership queries return the opposite of the correct answer.

Fix both bugs so that:

1. `Merge` produces a tag set that is the union of the local and remote `ORTag` observations for each element. Elements only present remotely must be copied in, elements only present locally must be preserved, and the per-node `counters` map must advance to the maximum seen across both replicas so future adds generate fresh tags.

2. `Contains` returns `true` only when the element has at least one active tag.

Keep the existing method signatures, the `ORTag` struct, the `entries`/`counters` field layout, and locking discipline intact. `Add`, `Remove`, and the `ORMap` integration that reaches into these fields must keep working unchanged.

# Test guidelines

Run `go test ./pkg/crdt/...` to validate. Add or extend tests in `pkg/crdt` covering the case where the same element is concurrently added on two replicas with distinct tags: after a bidirectional merge both replicas must contain the union of tags and report the element as present. Also cover that a merge does not resurrect or drop elements whose tag sets diverge, and that idempotent re-merges leave state unchanged.

# Lint guidelines

Run `go vet ./pkg/crdt/...` and `gofmt -l pkg/crdt` and ensure both report nothing before submitting.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
