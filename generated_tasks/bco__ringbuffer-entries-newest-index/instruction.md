# Task description

`RingBuffer[T].Entries()` in `bco-core/ringbuffer.go` is documented to return every stored element ordered newest-first, but it currently mis-indexes the starting slot. The ring tracks `head` as the next write position, so the most recently written element lives in the slot immediately *before* `head`. The readout instead begins at `head` itself, which produces wrong results in two ways: when the buffer is full it emits an already-evicted/stale slot and drops the true newest entry, and when partially filled it surfaces a zero or older slot ahead of real data.

Fix `Entries()` so the returned slice begins with the newest element and walks backward through to the oldest retained element. Behavior when the buffer is empty (empty slice), partially filled, and exactly full must all be correct, and the count of returned items must continue to match the number of stored entries (never exposing unused capacity).

`EntriesLimited` already orders correctly and must keep its current behavior; do not alter its results or the public method set, generic signature, or constructor. The engine relies on `Entries()` for switch history and the activity feed, so these consumers should observe newest-first ordering without any other contract changes.

# Test guidelines

Run `cd bco-core && go test ./...` and confirm the package passes. Add or extend table-driven tests in `bco-core` (alongside the existing ring buffer coverage) that assert ordering and length for the empty, partially filled, and exactly-full cases, including the wrap-around where the newest element sits just behind `head`. Cover that the oldest evicted value never reappears once capacity is exceeded.

# Lint guidelines

Run `gofmt`/`go vet` over the package and keep the build clean; the module is compiled with `CGO_ENABLED=1`, so ensure no formatting or vet diagnostics remain.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
