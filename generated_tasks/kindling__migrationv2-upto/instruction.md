# Task description

In `internal/migrationv2/migrationv2.go`, the "up to" migration flow stops one step too early. When callers request a migration up to a given target version, the migration whose version equals the requested target is skipped, leaving the schema one version below what was asked for. The target must be treated as inclusive.

Fix the stop condition so that every pending migration with a version less than *or equal to* the target is applied, in ascending order, and the final recorded schema version matches the requested target exactly when such a migration exists. Requests for a target above the highest known migration should still apply everything available; requests at or below the current version should remain a no-op. Preserve the existing ordering, error handling, and any already-applied tracking, and keep the public function signatures and exported names unchanged so existing callers continue to compile. Do not alter the "up to latest" behavior or migrations in other packages.

# Test guidelines

Run `go test ./internal/migrationv2/...` and ensure it passes. Add or extend tests in `internal/migrationv2` covering: a target equal to an existing migration version (the boundary case), a target between two versions, a target above all migrations, and a target at or below the current version. Assert on the resulting recorded version, not only on the count of applied steps.

# Lint guidelines

Run `go vet ./internal/migrationv2/...` and `go build ./...` cleanly before finishing. Keep imports tidy and code `gofmt`-formatted with tab indentation.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from `main` or any other branch. Keep the diff minimal and scoped to the inclusive-target fix.
