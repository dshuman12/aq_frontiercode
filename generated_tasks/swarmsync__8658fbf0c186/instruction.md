# Task description

Improve the performance of two hot paths while keeping their observable behavior identical.

In `pkg/hash/ring.go`, the consistent hash ring maintains a sorted slice of virtual-node hash points. Replace the current insertion approach with a binary-search-based insert so that adding nodes keeps the ring sorted in `O(log n)` lookup + shift rather than re-sorting the whole ring on every change. Lookups (finding the owner for a key) must continue to return the same node for the same key set, including correct wrap-around behavior at the end of the ring and stable resolution of duplicate hash points.

In `pkg/gossip/state.go`, the state store should expose a zero-copy `GetRef` accessor that returns the stored value without cloning it, alongside the existing copy-returning getter. Callers using the existing API must see no change; the new accessor is for read-only paths that want to avoid allocation. Ensure concurrent access remains safe and that mutating a value obtained through the normal getter does not corrupt stored state.

Do not change exported signatures of existing functions, the wire codec, or the gossip protocol semantics. Keep changes confined to these two packages.

# Test guidelines

Run `go test ./...` to validate. Add or extend tests in `pkg/hash` and `pkg/gossip` to cover the new behavior: ring ordering after many inserts, owner lookups with wrap-around and duplicate points, and `GetRef` returning the live value while the existing getter stays isolated from caller mutation. Include a concurrency check for the state store so the race detector (`go test -race ./...`) stays clean.

# Lint guidelines

Run `gofmt -l .` and ensure no files are listed, and `go vet ./...` with no reported issues.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
