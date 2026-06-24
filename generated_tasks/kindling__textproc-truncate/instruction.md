# Task description

The string truncation helper in `internal/textproc/textproc.go` retains one character too many before appending the ellipsis. When a string longer than the requested maximum is truncated, the returned value keeps a prefix that is off by one, so the result is longer than the caller asked for.

Fix the truncation so that, for an input exceeding the maximum length, the retained prefix has exactly the intended length before the ellipsis marker is appended. Strings already within the limit must be returned unchanged, and the ellipsis must only be added when the input is actually shortened. The existing exported function name, argument list, and return type must stay the same so all current callers continue to compile and behave consistently.

Keep the change scoped to the truncation logic; do not alter unrelated formatting helpers in the same file or adjust how callers invoke the function. Preserve current handling of edge cases such as empty inputs, very small length limits, and inputs equal to the limit.

# Test guidelines

Run `go test ./internal/textproc/...` to validate the fix. Add or update cases in `internal/textproc` covering inputs longer than the limit (verify the retained prefix length and ellipsis placement), inputs exactly at the limit, inputs shorter than the limit, and small or zero maximum lengths. Ensure no-truncation cases return the original string without an ellipsis.

# Lint guidelines

Run `go vet ./internal/textproc/...` and ensure `go build ./...` succeeds with no new warnings.

# Style guidelines

Use tabs for indentation in Go files and keep the code `gofmt`-clean. You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from `main` or any other branch.
