# Task description

The preserve-mode redaction in `internal/redaction/redaction.go` is meant to keep a few characters at the edges of a matched value visible while masking the middle, so operators can still recognize a value without exposing it. The current implementation applies this partial-reveal behavior even to values that are too short, which leaks characters that should be fully hidden.

Fix the length threshold so that partial-reveal only applies once a matched value is strictly longer than the small threshold. At or below the threshold, the entire value must be replaced with mask characters and reveal no original characters. Values longer than the threshold should continue to keep their edge characters exactly as before.

Keep the existing redaction modes, exported names, and function signatures unchanged. Only the boundary condition that decides between full masking and edge-preserving masking should change. Other redaction packages and unrelated formatting behavior must remain untouched.

# Test guidelines

Run `go test ./internal/redaction/...` to validate the change.

Add or update tests in `internal/redaction` covering values right at the threshold boundary: values shorter than, equal to, and one character longer than the threshold. Confirm that at-or-below-threshold values are fully masked with no original characters surviving, and that longer values still preserve their edge characters. Include a failure-path style case so a regression that re-introduces leakage is caught.

# Lint guidelines

Run `go build ./...`, `go vet ./...`, and `go test ./...` before submitting. Code must be `gofmt`-clean with tab indentation per `.editorconfig`. Target Go 1.22 and introduce no new runtime dependencies.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
