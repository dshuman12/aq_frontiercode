# Task description

The work-stealing deque in `pkg/queue/deque.go` has a **data race** between the owner thread and concurrent steal operations. The bug is in how shared fields (like `front`, `back`, or internal buffer pointers) are accessed without proper synchronization.

**Your task:** Fix the data race in the deque so that `go test -race ./pkg/queue/...` passes. Keep all public method signatures and semantics (FIFO/LIFO) unchanged. Only add synchronization (locks, atomics, or channels) as needed; do not refactor the deque's API or core logic.

**Hint:** Look for places where both the owner (via `Push`/`Pop`) and stealers (via `Steal`) access the same field without mutual exclusion. Use a sync.Mutex or atomic operations to protect those accesses.

# Test guidelines

Run `go test -race ./pkg/queue/...` to confirm the data race is fixed. You do not need to add new tests; the existing tests should pass the race detector once you add proper synchronization.

# Lint guidelines

Run `go vet ./...` and `gofmt -l .` (expect no listed files) before submitting. Resolve all reported issues.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
