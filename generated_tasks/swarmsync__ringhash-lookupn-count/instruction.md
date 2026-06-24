# Task description

The consistent hash ring in `pkg/hash/ring.go` exposes a replica-lookup that, given a key, walks the ring clockwise and collects the N distinct physical nodes responsible for that key. The returned set is correctly ordered (clockwise from the key's hash position) and already de-duplicates virtual nodes that map back to the same physical member. However, when the ring contains more than N distinct members, the lookup returns N+1 nodes instead of N.

Fix the count so the lookup returns exactly N distinct nodes when enough members exist. The clockwise ordering, distinctness guarantee, and wrap-around traversal behavior must remain unchanged. When N is greater than or equal to the number of distinct members, the result must still be capped at the member count (no duplicates, no padding), so this edge case keeps working as it does today.

Do not alter the lookup's exported signature, the hashing scheme, virtual-node placement, or any other method in the package. The fix should be limited to the off-by-one in the collection loop's termination condition.

# Test guidelines

Run `go test ./pkg/hash/...` to validate. Add or extend tests in `pkg/hash` covering: a ring with more distinct members than N (result length must equal N), N equal to the member count, N larger than the member count (capped at member count), and that ordering plus distinctness are preserved across the wrap-around boundary.

# Lint guidelines

Run `go vet ./pkg/hash/...` and `gofmt -l pkg/hash` before submitting; `gofmt` must report no files.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
