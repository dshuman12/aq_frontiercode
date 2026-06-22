# Task description

The OR-Set CRDT implementation has bugs affecting both merge semantics and membership queries. Merges lose local state and contain queries return inverted results.

Fix the issues so that:

- Merge correctly combines local and remote state (union semantics for tags, maximum for counters)
- Local additions are not lost during merge
- Contains correctly reports membership
- Add-wins semantics are preserved across replica merges
- Existing method signatures and field layout remain unchanged
- Concurrent adds and merges work correctly

# Test guidelines

Run `go test ./pkg/crdt/...` to verify the fix.

Add tests for concurrent adds across replicas, merges with bidirectional state exchange, membership queries, and idempotent merges. Verify union semantics and that local additions survive merges.

# Lint guidelines

Run `go vet ./pkg/crdt/...` and `gofmt -l pkg/crdt` and ensure both report nothing before submitting.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
