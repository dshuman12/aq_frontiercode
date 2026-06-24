# Task description

The query planner's cardinality estimator computes the estimated row count for an intersection node incorrectly. An intersection (logical AND of multiple inputs) can never produce more rows than its smallest input, since a row must satisfy every branch to survive. The current logic in `internal/queryplanner/queryplanner.go` takes the maximum estimated rows across the intersection's inputs, which inflates the estimate and leads the planner to pick worse join orders and access paths.

Fix the estimator so an intersection node's estimated rows equals the minimum estimated rows across its inputs. Union and other node kinds must keep their existing estimation behavior unchanged, and the public estimation entry points (function names, signatures, and return types) must stay the same so callers and other planner stages are unaffected. Empty-input handling and any existing zero/overflow guarding should remain consistent with how the planner already treats degenerate nodes.

The observable outcome: for a plan whose intersection inputs estimate to differing row counts, the planner reports the smallest input's estimate rather than the largest, producing tighter, correct cardinality estimates.

# Test guidelines

Run `go test ./internal/queryplanner/...` and ensure it passes.

Add or extend tests in `internal/queryplanner` covering an intersection over inputs with distinct estimates (confirming the minimum is chosen), an intersection where one input estimates zero rows, a single-input intersection, and a union to confirm its estimate is untouched. Verify nested intersection/union combinations propagate estimates correctly.

# Lint guidelines

Run `go vet ./internal/queryplanner/...` and `go build ./...` and resolve any reported issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
