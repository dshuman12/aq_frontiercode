# Task description

The `reduce(array, init, fn)` builtin (`builtinReduce` in `pkg/stdlib/stdlib.go`) binds its callback parameters in the wrong order. Drift documents `reduce` with the convention `fn(acc, x)`: the first declared parameter is the running accumulator and the second is the current element. Currently the implementation sets the first parameter to the element and the second to the accumulator, so the binding is reversed.

This is invisible for commutative reducers like `reduce(nums, 0, fn(acc, x) { acc + x })`, which still produce correct sums, but it breaks any reducer whose parameters are not interchangeable — for example subtraction, or accumulating a string or list by appending the element to the accumulator.

Fix the parameter binding so that for a two-parameter callback the accumulator is bound to the first parameter and the current element to the second, matching the README and the rest of the stdlib's documented behavior. Single-parameter callbacks and the existing argument-count and type validation should continue to behave as they do now. Do not change the `reduce` signature, error messages, or the behavior of other builtins.

# Test guidelines

Run `go test ./integration/...` and confirm the suite passes. Add or extend Drift-level cases under `integration/` that exercise `reduce` with non-commutative callbacks so the ordering is observable: e.g. left-fold subtraction (`reduce([10, 1, 2], 0?, fn(acc, x) { acc - x })`), and string/list building where `acc` and `x` play distinct roles. Avoid relying only on sum-style reducers, since those pass regardless of binding order. Keep tests deterministic and focused on observable evaluation results.

# Lint guidelines

Run `make fmt vet` and ensure both succeed with no remaining diffs. Code must be `gofmt -s` clean and pass `go vet ./...`.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
