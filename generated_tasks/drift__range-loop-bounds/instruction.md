# Task description

In the Drift evaluator, iterating a range with `for ... in start..end` visits one value too many at the upper bound. The Range case in `evalForStmt` (`pkg/evaluator/evaluator.go`) currently treats `end` as inclusive, so a loop over `0..n` runs through the n-th step instead of stopping at `n-1`. This is inconsistent with the rest of the language, where `..` denotes a half-open interval (for example, `Range.Len` is computed as `End - Start`).

Fix the range iteration so the loop body executes for each value from `start` up to but not including `end`. After the change, `for i in 0..10 { ... }` should iterate over `0` through `9` (ten iterations), and an empty or reversed range such as `5..5` or `5..3` should produce no iterations. Loop variables and any index patterns driven by such ranges must no longer read one position past the intended end.

Only the range iteration boundary should change. Range length, array/string iteration, and all other evaluation behavior must remain exactly as they are.

# Test guidelines

Add or update tests in `pkg/evaluator` that confirm range loops are half-open: verify iteration counts and the collected values for typical ranges like `0..10`, single-step ranges like `0..1`, and empty/reversed ranges that should yield zero iterations. Cover index-driven loops that previously read past the end. Run the visible tests with `go test ./pkg/evaluator/...`, and `go test ./... -count=1` to confirm no regressions elsewhere.

# Lint guidelines

Run `gofmt -w -s .` and `go vet ./...` (equivalently `make fmt vet`) before finishing; the tree must be gofmt-clean and vet-clean.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
