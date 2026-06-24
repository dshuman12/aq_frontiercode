# Task description

The tag index in `internal/tagindex/tagindex.go` maintains, per tag, a sorted posting list of record ids. When a new id is added, the code locates an insertion point with a binary search and then checks whether the id is already present before splicing it in. That dedup check is currently broken: the binary search resolves to the position just past an equal id rather than landing on it, so the "already present" comparison inspects the wrong slot and fails to see the existing entry. As a result, adding an id that is already in a posting list inserts a second copy, leaving duplicates in a list that is supposed to be a sorted set.

Fix the insertion path so an id already present in a posting list is detected and not re-inserted. After the fix, each posting list must remain sorted in ascending order and contain no duplicate ids, regardless of insertion order or repeated adds of the same id. Preserve the existing exported names, method signatures, and return types; this is a correctness fix to the search/insert logic only, not an API change. Do not alter the on-disk or serialized representation or behavior of unaffected tags.

# Test guidelines

Run `go test ./internal/tagindex/...` and ensure it passes. Add or extend tests in `internal/tagindex` covering: adding an already-present id is a no-op, repeated adds of the same id leave a single entry, and interleaved adds of new and duplicate ids keep each posting list sorted and unique. Include boundary cases such as duplicates at the first and last positions of a list.

# Lint guidelines

Run `go build ./...`, `go vet ./...`, and `gofmt` so the package builds cleanly, passes vet, and stays formatted. Do not introduce new runtime dependencies.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
