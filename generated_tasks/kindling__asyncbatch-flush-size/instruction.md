# Task description

In `internal/asyncbatch`, batches are emitted one item later than configured. When a pending batch grows to its configured size, the flush does not fire until one more item arrives, so downstream consumers receive batches larger than the requested size.

Fix the size comparison in `internal/asyncbatch/asyncbatch.go` so that a batch is flushed exactly when the number of pending items reaches the configured batch size. After the fix, a configured size of N must emit batches containing at most N items, and a full batch must flush immediately rather than waiting for the next append.

Preserve all other flushing behavior: time-based flushes, explicit flush/close, and handling of the final partial batch on shutdown must remain unchanged. Keep the package's exported names, function signatures, and channel semantics intact; this is a boundary-condition fix, not an API change. Avoid touching unrelated packages or altering how items are ordered within a batch.

# Test guidelines

Run `go test ./internal/asyncbatch/...` to validate. Add or extend cases in `internal/asyncbatch` so they cover the exact-size boundary: appending precisely N items must produce one batch of N with no leftover, appending N+1 must yield a full batch of N plus a pending item, and size-triggered flushes must coexist correctly with time-based and shutdown flushes. Confirm no batch ever exceeds the configured size.

# Lint guidelines

Run `go vet ./internal/asyncbatch/...` and `gofmt` the touched files. Keep `go build ./...` green.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
