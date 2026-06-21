# Task description

`SkipList.Range(from, to)` in `pkg/skiplist/skiplist.go` is meant to return every entry whose key falls within the inclusive interval `[from, to]`, in ascending key order. It currently contains two bugs, both in the `Range` function:

1. **Lower bound excluded**: When a key exactly equal to `from` exists in the list, `Range` skips it. Only keys strictly greater than `from` appear in the result. For example, given keys `"a"` through `"z"`, `Range("a", "z")` returns entries `"b".."z"` but omits `"a"`.

2. **Upper bound excluded**: When a key exactly equal to `to` exists in the list, `Range` stops before including it. For example, `Range("a", "c")` with keys `"a"`, `"b"`, `"c"` returns only `"a"` and `"b"`. A single-element range such as `Range("exact", "exact")` always returns empty.

Fix both bugs so that `Range(from, to)` returns all entries with `from <= key <= to` (inclusive on both ends).

Keep the existing method signature, return type, and ascending ordering unchanged. Do not alter unrelated operations (insert, delete, search, length) or the list's probabilistic level structure, and confine changes to this package.

# Test guidelines

Run `go test ./pkg/skiplist/...` to validate. Add or extend cases in `pkg/skiplist/skiplist_test.go` covering: a range whose `from` matches an existing key (must be included), a range whose `to` matches an existing key (must remain included), bounds that fall between existing keys, an empty result when no keys lie in the interval, and single-element ranges where `from == to`. Confirm results stay sorted ascending.

# Lint guidelines

Run `gofmt -l .` and ensure it reports no files, and `go vet ./pkg/skiplist/...` to catch suspect constructs before submitting.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
