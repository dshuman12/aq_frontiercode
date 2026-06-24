# Task description

Several of the CRDTs in `pkg/crdt/` fail to converge under concurrent operations. After replicas perform concurrent updates on different node IDs and then merge each other's state, the merged result diverges between replicas, drops updates, or fails to stay stable under repeated merges. The convergence laws these types are supposed to satisfy — merge being commutative, associative, and idempotent — are violated for at least the observed-remove set (`set.go`), the PN-counter (`counter.go`), and the OR-Map (`ormap.go`).

Find and fix the merge logic in each affected type so that:

- merging two replicas yields the same converged state regardless of merge order (commutativity/associativity), and re-merging already-seen state changes nothing (idempotence);
- no concurrently-applied update is lost, and per-type semantics are preserved (add-wins for the set, correct increment/decrement accounting for the counter, last-writer-wins value resolution for the map);
- disjoint keys/elements continue to merge correctly.

Diagnose the defect in each file yourself — the symptom is non-convergence, not a specific line. Keep the exported method sets, struct layouts (`ORTag`, counter maps, map entries), and the locking discipline used across this package unchanged. Do not alter unrelated CRDTs or other packages.

# Test guidelines

Run `go test ./pkg/crdt/...`. Add or extend tests under `pkg/crdt` that exercise concurrent add/increment/update-then-merge across at least two node IDs for each affected type, asserting convergence (order-independence) and idempotence. Cover both overlapping and disjoint keys.

# Lint guidelines

No separate linter is configured. Ensure `go test ./pkg/crdt/...` runs cleanly and `gofmt` reports no changes.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
