# Task description

`Map.Set` in `internal/treemap/treemap.go` corrupts the sorted map when inserting a brand-new key whose target position is not at the end of the existing entries. After the backing slices are grown to make room, the step that should shift the existing elements from the insertion index onward one slot to the right is not done correctly. As a result, the entry previously stored at the insertion index is overwritten and lost, leaving the key ordering and the map length inconsistent. A later `Get` on a key that was inserted earlier can then return a miss.

Fix `Set` so that inserting a new key opens a gap at the computed insertion index by shifting the existing entries (keys and their associated values) one position to the right, then writes the new key/value into that gap. All previously inserted entries must be preserved and the keys must remain in sorted order with a length that matches the number of distinct keys. When the key already exists, keep the current in-place overwrite behavior and do not change the length or ordering.

Keep the existing exported method set, signatures, and ordering semantics unchanged; this is strictly a correctness fix to the insertion path.

# Test guidelines

Run `go test ./internal/treemap/...` to validate. Add or extend tests in `internal/treemap` covering insertion at the front, middle, and end of an already-populated map, interleaved out-of-order insertions, overwrites of existing keys, and `Get` retrieval of every inserted key afterward. Confirm the reported length equals the count of distinct keys and that iteration yields keys in sorted order.

# Lint guidelines

Run `go vet ./internal/treemap/...` and `gofmt`-format any changed files. Keep the change limited to the treemap package; do not touch unrelated packages or introduce new dependencies.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
