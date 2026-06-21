# Task description

The fixed-capacity LRU cache in `pkg/lru/lru.go` has two bugs:

1. **Incorrect eviction target**: When the cache is full and a new entry is inserted via `Put`, it removes the wrong candidate — keys that were just accessed or written are dropped first, while old, stale keys linger indefinitely. The cache should evict the entry that was least recently used.

2. **Missing recency refresh on update**: When `Put` is called with a key that already exists in the cache, the entry's recency rank is not updated. A key that was just written via `Put` may be evicted before older entries that haven't been accessed in a long time.

Fix both bugs so that when capacity is exceeded, the cache evicts the entry whose last-access time is oldest, and so that accessing an entry through `Get` or updating an existing key through `Put` both count as recent use and protect that key from eviction. The eviction callback, hit/miss tracking, and the public method signatures (`Get`, `Put`, capacity, length) must continue to behave as before. Concurrency safety and existing callback timing must remain intact.

Keep the change scoped to the LRU cache. Do not alter other packages, exported names, or the cache's external API. Concurrency safety and existing callback timing must remain intact, and the eviction callback should still fire exactly once for each evicted entry with the correct key and value.

# Test guidelines

Run `go test ./pkg/lru/...` to validate the change. Add or extend tests in `pkg/lru` to cover eviction ordering: inserting beyond capacity should drop the oldest entry, recently-read keys should survive a subsequent insert, and re-`Put` of an existing key should refresh its recency. Confirm the eviction callback receives the least-recently-used key/value and fires once per eviction.

# Lint guidelines

Run `gofmt -l .` and `go vet ./pkg/lru/...` and ensure both report no issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
