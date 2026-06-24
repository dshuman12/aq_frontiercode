# Task description

The skip list in `pkg/skiplist/skiplist.go` supports an inclusive range query that should return every key `k` satisfying `lo <= k <= hi`, in sorted order. There is a bug at the lower edge: when an entry's key exactly equals the lower bound `lo`, the multi-level descent advances past that node before collecting results, so the matching first element is silently dropped. As a result the query returns one fewer key than expected whenever `lo` is present in the list. The upper-bound logic is correct and must stay that way — keys equal to `hi` are already included, and keys strictly greater than `hi` must remain excluded.

Fix the descent/collection so the node whose key equals `lo` is included while preserving sorted output, the existing method signature, and the half-open behavior at the top of each level. Do not change the public API, the node layout, the probabilistic level generation, or any other operation (insert, delete, lookup). Behavior for empty ranges, absent bounds, and `lo > hi` must remain unchanged.

# Test guidelines

Run `go test ./pkg/skiplist/...` to validate. Add or extend tests in `pkg/skiplist` covering: a range whose `lo` exactly matches a present key (the regression), `lo` falling between keys, both bounds present, single-element and empty results, and a query spanning all keys. Confirm result count and ordering, and that `hi`-edge inclusion is unaffected.

# Lint guidelines

Run `gofmt -l pkg/skiplist` and ensure it reports no files, and run `go vet ./pkg/skiplist/...` clean before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
