# Task description

Restore short-circuit evaluation for the logical `&&` operator in `evalBinaryExpr` (`pkg/evaluator/evaluator.go`). Currently both operands are evaluated unconditionally before the operator is applied, so when the left operand is falsy the right-hand side still runs. This breaks the common guard pattern where a falsy left side protects an expensive or failing right side (for example a zero-check placed before a division). The right side must not be evaluated at all when the left operand already determines the result.

The fix should special-case `&&` so that the left operand is evaluated first, and when it is falsy the operator resolves to that left value without touching the right operand. When the left operand is truthy, the right operand is evaluated and returned as before. Use the existing truthiness rules already applied elsewhere in the evaluator so behavior stays consistent across the language.

Only the eager-evaluation behavior is wrong; the value produced for a falsy left operand is already correct and must remain unchanged. Limit changes to the `&&` path — leave `||`, comparison, arithmetic, and other binary operators untouched, and do not alter `binops.go` or any other package.

# Test guidelines

Run `go test ./pkg/evaluator/...` to validate the change. Add or extend tests in `pkg/evaluator` covering: a falsy left operand whose right side would error (such as division by zero) resolving without that error, a falsy left side that guards an observable side effect confirming the side effect never runs, and a truthy left operand that still evaluates and returns the right side. Confirm existing `&&` result values are unaffected.

# Lint guidelines

Run `make fmt vet` before finishing. Code must be `gofmt -s` clean and pass `go vet ./...` with no new findings.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
