# Task description

Snapshot pruning in `internal/snapshot2/snapshot2.go` currently deletes the wrong set of snapshots. When evaluating each snapshot against the configured retention window, the age comparison is inverted: recent snapshots that still fall inside the retention window are removed, while snapshots older than the window are kept. This is the opposite of the intended retention policy and risks discarding the snapshots an operator most wants to keep.

Correct the pruning logic so that a snapshot is removed only when its age strictly exceeds the retention window, and every snapshot within the window is retained. Age should be derived from the snapshot's timestamp relative to the evaluation time, compared against the retention duration. Preserve the existing behavior for boundary cases (a snapshot exactly at the window edge stays), and keep the function's signature, return values, and ordering of surviving snapshots unchanged.

Do not alter snapshot creation, serialization, or unrelated retention configuration. The fix should be confined to the comparison that decides what to prune.

# Test guidelines

Run `go test ./internal/snapshot2/...` and confirm all tests pass.

Add or extend tests in `internal/snapshot2` to cover the corrected behavior: snapshots older than the window are pruned, snapshots within the window survive, a snapshot exactly at the boundary is kept, and a mix of ages yields the correct survivors in their original order. Include a case where nothing exceeds the window so no snapshot is removed.

# Lint guidelines

Run `go vet ./internal/snapshot2/...` and `go build ./...` before finishing. Resolve any reported issues.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
