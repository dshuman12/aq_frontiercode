# Task description

The Bully leader election in `pkg/election/election.go` must elect the highest-ID node *among peers that are currently alive*, not the highest-ID node across every registered peer. The current implementation ignores liveness, so a peer that has been marked dead can still be chosen as leader, and when the existing leader goes down a re-election does not correctly fall back to the next-highest live node.

Update the election logic so that:

- Only peers in a live/alive state are considered candidates.
- The elected leader is the highest-ID node among the live candidates.
- When the current leader becomes unavailable, re-running election promotes the next-highest live peer.
- If no peers are alive, the outcome reflects "no leader" consistent with the package's existing conventions rather than returning a dead node.

Preserve the existing exported names, method signatures, and return types in the package; this is a behavioral correction, not an API redesign. Liveness should be derived from the peer/membership state already tracked by the election type—do not introduce a new external dependency or change how peers are registered or marked dead. Behavior with all peers alive must remain identical to today.

# Test guidelines

Run `go test ./pkg/election/...` to validate. Tests live in `pkg/election`. Add or extend cases that cover: a dead highest-ID peer being skipped in favor of a live lower-ID peer, re-election after the current leader dies falling back to the next live node, the all-alive case remaining unchanged, and the no-live-peers case. Avoid weakening existing assertions for the ring-based algorithm in the same package.

# Lint guidelines

Run `go vet ./pkg/election/...` and `gofmt -l pkg/election` (expect no listed files) before finishing. Keep imports tidy.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
