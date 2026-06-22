# Task description

Fix three related correctness and performance issues across the CRDT and clock layers in `pkg/crdt` and `pkg/clock`.

1. **Observed-remove convergence.** `ORSet.Remove` and `ORMap.Delete` in `pkg/crdt/set.go` and `pkg/crdt/ormap.go` currently drop entries only locally, so a removal is silently resurrected once state is merged from a replica that still holds the element. Track removals per observed add tag so that a delete observed on one replica converges across `Merge` and stays removed, while a concurrent add carrying a tag the remover never observed survives (add-wins semantics).

2. **O(1) counter reads.** In `pkg/crdt/counter.go`, make `GCounter.Value` and `PNCounter.Value` constant-time instead of iterating their maps. Maintain a cached running total kept consistent across `Increment`, `Decrement`, and `Merge`. Returned values must not change.

3. **Allocation-free clock hot path.** In `pkg/clock/hlc.go`, make `HybridLogicalClock.Tick` and `Witness` avoid per-call allocation by updating the stored last timestamp in place, without altering produced timestamps or causal ordering.

Preserve all exported names, signatures, and serialization byte formats.

# Test guidelines

Run `go test ./...`. Add or extend tests under `pkg/crdt` to cover delete-then-merge convergence, concurrent add-vs-remove add-wins behavior, and cached counter values after mixed `Increment`/`Decrement`/`Merge` sequences. Confirm HLC ordering and serialized bytes are unchanged. Do not weaken existing assertions in `pkg/clock` or `pkg/crdt`.

# Lint guidelines

Run `go vet ./...` and `gofmt -l .`; both must be clean with no reported files.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
