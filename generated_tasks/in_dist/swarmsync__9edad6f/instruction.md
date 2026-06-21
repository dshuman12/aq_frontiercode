# Task description

The consistent-hash ring in `pkg/hash/ring.go` maps keys to virtual nodes by hashing the key and performing a binary search over the sorted ring of virtual-node positions. Both `Lookup` and `LookupN` currently use a strict greater-than comparison when locating the first ring position past the key's hash. As a result, when a key hashes to a value that *exactly* equals a virtual node's position, the search skips that position and wraps to the next node, yielding a deterministic but incorrect assignment for the affected keys.

Fix the binary search in both `Lookup` and `LookupN` so that a key whose hash equals a virtual node position is assigned to that node rather than the following one. The boundary condition is the only thing that should change: keys that fall strictly between positions, and the wrap-around case past the last position, must continue to behave exactly as before. Do not alter the hashing function, ring construction, virtual-node count handling, public signatures, or return types of these methods, and keep behavior in all other packages unchanged.

Success is observable: a key whose hash lands precisely on a node boundary resolves to that node, and `LookupN` returns the same set of distinct nodes starting from the corrected position.

# Test guidelines

Run `go test ./pkg/hash/...` to validate the change. Add or extend cases in `pkg/hash` that exercise the exact-match boundary for both `Lookup` and `LookupN`, including a hash equal to the smallest and largest ring positions and the wrap-around past the end. Keep existing distribution and replication tests passing.

# Lint guidelines

Run `gofmt -l pkg/hash` and `go vet ./pkg/hash/...` and ensure both report no issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
