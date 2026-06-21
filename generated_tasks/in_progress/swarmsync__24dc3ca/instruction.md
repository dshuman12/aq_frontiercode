# Task description

Two bugs exist in `pkg/ttlmap/ttlmap.go`:

**Bug 1 — `Cleanup` removes the wrong entries.** Sweeping a map that contains both expired and still-live entries produces the wrong result: entries whose TTL has elapsed survive, while entries that have not yet expired are deleted. Stale entries that should have been cleared linger in the map until a later `Get` lazily removes them.

**Bug 2 — `SetWithTTL` does not honor the caller-supplied TTL.** When `SetWithTTL` stores an entry, it computes the expiry time from the wrong duration source. Any caller that passes a custom duration finds the entry behaves as if it were stored with a different TTL than requested.

Both fixes must stay confined to the `ttlmap` package. The lazy-expiry behavior of `Get` and any registered eviction callbacks must continue to fire correctly. Do not change the exported API, the `TTLMap` struct layout, the callback signature, or the behavior of unrelated methods such as `Set`, `Get`, or `Len`.

Success means: a sweep over a populated map purges exactly the expired keys and preserves live keys; eviction callbacks fire for removed keys; and entries stored via `SetWithTTL` with a custom duration actually expire according to that duration rather than the map's default.

# Test guidelines

Run `go test ./pkg/ttlmap/...` to validate the change.

Add or extend tests in `pkg/ttlmap` to cover a `Cleanup` sweep over a map containing both expired and live entries: confirm expired keys are gone, live keys survive, eviction callbacks fire for removed keys, and that boundary deadlines (exactly at the current time) are treated as expired. Use deterministic time control rather than real sleeps where the existing tests allow it.

# Lint guidelines

Run `gofmt -l pkg/ttlmap` and ensure it reports no files, and run `go vet ./pkg/ttlmap/...` with no findings before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
