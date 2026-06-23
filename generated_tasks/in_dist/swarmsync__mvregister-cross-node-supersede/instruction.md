# Task description

Fix `MVRegister.Set` in `pkg/crdt/register.go` so concurrent writes authored by different replicas are preserved instead of being incorrectly superseded. The MV-Register tracks multiple live values, each tagged with a `(nodeID, counter)` version. A per-node counter only orders writes within that same node's history, so the supersede rule must only drop an existing value when the incoming write comes from the *same* node and causally dominates it (i.e. same `nodeID` with a counter greater than or equal to the existing one).

Today, `Set` discards any existing value whose counter is `<=` the incoming counter regardless of authoring node. This collapses genuinely concurrent values from distinct nodes into one, so `Get` and `Len` under-report the set of live versions.

After the fix, a write from node A must never remove a concurrent value written by node B; only versions from the writing node that the new write supersedes should be removed, and the new value appended. Keep the existing method signatures, exported names, and `Merge` semantics unchanged; do not alter other CRDTs in this package.

# Test guidelines

Run `go test ./pkg/crdt/...` and ensure it passes. Add or extend tests in `pkg/crdt` to cover the cross-node case: two replicas writing concurrently must both remain live in `Get`/`Len`, while successive writes from one node correctly supersede that node's older versions. Include a merge-then-read case confirming convergence keeps all concurrent values.

# Lint guidelines

Run `gofmt -l pkg/crdt` and ensure it reports no files. Code must compile cleanly with `go build ./...` and stay free of `go vet ./pkg/crdt/...` warnings.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
