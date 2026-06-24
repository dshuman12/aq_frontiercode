# Task description

The JSON number scanner in `internal/json2/json2.go` does not correctly consume exponents written with an uppercase `E`. JSON permits both `e` and `E` as the exponent marker, but the scanner only recognizes the lowercase form. As a result, a value like `1.5E+2` stops being consumed at the `E`, so the number is truncated, the trailing characters are misread, or the parse fails outright. Lowercase exponents such as `1.5e+2` already parse correctly.

Fix the number scanner so an uppercase `E` exponent marker is treated identically to a lowercase `e`. Both forms, with or without an explicit `+`/`-` sign and across integer and fractional mantissas (for example `1E3`, `1.5E+2`, `2.0E-4`, `-7E+0`), must scan to completion and yield the same parsed numeric value as their lowercase equivalents.

Keep the rest of the parser's behavior unchanged: existing handling of integers, decimals, lowercase exponents, malformed numbers, and surrounding tokens must continue to work exactly as before. Do not alter exported names or function signatures, and confine changes to the number-scanning logic.

# Test guidelines

Run `go test ./internal/json2/...` and confirm the package passes. Add or extend table-driven cases in `internal/json2` covering uppercase-`E` exponents with positive, negative, and unsigned exponents over both integer and fractional mantissas, and assert they parse equivalently to the lowercase form. Include a regression case showing a value immediately followed by another token still delimits correctly. Existing lowercase and malformed-number cases must continue to pass.

# Lint guidelines

Run `go build ./...`, `go vet ./...`, and `gofmt -l internal/json2` and ensure each reports no issues. The committed code must be gofmt-clean with no formatting diff remaining.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from `main` or any other branch. Target Go 1.22, add no new runtime dependencies, and keep the diff the smallest change that solves the problem.
