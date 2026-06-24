# Task description

The shard manager in `pkg/shard/shard.go` distributes shards across the available node list using a round-robin strategy during `Rebalance`. Currently the resulting per-node shard counts are balanced, so totals look correct, but the actual shard-to-node assignment is off by one position relative to the round-robin order. As a consequence, downstream operations that assert or look up the expected owner of a specific shard fail: a shard reports an owner that differs from the node the round-robin sequence should have selected.

Fix the owner-assignment logic so that shard *i* is deterministically assigned to the node the round-robin walk dictates, and operations naming the expected owner of a shard are accepted. The distribution must remain balanced, deterministic, and stable for a given node list ordering. Preserve the existing exported API, types, and method signatures of the shard manager — this is a correctness fix to assignment, not an interface change. Do not alter behavior in unrelated packages.

# Test guidelines

Run `go test ./pkg/shard/...` to validate the change. Tests live under `pkg/shard`. Ensure coverage confirms that each shard maps to the correct round-robin owner, that per-node counts stay balanced when shard counts do not divide evenly across nodes, and that lookups for a shard's owner agree with the assignment produced by `Rebalance`. Add or extend cases if existing tests do not pin the exact shard-to-node mapping. Do not weaken assertions merely to make them pass.

# Lint guidelines

Run `go vet ./pkg/shard/...` and `gofmt -l pkg/shard` (which should report no files) before considering the task complete.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
