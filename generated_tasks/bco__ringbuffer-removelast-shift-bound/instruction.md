# Task description

`RingBuffer.RemoveLastWhere` in `bco-core/ringbuffer.go` is meant to find the most recent entry that satisfies a caller-supplied predicate, drop it, and compact the strictly newer entries down into the freed slot so the logical ordering (oldest → newest) is preserved. The current compaction shift is mis-bounded: when the matched entry is neither the newest nor the oldest, the newer entries are copied into incorrect positions. A subsequent `Entries()` readout then returns corrupted data — duplicated values, leftover garbage, or a stale slot that should no longer be live. Removing the newest or oldest matching entry happens to land on a boundary where the off-by-one is invisible, which hides the defect in casual use.

Fix the compaction so that removing any matching entry — including one in the interior of the buffer — leaves the remaining entries contiguous, in their original relative order, with the freed capacity correctly reclaimed and no stale element observable afterward. Preserve the existing method signature, return value semantics (whether a match was found/removed), generic element type, and the behavior of all other `RingBuffer` methods including wrap-around once the buffer is full. The engine relies on this for `switchHistory` and `activityFeed`, so `Entries()` ordering must remain oldest-first.

# Test guidelines

Run `cd bco-core && go test ./...` and ensure it passes. Add or extend tests in the `bco-core` package covering `RemoveLastWhere` when the matched entry is in the interior of a partially filled buffer, when it is the newest or oldest, when no entry matches, and after the ring has wrapped past capacity. Assert the full `Entries()` sequence (not just length) so position errors and stale slots are caught.

# Lint guidelines

Run `gofmt`/`go vet` over the package and keep the tree clean with no formatting diffs remaining.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch. Keep the change scoped to `bco-core/ringbuffer.go` and its tests; do not alter unrelated engine, network, or C API code.
