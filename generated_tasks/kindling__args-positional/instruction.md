# Task description

The long-flag parsing in `internal/args/args.go` mishandles the boundary between flags and positional arguments. When a long flag (e.g. `--window`) may take a following token as its value, the condition that decides whether to consume the next token is inverted. As a result, positional arguments are wrongly swallowed as a flag's value, or a flag's intended value is left behind and treated as a positional.

Fix the condition so a long flag attaches its following token as a value only while it is valid to do so (before positionals begin), and the remaining tokens populate the positional list as intended. After the fix:

- A long flag followed by its value consumes that value correctly.
- Tokens that should be positionals end up in the positional list, not absorbed by a preceding flag.
- The relative ordering and count of positionals is preserved.

Keep the existing exported parsing function signatures and return shapes unchanged; this is a logic correction, not an API change. Do not alter flag-name recognition, short-flag handling, or `--` terminator behavior beyond what the condition fix requires.

# Test guidelines

Run `go test ./internal/args/...` to validate. Add or extend table-driven cases in `internal/args` covering: a long flag immediately followed by its value, a long flag followed by what must remain a positional, mixed flags and positionals in varying order, and the empty/trailing-token edge cases. Tests should assert both the resolved flag values and the exact positional slice. Avoid touching unrelated packages or integration tests.

# Lint guidelines

Run `go vet ./internal/args/...` and ensure `go build ./...` succeeds. Keep the change `gofmt`-clean (tabs for indentation per `.editorconfig`).

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
