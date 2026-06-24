# Task description

Retry backoff in the job queue does not grow with successive failures. After each failed attempt a job is requeued with a fixed, oversized delay derived from its maximum retry budget rather than from how many attempts it has actually made. The intended behavior is exponential backoff anchored at the base delay: the first retry waits one base delay, the second waits twice the base, the third four times the base, and so on, doubling per attempt and scaling with the job's own attempt count.

Fix the backoff computation in `internal/jobqueue/jobqueue.go` so the requeue delay for a job is the base delay multiplied by two raised to the number of attempts it has already completed, growing on each retry. Preserve the existing terminal behavior: a job that has exhausted its maximum attempts is marked failed and is not requeued. Keep the package's exported types, function signatures, and field names unchanged; only the delay derivation should change.

# Test guidelines

Run `go test ./internal/jobqueue/...` to validate. Add or extend tests in `internal/jobqueue` covering the per-attempt delay progression (base, 2x base, 4x base, ...), the boundary where attempts reach the maximum and the job transitions to failed rather than being requeued, and that the delay depends on attempts made rather than the configured retry budget.

# Lint guidelines

Run `go vet ./internal/jobqueue/...` and `go build ./...` and ensure both pass cleanly with no new warnings.

# Style guidelines

Use tabs for indentation per `.editorconfig`. Keep the change minimal and confined to the backoff calculation; do not alter unrelated queue scheduling, the `internal/backoff` package, or other packages. Target Go 1.22.

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
