# Task description

The CSV writer in `internal/csv/csv.go` appends an extra row separator after the final record, so serialized output ends with a spurious blank line rather than ending immediately after the last record's data. The separator is meant to delimit rows, so it should appear only between consecutive rows, never trailing the last one.

Fix the writer so that output for any non-empty set of rows ends right after the final field of the last row, with no trailing newline. The header row, when emitted, should continue to be separated from the first data row exactly as before. Empty input (no rows) should still produce no spurious output.

Keep field quoting, escaping, and delimiter handling unchanged; only the placement of the row separator should change. Preserve the existing exported names and function signatures in the package so callers and other packages continue to compile without modification. Avoid touching unrelated packages and sample data files.

# Test guidelines

Run `go test ./internal/csv/...` to validate the change. Add or update tests in `internal/csv` covering single-row output, multi-row output, header-plus-rows output, and the empty-input case, asserting the exact serialized bytes so the absence of a trailing newline is pinned and regressions are caught.

# Lint guidelines

Run `go vet ./internal/csv/...` and `go build ./...` and ensure both pass cleanly. Keep the diff minimal and focused on the separator placement.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from `main` or any other branch. Follow `.editorconfig`: tab indentation for Go and a final newline in source files.
