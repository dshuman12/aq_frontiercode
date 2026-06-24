# Task description

`internal/formatlog` renders a sequence of log records into a single output, joining individual records with a newline separator. The current separator logic writes the separator newline on every iteration of the loop, including the first one. As a result, the rendered output begins with a spurious leading `\n` before the very first record.

Fix the separator handling in `internal/formatlog/formatlog.go` so that newlines appear strictly *between* rendered records, with no leading newline before the first record and no behavioral change to how individual records are formatted. A single record should render with no surrounding separator newline; multiple records should be joined by exactly one `\n` between each adjacent pair.

Keep the public function signatures and exported names in this package unchanged. Only the separator placement should change; record content, ordering, and trailing-output behavior must remain identical to today. Avoid touching unrelated packages or introducing new dependencies.

# Test guidelines

Run `go test ./internal/formatlog/...` to validate the change.

Add or update tests in `internal/formatlog` covering the empty-input case (no output, no stray newline), the single-record case (no leading or separating newline), and the multi-record case (records separated by exactly one `\n` with none before the first). Assert on the exact rendered bytes so a regression in separator placement is caught.

# Lint guidelines

Run `go vet ./internal/formatlog/...` and `go build ./...` and ensure both pass cleanly with no new warnings.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Match the existing formatting in the package; keep `gofmt` clean with tab indentation and a final newline per `.editorconfig`.
