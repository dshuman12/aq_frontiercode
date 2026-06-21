# Task description

Two bugs exist in `pkg/hash/ring.go`:

Two bugs exist in `pkg/hash/ring.go`:

**(1)** Both `Lookup` and `LookupN` produce a wrong node assignment for certain keys. When a key's hash value lands precisely on a virtual-node position in the ring, the search skips that position and wraps to the next node instead. Keys whose hashes fall strictly between positions, and the wrap-around case past the last position, behave correctly — only the exact-match boundary case is affected.

**(2)** The `clone()` method initializes the clone with an incorrect replica count, causing `TransferKeys()` to simulate key redistribution with far too few virtual nodes for the new node. The resulting transfer counts are significantly underestimated.

Fix both bugs. Do not alter the hashing function, ring construction, public signatures, or return types of any methods, and keep behavior in all other packages unchanged.

Success is observable: a key whose hash lands precisely on a node boundary resolves to that node; `LookupN` returns the same set of distinct nodes starting from the corrected position; and `TransferKeys` produces transfer counts consistent with a ring that uses the correct replica count.

# Test guidelines

Run `go test ./pkg/hash/...` to validate the change. Add or extend cases in `pkg/hash` that exercise the exact-match boundary for both `Lookup` and `LookupN`, including a hash equal to the smallest and largest ring positions and the wrap-around past the end. Keep existing distribution and replication tests passing.

# Lint guidelines

Run `gofmt -l pkg/hash` and `go vet ./pkg/hash/...` and ensure both report no issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
