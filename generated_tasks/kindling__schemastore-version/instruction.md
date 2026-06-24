# Task description

The schema registry in `internal/schemastore/schemastore.go` performs an optimistic-concurrency check when registering a new schema version for a subject: the caller passes the version it expects to be assigned, and the store rejects the request with a version-mismatch error if that expectation does not match the next sequential version.

The expected-version computation is off by one. It currently derives the expected next version from the count of existing versions, so a subject with N stored versions computes an expected version of N instead of N+1. As a result, the first registration for a brand-new subject (which has zero existing versions) expects version 0 and rejects the caller's correct value of 1, and every subsequent registration is similarly shifted.

Fix the computation so that a subject with N existing versions accepts the next registration as version N+1. The first version of any subject must be 1. Registrations that supply a value other than N+1 must still be rejected with the existing mismatch error, and the returned/stored version of a successful registration must equal N+1. Keep the exported function signatures, error values, and storage layout unchanged.

# Test guidelines

Run `go test ./internal/schemastore/...` and ensure it passes. Add or extend tests in `internal/schemastore` to cover registering the first version (expecting 1), several sequential versions for one subject, and rejection when the supplied version is too low or too high. Each package keeps a paired `*_test.go`; place new cases there rather than introducing new test files unnecessarily.

# Lint guidelines

Run `go vet ./internal/schemastore/...` and `go build ./...` and resolve any reported issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
