# Task description

The `internal/validate2` package includes a "timestamp recent" check that rejects records older than a configured maximum age. The boundary condition is wrong: a record whose age equals the configured limit exactly (for example, exactly 60s old under a 60s limit) is currently classified as too old and fails validation. Per the intended semantics, only records *strictly* older than the limit should fail; a record sitting precisely at the boundary must still count as recent and pass.

Adjust the age comparison in `internal/validate2/validate2.go` so the limit is inclusive. A record whose age is less than or equal to the configured maximum passes the recency check; a record whose age strictly exceeds it fails. Keep the existing function signatures, exported names, error values, and validation messages unchanged—only the comparison boundary should move. Other validation rules in the package and their ordering must behave exactly as before.

# Test guidelines

Run `go test ./internal/validate2/...` and confirm it passes. Add or extend tests in `internal/validate2` to lock in the boundary behavior: a record exactly at the limit passes, a record one unit under it passes, and a record just over the limit still fails. Avoid relying on wall-clock timing; drive the check with explicit ages or fixed timestamps so tests stay deterministic.

# Lint guidelines

Run `go vet ./internal/validate2/...` and `go build ./...` and ensure both are clean before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
