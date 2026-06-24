# Task description

The `merkle` package exposes two diff implementations that callers rely on to reconcile replica state: an authoritative full-scan `Diff` and an optimized tree-walking `FastDiff`. Both return the same result shape, partitioning keys into `OnlyLocal`, `OnlyRemote`, and `Different`. These two implementations must always agree for any pair of trees.

`FastDiff` currently returns the wrong sets when the two trees have different sizes, and therefore different internal shapes. When the walk reaches a point where one side is a single leaf while the other side is an interior subtree, it attributes the subtree's leaves to the wrong side — local leaves get reported as remote and vice versa. For trees of equal size and identical key layout the outputs coincide, so the defect only surfaces on mismatched shapes.

Fix `FastDiff` in `pkg/merkle/tree.go` so it produces exactly the same `OnlyLocal`, `OnlyRemote`, and `Different` partitions as `Diff` for any two trees, regardless of their relative sizes or shapes. Leave `Diff` and every other public API (signatures, exported names, return types) unchanged.

# Test guidelines

Run `go test ./pkg/merkle/...` to validate. Add or extend tests in `pkg/merkle` that compare `FastDiff` against `Diff` on trees of unequal sizes and asymmetric shapes, including cases where a leaf on one side aligns with an interior subtree on the other, and assert the three partitions match exactly. Keep equal-size cases passing as a regression guard.

# Lint guidelines

Run `go vet ./pkg/merkle/...` and `gofmt -l pkg/merkle` and ensure both are clean before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
