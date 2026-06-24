# Task description

The coalescer in `internal/coalesce/coalesce.go` holds pending summaries one tick too long. A pending entry whose age has reached exactly the configured window is currently retained until its age is strictly past the window, delaying the flush by one tick.

Fix the expiry comparison so that an entry is flushed as soon as its age reaches the window: an entry that has been pending for a full window should be flushed on that tick, not the next one. Entries younger than the window must continue to be held, and entries already past the window must still flush.

This is an off-by-one boundary fix only. Keep the existing flushing mechanics, ordering of flushed entries, exported names, and function signatures unchanged; do not alter how ages are measured or how the window is configured. Behavior for non-boundary ages must remain identical, and no other packages should require changes.

Success is observable: feeding an entry that reaches exactly the window length results in a flush on that same tick rather than one tick later.

# Test guidelines

Run `go test ./internal/coalesce/...` to validate the change.

Add or extend tests in `internal/coalesce` to lock in the boundary behavior: an entry aged to exactly the window flushes immediately, an entry one tick younger is still held, and an entry past the window continues to flush. Keep coverage for the unchanged ordering and multi-entry flushing so this fix does not regress existing behavior.

# Lint guidelines

Run `go build ./...` and `go vet ./...` and ensure both are clean before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
