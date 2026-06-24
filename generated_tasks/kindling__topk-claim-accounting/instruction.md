# Task description

The `internal/topk` package implements the Space-Saving heavy-hitters algorithm over a fixed-size table of counters. When the table is full and an unseen key arrives, the algorithm evicts the slot holding the smallest counter and lets the incoming key claim that slot. The claim accounting is currently wrong: the promoted key inherits only the evicted slot's previous counter and is never credited with the weight of the current observation that triggered the admission. A freshly promoted key is therefore undercounted by exactly that observation's weight, so it lands right back at the eviction threshold and is churned out on the next unseen key. Across a stream this makes reported counts for any key that entered via eviction systematically too low.

Fix the eviction-claim path so an evicting admission sets the new key's counter to the evicted minimum **plus** the current observation's weight. The inherited baseline that backs `LowerBound` must remain exactly equal to the evicted minimum, so the lower bound stays exact. Leave the in-place increment path for already-present keys, the initial-fill path, and the descending-order snapshot unchanged.

# Test guidelines

Run `go test ./internal/topk/...` to validate. Add or extend tests in `internal/topk` covering eviction-driven admission: a promoted key's reported count should equal the evicted minimum plus the triggering observation's weight, its `LowerBound` should equal the evicted minimum, and a promoted key should not be immediately re-evicted by the next distinct key. Cover weighted observations (weight > 1), not just unit increments, and confirm already-present keys and initial fill behave as before.

# Lint guidelines

Run `go vet ./internal/topk/...` and `go build ./...` and ensure both pass cleanly with no new warnings.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Use tabs for indentation in Go files and keep the code `gofmt`-clean. Do not alter exported names or function signatures in `topk.go`; the fix should be internal to the eviction-claim accounting.
