# Task description

Optimize the Merkle tree in `pkg/merkle/tree.go` so it rebuilds lazily and supports batch insertion, then wire the optimized diff into the simulator. Hashing semantics and all existing public behavior must remain identical, and the new functions must match the package's existing API style (`Put(key string, value []byte)`, `Diff(local, remote *Tree) DiffResult`, `RootHash() [32]byte`).

- **Lazy rebuild.** `Put` and `Delete` currently recompute the tree's hashes eagerly. Change them to only mark the tree dirty, deferring root/hash recomputation until a hash value is actually needed. For every possible sequence of operations, `Len()` and the value returned by `RootHash()` must be byte-for-byte identical to the current eager implementation.
- **Batch insert.** Add `func (t *Tree) PutBatch(entries map[string][]byte)` that applies all entries and produces a tree identical to performing the equivalent `Put` calls sequentially. An empty map is a no-op; existing keys are overwritten.
- **Fast diff.** Add `func FastDiff(local, remote *Tree) DiffResult` that returns the same `DiffResult` as `Diff` for any pair of trees while avoiding work on subtrees whose hashes already match. Update the reconciliation path in `pkg/sim/network.go` to call `merkle.FastDiff` in place of `Diff`.

# Test guidelines

Run `go test ./...`; the whole suite must stay green. Add tests in the `pkg/merkle` package covering lazy-rebuild correctness, `PutBatch` equivalence to sequential `Put`s (including the empty-map and overwrite cases), and that diffing returns correct results after lazy mutations. Make sure every code path that reads tree state observes an up-to-date tree, not a stale one.

# Lint guidelines

Run `go vet ./...` and `gofmt -l .` and ensure neither reports anything. Do not add external dependencies; standard library only.

# Style guidelines

Limit your changes to `pkg/merkle/tree.go`, `pkg/sim/network.go`, and tests inside `pkg/merkle`. Do not modify any other package, change serialization or hash output, or alter the exported signatures of existing functions.

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
