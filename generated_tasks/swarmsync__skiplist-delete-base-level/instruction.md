# Task description

The skip list in `pkg/skiplist/skiplist.go` has a broken `Delete` operation. When a key is removed, the method reports success and decrements the length counter, but it fails to unlink the target node from the bottom (level-0) list. Since level 0 is the authoritative list that defines membership and ordering, the deleted node remains reachable through `Search`/`Get` and through forward iteration and range queries.

This corrupts the structure: deleted keys are still found, iteration yields stale entries, and repeated deletes of absent or already-removed keys can drive the length counter negative.

Fix `Delete` so it correctly unlinks the node at every level where it appears, including level 0. After a successful delete the key must be unreachable via lookups, iteration, and range queries, and the length must accurately reflect the live element count. Deleting a missing key must be a no-op that does not change the length or report success. Keep the existing exported method signatures, return types, and probabilistic level behavior unchanged; only correct the unlink/bookkeeping logic.

# Test guidelines

Run `go test ./pkg/skiplist/...` to validate. Add or extend tests in `pkg/skiplist` covering: deleting a present key removes it from lookups, iteration, and range queries; deleting an absent or already-deleted key leaves length unchanged and reports no success; and length stays correct (never negative) across interleaved inserts and deletes. Confirm ordering remains intact after deletions.

# Lint guidelines

Run `gofmt -l ./pkg/skiplist` and `go vet ./pkg/skiplist/...` and ensure both are clean before submitting.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
