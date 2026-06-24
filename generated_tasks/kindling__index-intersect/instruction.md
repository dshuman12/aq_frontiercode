# Task description

The sorted-list intersection used by the posting-list index in `internal/index/index.go` is incorrect. When both input lists contain the same id, the merge records that id once (correct) but only advances one of the two cursors past the matched value. The lagging cursor stays on the already-consumed element, so on the next iteration the comparison logic misbehaves and emits wrong results: ids can be dropped or duplicated, and downstream posting-list queries return missing or spurious matches.

Fix the intersection so that after recording a common element, both cursors advance past it. The function must continue to assume both inputs are sorted ascending and produce a strictly ascending, duplicate-free result. Preserve the existing exported name, argument list, and return type so callers in the package keep compiling unchanged. Do not alter behavior for the non-matching cases (advancing the cursor pointing at the smaller value), and keep the empty-input and single-list handling intact.

Limit changes to the intersection logic; do not restructure the index API or touch unrelated packages.

# Test guidelines

Run `go test ./internal/index/...` and confirm it passes.

Add or extend tests in `internal/index` to cover lists that share one or more common elements, fully overlapping lists, fully disjoint lists, lists with a common element appearing at the start and end, and empty-input cases. These should assert the result is the correct ascending, duplicate-free intersection rather than only checking length.

# Lint guidelines

Run `go build ./...` and `go vet ./...` and ensure both are clean before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
