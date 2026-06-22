# Task description

The fixed-capacity LRU cache in `pkg/lru/lru.go` has inverted eviction logic. When the cache is full and a new entry is inserted via `Put`, it currently removes the **most**-recently-used entry rather than the least-recently-used one. As a result, keys that were just inserted or read are dropped, while old, stale keys linger indefinitely.

Fix the eviction logic so that when capacity is exceeded, the cache evicts the entry whose last-access time is oldest. Accessing an entry through `Get` and updating an existing key through `Put` must both count as recent use and protect that key from being the next eviction victim. The eviction callback, hit/miss tracking, and the public method signatures (`Get`, `Put`, capacity, length) must continue to behave as before — only the choice of which entry to evict should change.

Keep the change scoped to the LRU cache. Do not alter other packages, exported names, or the cache's external API. Concurrency safety and existing callback timing must remain intact, and the eviction callback should still fire exactly once for each evicted entry with the correct key and value.

# Test guidelines

Run `go test ./pkg/lru/...` to validate the change. Add or extend tests in `pkg/lru` to cover eviction ordering: inserting beyond capacity should drop the oldest entry, recently-read keys should survive a subsequent insert, and re-`Put` of an existing key should refresh its recency. Confirm the eviction callback receives the least-recently-used key/value and fires once per eviction.

# Lint guidelines

Run `gofmt -l .` and `go vet ./pkg/lru/...` and ensure both report no issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
