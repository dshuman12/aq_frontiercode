# Task description

The percent-decoding logic in `internal/uri/uri.go` mishandles a truncated escape that lands at the very end of the input. When a `%` appears with fewer than two characters remaining, the decoder indexes past the end of the string instead of reporting a short-escape error, which can panic or emit garbage output.

A valid percent escape must be `%` followed by exactly two hex digits. Tighten the bounds check so that a trailing `%` (with zero or one following character) is rejected as a short escape, with the same error path already used for other malformed escapes. The fix should treat both `"%"` at the end and `"%A"` at the end consistently as short-escape errors.

Keep the existing decoder signature and error-reporting contract intact: well-formed inputs must continue to decode to the same results, and only the truncated-escape case changes from an out-of-range read to a clean error. Do not alter behavior for valid escapes, plus-handling, or non-escaped bytes, and confine changes to the `internal/uri` package.

# Test guidelines

Run `go test ./internal/uri/...` to validate. Add or extend cases in `internal/uri` covering inputs ending in a lone `%`, a `%` followed by a single character (hex or non-hex), and a normal escape immediately preceding end-of-input, asserting that truncated escapes return the short-escape error rather than panicking. Confirm existing valid-decode cases still pass unchanged.

# Lint guidelines

Run `go build ./...`, `go vet ./...`, and `gofmt -l internal/uri` before finishing; `gofmt` must report no files. Requires Go 1.22 or newer.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
