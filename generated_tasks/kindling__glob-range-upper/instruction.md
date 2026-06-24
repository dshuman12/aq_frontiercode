# Task description

The glob engine in `internal/glob/glob.go` mishandles character-class range matching at the top of each range. A bracket expression such as `[a-z]` currently fails to match its own upper-bound character: `z` is rejected, `[0-9]` does not match `9`, and similarly for any `[lo-hi]` range. Ranges in glob patterns must be inclusive of both endpoints.

Fix the range membership test so that a character equal to the upper bound of a class range is treated as a match, while keeping the lower-bound and in-between behavior unchanged. The lower bound, negated classes (`[^...]`), literal class members, and multi-range classes like `[a-z0-9]` must continue to work exactly as before. Do not alter the public matching API, pattern parsing, or behavior of `*`, `?`, and literal segments.

Success means patterns containing ranges match their full inclusive span: for example `[a-z]` matches every letter `a` through `z`, and `[0-9]` matches every digit `0` through `9`.

# Test guidelines

Run `go test ./internal/glob/...` to validate. Add or extend table-driven cases in `internal/glob` that assert upper-bound characters match (`z` for `[a-z]`, `9` for `[0-9]`), that lower bounds and mid-range characters still match, and that out-of-range characters, negated classes, and multi-range classes behave correctly. Include a regression case proving the upper bound is no longer excluded.

# Lint guidelines

Run `go vet ./internal/glob/...` and `gofmt -l internal/glob` (expect no files listed) before finishing. The full project validation is `go build ./...` and `go test ./...`.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
