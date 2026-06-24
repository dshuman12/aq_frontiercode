# Task description

The top-k tracker in `internal/topk/topk.go` evicts the wrong element when the tracked set is full and incoming counts tie with existing entries. When a new key must displace one of the currently tracked keys, the tracker scans for the slot holding the minimum count and replaces it. The current scan does not lock onto the first slot that achieves the minimum: on a tie it keeps advancing the chosen victim, so it can evict a more-frequent or otherwise-correct entry, leaving the reported top-k set wrong and order-dependent.

Fix the minimum-selection logic so the intended victim—the first slot that reaches the minimum count during the scan—is the one replaced. Ties must not move the victim forward, and eviction results must be stable regardless of input ordering that produces equal counts.

Keep the existing exported API, types, and method signatures unchanged; only the internal eviction decision should change. Behavior for the non-full case and for clearly distinct (untied) counts must remain identical.

# Test guidelines

Run `go test ./internal/topk/...` to validate the change. Add or extend tests under `internal/topk` covering the full-set eviction path with tied minimum counts, asserting that the first minimal slot is evicted and that the resulting top-k contents stay stable across different insertion orders. Include a case confirming untied evictions and non-full insertions are unaffected.

# Lint guidelines

Run `go vet ./internal/topk/...` and `go build ./...` and ensure both pass cleanly with no new warnings.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
