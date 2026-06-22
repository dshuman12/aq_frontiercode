# Task description

Apply three related correctness and performance fixes across the gossip stack while preserving all existing public APIs, comparison results, and hashing semantics.

1. **State hash caching (`pkg/gossip/state.go`)**: `StateStore.Hash()` currently recomputes the full hash on every call. Cache the computed `[32]byte` so repeated `Hash()` calls with no intervening mutation return the same cached value without recomputation. Invalidate the cache on every mutation path — `Put`, `Apply`, and `Delete` — so the next `Hash()` reflects the change. Caching must be safe under the store's existing concurrency model and must not change the hash value for any given state.

2. **Side-effect-free transfer (`pkg/hash/ring.go`)**: `Ring.TransferKeys` must not mutate the ring. It currently leaves a probed node permanently added. After the call returns, the ring's membership and size must be identical to before, while still returning the same set of keys to transfer.

3. **Allocation-free vector compare (`pkg/clock/vector.go`)**: Make vector-clock comparison perform no heap allocations, without altering the `Ordering` results it produces for any input (including `Before`, `After`, `Equal`, and `Concurrent`).

# Test guidelines

Run `go test ./...` to validate. Add or extend tests under `pkg/gossip` and `pkg/hash` to cover: identical hashes across repeated `Hash()` calls, hash changes after `Put`/`Apply`/`Delete`, and `TransferKeys` leaving ring size and membership unchanged while returning the correct keys. Use `testing.AllocsPerRun` to assert zero allocations for vector comparison. Avoid relying on wall-clock timing.

# Lint guidelines

Run `gofmt -l .` and `go vet ./...`; both must be clean. Keep changes confined to the three named files unless a test file requires updating.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
