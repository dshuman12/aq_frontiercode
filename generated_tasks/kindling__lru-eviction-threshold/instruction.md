# Task description

`Cache.Put` in `internal/lru/lru.go` inserts the new entry at the front of the recency list and then checks whether the cache should evict its least-recently-used node. The eviction condition currently triggers one step too early: it evicts as soon as the size reaches `capacity` rather than waiting until the size has grown *beyond* `capacity`. As a result a freshly inserted key can immediately push out a still-valid entry, the cache never holds a full `capacity` distinct items, and a key can be reported absent by `Get` right after being stored.

Adjust the eviction trigger so a node is removed only once inserting the new entry has caused the cache to exceed its configured `capacity`. After the fix, a cache with capacity `n` must be able to hold `n` distinct live keys simultaneously, the most recently inserted key must always be retrievable, and eviction must drop the genuinely least-recently-used entry (respecting `Get`-induced recency updates).

Keep the existing exported names, method signatures, and zero/invalid-capacity handling unchanged. Limit changes to the eviction logic; do not alter the node/list structure or public API.

# Test guidelines

Run `go test ./internal/lru/...` to validate. Add or extend cases in `internal/lru` covering: filling a capacity-`n` cache and confirming all `n` keys remain present, that the newest key survives an overflow insert, and that recency reordering from `Get` changes which key is evicted. Confirm there is no off-by-one at the exact capacity boundary.

# Lint guidelines

Run `go vet ./internal/lru/...` and `go build ./...` and ensure both pass cleanly with no new diagnostics.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from `main` or any other branch.
