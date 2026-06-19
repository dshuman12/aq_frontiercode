# Task description

Deletions performed on one node fail to converge across the cluster when replicas reconcile exclusively through Merkle anti-entropy rounds. After a node deletes a key and several `RunMerkleSyncRound` calls complete, peer nodes continue to return the deleted key as if it were still live.

Two independent defects in the Merkle anti-entropy path combine to cause this:

1. Deleted keys are invisible to the Merkle diff. When a store builds its Merkle tree, tombstoned entries are silently excluded, so the diff algorithm cannot see that a deletion has occurred. Peers holding a stale live value are never told to delete it.

2. Delete-wins semantics are not applied when a tombstone and a live entry share the same version number. When both a tombstone and a live entry exist for the same key at the same version, the live entry should lose — but it does not.

Fix both defects so that deletions converge to every peer using only Merkle sync rounds, regardless of whether the tombstone is at a higher version or the same version as the live entry. All existing tests must continue to pass.

# Test guidelines

Run `go test ./pkg/sim/... ./pkg/gossip/...` and ensure it passes. Add tests under `pkg/sim` that verify: (a) deletion propagation through Merkle-only sync when the tombstone is at a strictly higher version than the live entry; (b) delete-wins when the tombstone and live entry are at the same version number; (c) multi-node convergence after bulk deletes on one node. Keep tests deterministic; do not rely on wall-clock timing or unseeded randomness. Only change files that are necessary for the fix.

# Lint guidelines

Run `gofmt -l .` and ensure it reports no files, and run `go vet ./pkg/sim/... ./pkg/gossip/...` with no findings before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
