# Task description

`ORMap.Merge` in `pkg/crdt/ormap.go` is responsible for two things: reconciling key membership across replicas and converging each key's value using last-writer-wins (LWW) semantics. The membership side works, and keys that exist in only one replica merge correctly. However, when a key is present in **both** replicas, the local per-key register is left untouched. As a result, a newer remote write (higher timestamp, or equal timestamp with a higher node ID) is never adopted, and the merged map retains a stale local value.

Fix the merge so that for every shared key the value converges via LWW, regardless of which replica holds the winning write. The per-key value reconciliation should reuse the existing `LWWRegister` tie-breaking rules (timestamp first, node ID as the tiebreaker) so behavior stays consistent with `register.go`.

Merge must remain commutative, associative, and idempotent: merging in either order, or repeatedly, must yield the same converged state. Do not alter `ORMap`'s public method set, its constructor, or the membership-merge behavior for disjoint keys.

# Test guidelines

Run `go test ./pkg/crdt/...` to validate. Add or extend tests in `pkg/crdt` covering the shared-key case: concurrent writes to the same key on both replicas where the remote value wins by timestamp, where the local value wins, and where timestamps tie and the node ID decides. Confirm convergence by merging in both directions and asserting identical results, and verify disjoint-key merges still behave correctly.

# Lint guidelines

Run `gofmt -l .` and ensure it reports no files, and `go vet ./pkg/crdt/...` passes cleanly. Keep changes limited to `pkg/crdt`; do not touch unrelated packages or introduce external dependencies.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
