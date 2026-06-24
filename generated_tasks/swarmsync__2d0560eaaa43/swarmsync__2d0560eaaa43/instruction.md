# Task description

Apply three related correctness and performance fixes across the gossip stack while preserving all existing public APIs and hashing semantics.

1. **State hash caching (`pkg/gossip/state.go`).** `StateStore.Hash()` currently recomputes its `[32]byte` digest on every call. Cache the computed hash so that repeated `Hash()` calls with no intervening mutation return the same cached value without recomputation. Invalidate the cache on every state mutation — `Put`, `Apply`, and `Delete` — so the next `Hash()` reflects the change. The returned hash value for any given state must remain identical to today's output.

2. **`Ring.TransferKeys` side effects (`pkg/hash/ring.go`).** This method must be free of side effects on the ring: probing for a target node must not permanently add that node, and the ring size must be unchanged after the call returns. The set of keys it reports as transferring must stay consistent with the current hashing layout.

3. **Allocation-free vector compare (`pkg/clock/vector.go`).** Make vector-clock comparison perform no heap allocations, without changing any comparison result (`Before`, `After`, `Equal`, `Concurrent`).

Keep exported names, signatures, and serialization formats unchanged. Do not touch unrelated packages.

# Test guidelines

Run `go test ./...` to validate. Add or extend tests under `pkg/gossip` and `pkg/hash` to lock in the fixes. Gossip tests should confirm `Hash()` is stable across repeated calls and changes after `Put`, `Apply`, and `Delete`. Hash tests should assert `Ring.Len()` (or equivalent size) is identical before and after `TransferKeys` and that the probed node is not retained. For the clock change, cover comparison correctness; allocation behavior is best verified with a `testing.B` benchmark using `-benchmem` showing zero allocs/op.

# Lint guidelines

Run `go vet ./...` and `gofmt -l .` (expect no output) before submitting. Ensure the module builds with `go build ./...`.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
