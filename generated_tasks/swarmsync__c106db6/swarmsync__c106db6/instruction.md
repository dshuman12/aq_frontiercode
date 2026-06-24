# Task description

The skip list `Range` function returns incorrect results for interval queries. Some keys that should be included are omitted, and queries with boundaries matching existing keys produce wrong results.

Fix the implementation so that:

- `Range(from, to)` returns all entries with keys in the closed interval `[from, to]`
- Boundary keys are correctly included or excluded
- Single-element ranges (where `from == to`) work correctly
- Results remain sorted in ascending key order
- Unrelated operations and list structure remain unchanged

# Test guidelines

Run `go test ./pkg/skiplist/...` to verify the fix.

Add tests for range queries with matching boundary keys, ranges between existing keys, empty results, and single-element ranges. Verify results are sorted and complete.

# Lint guidelines

Run `gofmt -l .` and ensure it reports no files, and `go vet ./pkg/skiplist/...` to catch suspect constructs before submitting.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
