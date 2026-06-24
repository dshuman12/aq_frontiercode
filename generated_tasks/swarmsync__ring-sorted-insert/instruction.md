# Task description

The consistent hash ring in `pkg/hash/ring.go` maintains a sorted slice of virtual-node hash positions, and key lookups rely on binary search over that slice to find the owning node. When a node is added, each of its virtual-node hashes must be inserted into the slice while preserving ascending sort order. The current insert logic shifts the wrong span of elements when making room for a new value: instead of moving the tail after the insertion index, it overwrites existing entries, leaving stale or duplicated positions and an unsorted ring.

Because every lookup binary-searches the ring, a broken ordering corrupts key placement, undermines load balance across virtual nodes, and breaks the minimal-disruption property when membership changes.

Fix the insertion so the ring stays fully sorted and intact after any sequence of node additions. Do not change exported names, method signatures, or the hashing scheme; lookups, removals, and the virtual-node replication factor must keep behaving as before. Limit changes to the ring's insert path and avoid touching unrelated packages.

# Test guidelines

Run `go test ./pkg/hash/...` to validate. Add or extend tests in `pkg/hash` covering: inserts that preserve ascending order, additions interleaved across multiple nodes, no overwritten or duplicated positions, and stable key-to-node resolution after several adds. Cover boundary inserts at the front and back of the slice. Avoid relying on map iteration order for deterministic assertions.

# Lint guidelines

Run `gofmt -w` on changed files and `go vet ./pkg/hash/...` before submitting. The code must build cleanly with `go build ./...`.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
