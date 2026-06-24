# Task description

The precedence-climbing logic in `parseBinaryExpr` (`pkg/parser/parser.go`) groups operators of equal precedence incorrectly: chains like `a - b - c` or `a + b - c` are built so the rightmost operator ends up at the root of the subtree, producing a right-associated AST. For these operators the language is left-associative, so `a - b - c` must parse as `(a - b) - c`, and `a + b - c` as `(a + b) - c`.

Restore left-associative grouping for all binary operators that share a precedence level (e.g. `+`/`-` at `PrecTerm`, `*`/`/`/`%` at `PrecFactor`, comparison and equality operators, `&&`/`||`). The fix should affect only how equal-precedence operands fold into the tree; single-operator expressions, parenthesized subexpressions, mixed-precedence chains, and right-associative constructs handled elsewhere must keep their current AST shapes and evaluation order.

Do not change `pkg/parser/precedence.go`, the `Precedence` ordering, or operator-to-precedence mappings. Keep the existing `BinaryExpression` AST node and parser method signatures unchanged so the evaluator and checker continue to work without modification.

# Test guidelines

Run `go test ./pkg/parser/...` to validate the change. Add or extend tests in `pkg/parser` that assert the nested AST structure of equal-precedence chains (such as `a - b - c` and `a + b - c`) groups left, and include coverage for `*`/`/`/`%`, comparison, and logical chains plus a single-operator and parenthesized case to guard against regressions. Run `go test ./...` to confirm the evaluator and checker still pass.

# Lint guidelines

Run `make fmt` and `make vet` before finishing; both must be clean with no remaining formatting diffs.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
