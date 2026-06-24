# Task description

Base32 decoding in `internal/base32/base32.go` corrupts output: the decoder accumulates 5-bit groups into a running value but extracts each output byte from the wrong bit offset, so the byte-extraction shift is off by one bit. As a result, a payload encoded with this package and then decoded does not round-trip back to its original bytes.

Fix the decode bit-offset arithmetic so that the high bits of each completed 8-bit byte are taken from the correct position in the accumulator. Encoding followed by decoding must reproduce the original input exactly, for inputs of every length (including those that require padding) and for arbitrary binary data, not just ASCII.

Keep the existing exported API, alphabet, and padding behavior unchanged; this is purely a correctness fix to the shift used when emitting decoded bytes. Encoder output must stay byte-for-byte identical, and previously valid inputs must continue to decode without new errors. Do not alter other packages or introduce new dependencies.

# Test guidelines

Run `go test ./internal/base32/...` to validate the fix. Add or extend tests in `internal/base32` so they cover round-trip encode/decode across all input lengths mod 5 (exercising every padding case), empty input, and arbitrary binary byte values. Include a direct assertion that decoding a known encoded string yields the expected raw bytes, so the shift error cannot reappear.

# Lint guidelines

Run `go vet ./internal/base32/...` and `go build ./...` before finishing; both must pass cleanly with no warnings.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from `main`, a release branch, or any other branch. Use tabs for Go indentation and keep a trailing newline per the repo `.editorconfig`.
