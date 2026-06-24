# Task description

The shard manager in `pkg/shard/shard.go` reassigns shards between nodes through a transfer operation. Before applying a transfer, the manager validates a precondition intended to ensure the declared source node actually owns the shard being moved. This guards against stale or conflicting reassignments where a caller names a source that no longer holds the shard.

The precondition currently checks the wrong field, so it compares against a value other than the shard's current owner. As a result, a transfer that names an incorrect source node passes validation and silently reassigns the shard to the destination. Transfers naming the correct current owner continue to succeed unchanged.

Correct the ownership check so a transfer is rejected when the declared source does not match the shard's present owner, and accepted when it does. Preserve the existing function signature, return type, and error-reporting convention used by the transfer method, and keep all other shard behavior (assignment, rebalancing, migration bookkeeping) intact. The fix should reject conflicting transfers while leaving legitimate ones observable as successful reassignments.

# Test guidelines

Run `go test ./pkg/shard/...` to validate the change. Add or extend tests in `pkg/shard` covering both branches: a transfer with a mismatched source node must be rejected and leave ownership unchanged, while a transfer naming the true owner must succeed and move the shard. Avoid weakening unrelated assertions, and do not modify tests in other packages.

# Lint guidelines

Run `gofmt` on changed files and `go vet ./pkg/shard/...` to confirm formatting and static checks pass. Keep imports tidy and introduce no new external dependencies.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
