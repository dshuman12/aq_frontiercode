# Task description

The fixed-capacity ring buffer in `internal/ring/ring.go` mishandles pushes once it reaches capacity. When the buffer is full and a new item is pushed, the oldest entry should be evicted and the new item stored in its place. Currently the head pointer fails to advance, so subsequent pushes keep overwriting the same slot. As a result, a snapshot of the buffer returns stale or duplicated entries instead of the most recent items in insertion order.

Fix the full-buffer push path so that, on overflow, the head advances by one and the oldest item is dropped. After any sequence of pushes, the buffer must hold the newest `capacity` items, and a snapshot must return them oldest-first.

Keep the existing exported API, type definitions, and method signatures unchanged; only the eviction/advancement logic needs correcting. Non-full pushes, length/capacity reporting, and snapshot ordering for partially filled buffers must continue to behave as before. Avoid touching unrelated packages.

# Test guidelines

Run `go test ./internal/ring/...` to validate the change. Add or extend tests in `internal/ring` so they cover pushing past capacity, confirming the head advances, the oldest item is evicted, and a snapshot returns the newest items oldest-first. Include cases for exactly filling the buffer, overflowing by one, and overflowing by several items, plus a capacity-one buffer edge case.

# Lint guidelines

Run `go vet ./internal/ring/...` and ensure `go build ./...` succeeds with no warnings before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from `main` or any other branch. Match the surrounding code style and keep the diff minimal; do not introduce new runtime dependencies.
