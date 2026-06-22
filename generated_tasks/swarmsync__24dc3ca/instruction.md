# Task description

`TTLMap.Cleanup` in `pkg/ttlmap/ttlmap.go` currently evicts the wrong entries. Its expiry comparison runs in the wrong direction, so it deletes entries whose deadline has **not** yet passed while leaving already-expired entries in the map. Those stale entries then linger until a later `Get` lazily removes them.

Fix `Cleanup` so it removes only entries whose TTL has elapsed (deadline at or before the current time) and retains entries that are still live. The lazy-expiry behavior of `Get` and any registered eviction callbacks must continue to fire for the entries that `Cleanup` removes, matching the semantics already used elsewhere in the package. Do not change the exported API, the `TTLMap` struct layout, the callback signature, or the behavior of unrelated methods such as `Set`, `Get`, or `Len`.

Keep the change confined to the `ttlmap` package; other packages must remain untouched. Success means a sweep over a populated map purges exactly the expired keys, preserves live keys, and invokes eviction callbacks consistently with lazy removal.

# Test guidelines

Run `go test ./pkg/ttlmap/...` to validate the change.

Add or extend tests in `pkg/ttlmap` to cover a `Cleanup` sweep over a map containing both expired and live entries: confirm expired keys are gone, live keys survive, eviction callbacks fire for removed keys, and that boundary deadlines (exactly at the current time) are treated as expired. Use deterministic time control rather than real sleeps where the existing tests allow it.

# Lint guidelines

Run `gofmt -l pkg/ttlmap` and ensure it reports no files, and run `go vet ./pkg/ttlmap/...` with no findings before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
