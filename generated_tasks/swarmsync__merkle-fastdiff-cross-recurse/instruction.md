# Task description

The fast anti-entropy diff in `pkg/merkle/tree.go` returns incorrect results when comparing two trees of identical shape that differ in only a few leaves. When the fast diff descends into two internal nodes whose hashes differ, it fails to pair the corresponding left and right subtrees of the two trees. As a result, subtrees at mismatched positions are compared against each other, so changed keys land in the wrong bucket and the only-local, only-remote, and differing key sets come back wrong.

Fix the descent so that, when recursing into the children of two differing internal nodes, each subtree of one tree is compared against the structurally corresponding subtree of the other (left with left, right with right). The slower full diff already produces correct results, so after the fix the fast diff must agree with the full diff for every input, including trees that share the same shape but diverge at scattered leaves.

Keep the public diff API, the returned set semantics, and the existing node/tree types unchanged. Only the descent/pairing logic should change; do not alter hashing, serialization, or proof code.

# Test guidelines

Run `go test ./pkg/merkle/...` and ensure it passes. Tests live in `pkg/merkle`.

Add or extend cases that build two same-shaped trees differing at a few leaves and assert the fast diff matches the full diff exactly, covering only-local, only-remote, and differing-key outcomes. Include cases with multiple scattered leaf changes so position mispairing would be detected, plus identical-tree and fully-disjoint trees as regression guards.

# Lint guidelines

Run `gofmt -l ./pkg/merkle` and `go vet ./pkg/merkle/...`; both must be clean with no formatting diffs.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
