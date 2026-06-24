# Task description

The bounded queue in `internal/asyncqueue/asyncqueue.go` is off by one: it admits a single item beyond its configured maximum before treating itself as full. As a result a queue created with a given capacity can transiently hold one more element than allowed, and its full condition only fires after the limit has already been exceeded.

Correct the capacity check so the queue is considered full once it reaches its configured maximum, never after. After the fix, a queue at capacity must reject or drop new items (whichever the existing API already does) rather than accepting them, and the number of buffered elements must never exceed the configured maximum at any point.

Keep the public API stable: exported names, method signatures, return types, and the existing full-handling behavior (reject vs. drop) must remain unchanged. Only the boundary condition changes. Empty-queue behavior, ordering, and concurrency safety must continue to work exactly as before.

# Test guidelines

Run `go test ./internal/asyncqueue/...` and ensure it passes. Add or extend tests in `internal/asyncqueue` to cover the exact-capacity boundary: enqueuing up to the limit succeeds, the queue reports full at the limit, and the next item is handled by the existing rejection/drop path. Include a capacity-of-one case and confirm the buffered count never exceeds the maximum.

# Lint guidelines

Run `go vet ./internal/asyncqueue/...` and `go build ./...` and resolve any reported issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from `main` or any other branch. Match the surrounding code style; use tabs for indentation as configured in `.editorconfig`.
