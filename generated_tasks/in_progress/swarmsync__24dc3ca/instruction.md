# Task description

The TTL map implementation has correctness issues affecting both periodic cleanup and custom TTL handling. The map fails to reliably expire entries correctly: some stale entries persist past their deadline, and some fresh entries disappear prematurely. The sweep behavior and TTL assignment both need fixes.

Identify and fix the issues so that:

- Periodic cleanup correctly removes expired entries and preserves live ones
- Custom TTL durations are honored (entries stored with a specific TTL expire accordingly)
- Eviction callbacks fire for removed entries
- Lazy expiry in `Get` continues to work
- The exported API and callback signatures remain unchanged

Keep changes confined to the ttlmap package.

# Test guidelines

Run `go test ./pkg/ttlmap/...` to verify the fix.

Add tests covering cleanup with mixed expired and live entries, custom TTL behavior, eviction callbacks, and edge cases around expiry deadlines. Use deterministic time mocking rather than sleeps.

# Lint guidelines

Run `gofmt -l pkg/ttlmap` and ensure it reports no files, and run `go vet ./pkg/ttlmap/...` with no findings before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
