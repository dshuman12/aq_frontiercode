# Task description

The LRU cache in `pkg/lru/lru.go` fails to maintain correct recency order. The `Get()` method correctly moves accessed entries to the front (most recent), but `Put()` does not update recency when updating an existing key.

Specifically, the bug is in the `Put()` method: when a key already exists and you update its value, the code updates the value but does NOT move that element to the front of the order list. This means recently-updated keys can be evicted instead of older keys.

Fix `Put()` so that updating an existing key also updates its recency position (move to front), just like `Get()` does. The entry should behave as if it was just added when updated.

Keep the public API unchanged and ensure concurrency safety with the existing mutex.

# Test guidelines

Run `go test ./pkg/lru/...` to verify the fix. All existing tests must pass.

Add tests to explicitly verify:
1. When you `Put()` to update an existing key, that key is treated as recently used
2. After updating a key with `Put()`, it should NOT be evicted before newer entries
3. The recency order after `Put()` updates matches the order after `Get()` (both move to front)

# Lint guidelines

Run `gofmt -l .` and `go vet ./pkg/lru/...` and ensure both report no issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
