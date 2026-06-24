# Task description

Inclusion proofs produced for keys that live under a right subtree fail `Proof.Verify`, while keys reached along purely-left paths verify correctly. The root cause is in proof generation in `pkg/merkle/proof.go`: when the walk descends into a node's right child, the recorded sibling side is inconsistent with how `Verify` recombines hashes in `tree.go`.

Recall the verification contract: `Proof.Sides[i]` is `true` when the sibling at step `i` sits on the right (so the running hash is written before the sibling), and `false` when the sibling is on the left (sibling written first). Proof construction must record, for each step from leaf to root, the hash of the *other* child and a side flag that matches this convention.

Fix the sibling-side bookkeeping so that proofs for every key in the tree verify against `Tree.RootHash()`, regardless of the leaf's position. Keep the `Proof` struct, `Verify`, and the public proof-generation entry point's name and signature unchanged; only the side/sibling recording logic should change. Do not alter `tree.go` hashing, tree layout, or `Verify`'s recombination order.

# Test guidelines

Run `go test ./pkg/merkle/...`. Tests live in `pkg/merkle`. Cover proofs for leaves in left, right, and mixed positions across trees of varying sizes (including odd leaf counts and single-key trees), confirming each generated proof verifies against the real root and that a tampered value or wrong root fails. Add or extend tests where coverage is missing to lock in the fix and prevent regression.

# Lint guidelines

Run `go vet ./pkg/merkle/...` and `gofmt -l pkg/merkle` (expect no listed files). Resolve all reported issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
