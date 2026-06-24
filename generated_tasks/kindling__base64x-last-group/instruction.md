# Task description

The base64 encoder in `internal/base64x/base64x.go` drops the final complete three-byte group when the input length is an exact multiple of three. The main encoding loop terminates one group too early, so the last group's bytes are silently omitted from the encoded output. As a result, `Encode` followed by `Decode` does not round-trip for inputs whose length is divisible by three (3, 6, 9, ... bytes), and the encoded output is shorter than the standard base64 length for those inputs.

Correct the loop boundary so every complete three-byte group is encoded, including the final one. The fix must not regress inputs whose length is not a multiple of three (those already exercise the tail/padding path correctly) and must keep existing padding behavior, the alphabet, and the exported function signatures unchanged. After the fix, encoding any byte slice must produce output identical to standard base64 for the configured alphabet, and decoding that output must reproduce the original bytes exactly.

Keep the change scoped to this package; do not touch unrelated encoders such as `base32`, `hexx`, or `adler32x`.

# Test guidelines

Run `go test ./internal/base64x/...` to validate the change.

Add or extend table-driven cases in `internal/base64x` covering inputs of length 0, 1, 2, 3, 4, 6, and 9 bytes, asserting both exact encoded strings and full `Encode`/`Decode` round-trips, with explicit coverage for multiple-of-three lengths to lock in the regression. Confirm the tail/padding path for non-multiple-of-three inputs still passes.

# Lint guidelines

Run `go vet ./internal/base64x/...` and ensure `go build ./...` succeeds with no formatting changes left behind (`gofmt`).

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from `main` or any other branch.
