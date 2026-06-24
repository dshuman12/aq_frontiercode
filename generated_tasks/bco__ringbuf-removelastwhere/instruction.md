# Task description

`RingBuffer.RemoveLastWhere` in `bco-core/ringbuffer.go` corrupts buffer contents when it evicts an entry that is not the newest. When a matching entry in the middle or oldest position is removed, the compaction step that shifts the surviving older entries into the freed slot moves data in the wrong direction. The result is duplicated or reordered entries, so `Entries()` (which must return surviving items newest-first) yields incorrect output.

Fix `RemoveLastWhere` so that after removing any matched entry the remaining entries stay intact and correctly ordered, for both wrapped and non-wrapped underlying storage. The evicted slot must be zeroed and the element count decremented by one. Removing the newest, an interior, and the oldest entry must all behave correctly, and the buffer must remain usable for subsequent pushes and reads.

Keep the existing exported generic API and method signatures unchanged; this is a behavioral correction inside the compaction logic only. Callers such as `switchHistory` and `activityFeed` in `engine.go` must continue to observe the same newest-first ordering contract. Do not alter unrelated buffer methods, capacity handling, or the zero-value semantics of evicted slots.

# Test guidelines

Run `cd bco-core && go test ./...` to validate. The package under test is `bco-core`.

Add or extend table-driven tests covering removal of the newest, an interior, and the oldest matching entry, and verify `Entries()` ordering after each. Cover both the non-wrapped case and a wrapped buffer (filled past capacity so the head has advanced), and confirm count decrements and that pushes after a removal still work. Assert that no stale or duplicated entries remain.

# Lint guidelines

Run `gofmt` and `go vet ./...` from `bco-core` and resolve any reported issues before finishing. Keep the code formatted as `gofmt` produces it.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Keep the change confined to the buffer logic and its tests; avoid touching generated outputs or other packages.
