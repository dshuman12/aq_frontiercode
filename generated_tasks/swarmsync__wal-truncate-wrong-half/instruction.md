# Task description

The write-ahead log in `pkg/wal/wal.go` has a broken truncation routine. When entries are truncated at a given sequence boundary, the operation reports a plausible removed-entry count, but it keeps the wrong half of the log: it retains the entries that were meant to be discarded and drops the ones that should survive. As a result, replaying after truncation surfaces stale, already-checkpointed records and silently loses the newest appended entries, corrupting crash-recovery semantics.

Fix the truncation logic so that entries on the surviving side of the truncation point are preserved and the intended entries are removed. The returned removed-count must continue to reflect the actual number of entries dropped, and a subsequent replay must return the surviving entries in their original append order. Keep the existing exported API, method signatures, sequence-numbering scheme, and on-disk/CRC format unchanged so callers and previously written logs remain compatible. Only the selection of which entries are retained versus discarded should change.

# Test guidelines

Run `go test ./pkg/wal/...` and ensure it passes. Add or extend tests in `pkg/wal` to cover truncation followed by replay: verify that surviving entries are exactly those past the truncation point, in append order, that discarded entries no longer appear, and that the removed-count matches the number actually dropped. Include boundary cases such as truncating at the first entry, at the last entry, and beyond the log's range.

# Lint guidelines

Run `gofmt -l ./pkg/wal` and `go vet ./pkg/wal/...` and ensure both report no issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
