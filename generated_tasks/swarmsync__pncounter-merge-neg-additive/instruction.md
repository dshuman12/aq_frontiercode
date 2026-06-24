# Task description

The PN-counter in `pkg/crdt/counter.go` is not idempotent under merge. A PN-counter tracks two grow-only maps of per-node tallies: increments and decrements. Convergent merge must take the per-node maximum for **both** maps, so that merging the same state any number of times yields the same value.

Currently the increment side merges correctly via per-node max, but the decrement side accumulates (sums) overlapping per-node entries instead of taking the maximum. When a remote replica's decrement state shares node IDs with the local replica, those decrements are double-counted, and repeated or identical merges keep shifting `Value()`.

Fix `Merge` so that decrements are combined with per-node max, mirroring the increment half. After the fix:

- Merging a replica into itself, or merging identical states twice, must not change `Value()` (idempotence).
- Merge must remain commutative and associative across any node ordering.
- Disjoint-node merges must continue to behave as before.

Keep the existing `NewPNCounter`, `Increment`, `Decrement`, `Value`, and `Merge` signatures and concurrency/locking behavior unchanged. Only the decrement-merge logic should change semantically; do not alter increment merging or other CRDT types.

# Test guidelines

Run `go test ./pkg/crdt/...` and ensure it passes. Add or extend tests in `pkg/crdt` that cover idempotent self-merge, repeated identical merges leaving `Value()` stable, overlapping-node decrement merges (no double counting), and commutativity/associativity across replicas. Confirm disjoint-node merges and increment-only paths still converge correctly.

# Lint guidelines

Run `gofmt -l pkg/crdt` and ensure it reports no files; run `go vet ./pkg/crdt/...` clean. Do not introduce new external dependencies.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
