# Task description

`ORSet` and `ORMap` in `pkg/crdt` fail to converge when removals are involved. A removed element reappears once a replica merges state from another replica that still observes it, and `ORMap` resurrects deleted keys the same way. As a result removals are silently lost across the gossip/merge path.

Fix observed-remove convergence so that a removal seen on one replica is never undone by later merges, for any number of replicas and regardless of the order in which they exchange state. Preserve add-wins semantics: a concurrent add that carries tag state the remover never observed must survive a remove. For `ORMap`, also keep correct last-writer-wins resolution of entry values after merges.

Keep all exported names, method signatures, and serialization formats unchanged so existing callers and on-wire state remain compatible. Limit your changes to `pkg/crdt/set.go` and `pkg/crdt/ormap.go`; do not touch other packages or alter unrelated CRDT types.

# Test guidelines

Run `go test ./...` and confirm the full suite passes. Add or extend tests in `pkg/crdt` (alongside `crdt_test.go`) covering convergence under reordered and repeated merges, removals that must stay removed, concurrent add-wins survival, and last-writer-wins value resolution for `ORMap`. Tests should assert that all replicas reach identical observable state regardless of merge order.

# Lint guidelines

Run `go vet ./...` and `gofmt -l pkg/crdt` and ensure no issues or unformatted files remain.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
