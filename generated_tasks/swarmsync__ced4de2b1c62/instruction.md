# Task description

Deletions in the gossip layer do not converge across replicas. When a node deletes a key, the tombstone fails to reach peers that still hold a live copy, and even when a tombstone does arrive, `Apply` discards it in favour of the existing live entry. As a result, deleted keys reappear after reconciliation and can never be durably removed from the cluster.

Fix the push-pull state exchange in `pkg/gossip` so deletions propagate and win consistently, regardless of the order in which nodes exchange state. Specifically:

- `Diff` must include tombstoned entries when the remote digest is missing them or holds an older version, so deletes are pushed and pulled like any other update.
- `Apply` must accept an incoming tombstone over a local live entry when the tombstone is causally newer, rather than always preferring the live value.

Convergence must remain order-independent: after enough rounds every replica should agree on the same `Hash()`, including for keys that were deleted. Do not alter behaviour for normal live-vs-live or live-vs-older updates, and keep the `StateStore` digest, diff, and apply contracts intact. Confine all changes to `pkg/gossip` (primarily `state.go`).

# Test guidelines

Run `go test ./...`. Add or extend tests in `pkg/gossip` to cover delete propagation to peers holding a live copy, tombstone-versus-live resolution in both exchange directions, and order-independent convergence of `Hash()` across a cluster after deletes. Ensure existing protocol and store tests continue to pass unchanged.

# Lint guidelines

Run `gofmt -l .` and `go vet ./...` and ensure both report nothing for the changed package.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
