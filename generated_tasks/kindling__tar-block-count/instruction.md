# Task description

The tar layout logic in `internal/tar/tar.go` computes how many fixed-size data blocks a record occupies, but it derives that count with truncating integer division. As a result, any record whose byte size is not an exact multiple of the block size is allotted one block too few, and a small non-empty record can be assigned zero blocks. This drops trailing bytes from the layout.

Fix the block-count computation so it rounds up (ceiling division) and always reserves enough whole blocks to cover every byte of the record. The corrected behavior must hold across the boundaries: a zero-length record still maps to zero blocks, a record exactly one block in size maps to one block, a record one byte over a block boundary maps to two blocks, and so on.

Keep the existing exported names, function signatures, and block-size constant unchanged so callers and surrounding layout math are unaffected. Only the rounding behavior of the data-block count should change; padding and header handling must remain as they are.

# Test guidelines

Run `go test ./internal/tar/...` and confirm it passes.

Add or extend tests in `internal/tar` to cover the block-count behavior at the critical edges: empty records, sizes equal to an exact multiple of the block size, and sizes that overflow a block boundary by a single byte and by an arbitrary partial amount. Each paired `*_test.go` should fail before the fix and pass after it.

# Lint guidelines

Run `go vet ./internal/tar/...` and `go build ./...` and ensure both report no problems. Match the surrounding file's formatting with `gofmt`; tabs for indentation per `.editorconfig`.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
