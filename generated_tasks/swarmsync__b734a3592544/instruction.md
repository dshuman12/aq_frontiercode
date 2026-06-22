# Task description

Fix two related issues in the Bloom filter package (`pkg/bloom/filter.go`).

1. **Counting-filter false negatives.** `CountingFilter` uses 4-bit counters that saturate at their maximum value. Currently `Remove` decrements counters unconditionally, including ones that have already saturated. Because a saturated counter no longer holds its true count, decrementing it can drive a still-referenced position down to zero and cause `Contains` to wrongly report a previously-added, not-fully-removed element as absent. Once a counter reaches its ceiling it must be treated as saturated and left untouched by `Remove`, so membership is preserved across arbitrary add/remove sequences.

2. **O(1) `Filter.FillRatio`.** `FillRatio` currently scans and popcounts the entire bit array on every call. Maintain a cached count of set bits that stays consistent across `Add`, `Union`, and `Reset`, and compute the ratio from it. The returned value must exactly match the current behavior for any filter state.

Preserve all exported names, signatures, serialization format, and externally observable behavior. Do not touch other packages.

# Test guidelines

Run `go test ./...`. Add or extend tests in `pkg/bloom` (alongside `bloom_test.go`) covering: saturated counters surviving repeated `Remove` calls without producing false negatives, normal add/remove round-trips, and that `FillRatio` returns identical values to a full popcount scan after `Add`, `Union`, and `Reset`. Verify the cached count stays correct after merging filters and resetting.

# Lint guidelines

Run `gofmt -l pkg/bloom` and ensure it reports no files, and `go vet ./...` cleanly.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
