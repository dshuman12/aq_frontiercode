# Task description

`SkipList.Range(from, to)` in `pkg/skiplist/skiplist.go` is meant to return every entry whose key falls within the inclusive interval `[from, to]`, in ascending key order. It currently drops the lower bound: the level-by-level descent advances past nodes whose key equals `from`, so the entry keyed exactly at `from` is excluded even when it is present. For example, given keys `"a"` through `"z"`, `Range("a", "z")` returns the entries for `"b".."z"` but omits `"a"`.

Fix the traversal so both endpoints are inclusive. When seeking toward the start of the range, advance only while the next node's key is strictly less than `from`, so a node equal to `from` becomes the first candidate yielded. The upper bound is already inclusive and must stay that way; keys greater than `to` must continue to be excluded.

Keep the existing method signature, return type, and ascending ordering unchanged. Do not alter unrelated operations (insert, delete, search, length) or the list's probabilistic level structure, and confine changes to this package.

# Test guidelines

Run `go test ./pkg/skiplist/...` to validate. Add or extend cases in `pkg/skiplist/skiplist_test.go` covering: a range whose `from` matches an existing key (must be included), a range whose `to` matches an existing key (must remain included), bounds that fall between existing keys, an empty result when no keys lie in the interval, and single-element ranges where `from == to`. Confirm results stay sorted ascending.

# Lint guidelines

Run `gofmt -l .` and ensure it reports no files, and `go vet ./pkg/skiplist/...` to catch suspect constructs before submitting.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
