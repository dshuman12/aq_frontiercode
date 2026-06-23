# Task description

Fix `RGA.InsertAfter` in `pkg/crdt/rga.go` so that a new value is spliced into the sequence immediately **after** the element identified by `afterID`. The current implementation places the inserted element on the wrong side of its target: a value inserted "after a" ends up appearing before `a`. Because the total element count remains correct, the bug is easy to miss, but the materialized sequence order is wrong.

After the fix, the element identified by `afterID` must be the immediate predecessor of the newly inserted value in the resolved order. Two cases must behave correctly:

- **Mid-sequence inserts**: inserting after an interior element places the value directly between that element and whatever previously followed it.
- **Insert-at-beginning**: when `afterID` refers to a sentinel/head (or whatever convention denotes the front), the new value becomes the first visible element.

Keep the existing exported method signature and the RGA's tombstone, ordering, and merge semantics unchanged—only the positional placement relative to `afterID` should change. Concurrent inserts that share the same `afterID` must continue to converge deterministically across replicas.

# Test guidelines

Run `go test ./pkg/crdt/...` and ensure all tests pass.

Add or extend tests in `pkg/crdt` to lock in the corrected ordering. Cover at least: inserting after an interior element, inserting at the front, sequential inserts that chain after one another, and that the resolved sequence (not just its length) matches the expected order. Confirm existing RGA behaviors—deletes/tombstones and merge convergence—remain intact.

# Lint guidelines

Run `gofmt -l .` and `go vet ./pkg/crdt/...`; both must be clean with no reported files or diagnostics.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Limit changes to `pkg/crdt/rga.go` and the corresponding tests; do not modify other CRDT files or shared types.
