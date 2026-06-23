# Task description

`VectorTimestamp.Compare` in `pkg/clock/vector.go` must correctly return `Concurrent` whenever neither timestamp causally dominates the other. The current implementation mishandles disjoint or partially-overlapping key sets: when each side has entries for nodes the other has never observed, and each leads on at least one node, the pair is causally independent and must be reported as `Concurrent`. Today such pairs are misclassified as a clean `Before`/`After` ordering, which falsely orders independent events and corrupts downstream conflict detection.

Update `Compare` so it treats a missing entry on either side as an implicit value of zero and tracks whether the receiver strictly leads on some node and whether the argument strictly leads on some node. If both lead somewhere, return `Concurrent`. The existing `Before`, `After`, and `Equal` results for properly dominating or identical vectors must remain unchanged, as must the `Ordering` constants in `pkg/clock/types.go` and the behavior of `Bytes`, witness, and tick logic.

Keep `Compare` consistent with the `Timestamp` interface: signature `Compare(other Timestamp) Ordering`, returning `Concurrent` when `other` is not a `*VectorTimestamp`.

# Test guidelines

Run `go test ./pkg/clock/...` and ensure it passes. Add or extend tests in `pkg/clock` to cover fully disjoint key sets, partially-overlapping sets where each side leads on a different node, strict domination in both directions, equal vectors, and empty vectors. Do not weaken existing assertions for HLC or Lamport timestamps.

# Lint guidelines

Run `go vet ./pkg/clock/...` and `gofmt -l pkg/clock` and resolve any reported issues so formatting and vet are clean.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
