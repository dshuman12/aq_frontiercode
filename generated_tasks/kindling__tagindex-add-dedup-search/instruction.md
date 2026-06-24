# Task description

`Index.Add` in `internal/tagindex/tagindex.go` maintains, for each tag, a sorted slice of record ids. On insert it binary-searches for the position that keeps the slice ordered and uses that same search to detect whether the id is already present, treating a re-add as a no-op when the tag already carries the id.

That dedup guard is currently broken: the search does not reliably land on an equal element, so re-adding an id under a tag it already holds inserts a duplicate instead of doing nothing. As a result posting lists accumulate repeated ids, and downstream cardinality, lookup, and intersection results over-count.

Fix `Index.Add` so that adding an id to a tag it already carries is a no-op while still inserting new ids in sorted order. After the change each per-tag posting list must remain strictly sorted with no duplicates, regardless of insertion order or repeated adds.

Keep the existing exported names, method signatures, and return types unchanged. Do not alter the on-disk or in-memory layout beyond removing duplicates, and leave unrelated index behavior (iteration order, lookup, intersection) intact.

# Test guidelines

Run `go test ./internal/tagindex/...` to validate. Add or extend tests in `internal/tagindex` covering repeated adds of the same id under one tag, interleaved adds of distinct ids, and that posting lists stay sorted and duplicate-free. Confirm cardinality and intersection results no longer over-count after repeated adds.

# Lint guidelines

Run `go vet ./internal/tagindex/...` and `go build ./...` before submitting. Keep the change minimal and confined to the affected package.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
