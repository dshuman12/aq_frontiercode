# Task description

`internal/valueshape` infers the shape of string values, including whether a value looks like an IPv4 address in dotted-quad form. The current octet validation rejects valid addresses whose octets equal 255, so inputs like `192.168.1.255` and `255.255.255.0` are misclassified as generic strings instead of IPv4 addresses. This is an off-by-one in the upper bound of the octet range check.

A dotted-quad octet is valid across the full `0..255` range, inclusive of both endpoints. Adjust the range validation in `internal/valueshape/valueshape.go` so that an octet of `255` is accepted, while everything that was already correct stays unchanged: values with an octet of `256` or higher, the wrong number of segments, empty octets, leading-zero handling, and non-numeric segments must still be rejected as not-IPv4.

Keep the existing exported classification API and its return type intact; this is purely a correctness fix to the boundary condition. Do not broaden classification to other formats (IPv6, CIDR) or alter how non-IPv4 strings are shaped.

# Test guidelines

Run `go test ./internal/valueshape/...` and confirm it passes.

Add or extend table-driven cases in `internal/valueshape` covering addresses whose octets are exactly `255` (including `255.255.255.0` and `192.168.1.255`), and assert the boundary by keeping a `256` octet classified as a non-IPv4 string. Preserve existing coverage for segment count, empty octets, and non-numeric segments so the boundary fix does not regress other shapes.

# Lint guidelines

Run `go vet ./internal/valueshape/...` and ensure `go build ./...` succeeds with no new warnings.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
