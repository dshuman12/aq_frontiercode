# Task description

The LRU cache has bugs affecting both eviction order and recency tracking. It evicts wrong entries when at capacity and doesn't properly track access patterns for updated keys.

Fix the implementation so that:

- Eviction removes the least-recently-used entry when capacity is exceeded
- Both `Get` and `Put` on existing keys update recency and protect from eviction
- Eviction callbacks fire for the correct entries
- Public API signatures and concurrency behavior remain unchanged

Keep changes confined to the cache package.

# Test guidelines

Run `go test ./pkg/lru/...` to verify the fix.

Add tests for eviction ordering with capacity exceeded, recency refresh on `Get` and `Put`, and correct eviction callbacks. Verify the least-recently-used entries are evicted.

# Lint guidelines

Run `gofmt -l .` and `go vet ./pkg/lru/...` and ensure both report no issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
