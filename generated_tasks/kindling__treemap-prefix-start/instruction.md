# Task description

`Map.PrefixMatches` in `internal/treemap/treemap.go` returns all stored keys that begin with a supplied prefix. The implementation relies on the map keeping keys in sorted order: every match forms a single contiguous run that starts at the first key not less than the prefix and continues while keys keep the prefix. The current scan begins one position past that first candidate, so the earliest match is dropped. In practice this means a key that equals the prefix exactly, or that is simply the first key sharing it, is silently omitted while later matches are still returned correctly — making the gap easy to overlook.

Fix `PrefixMatches` so it includes the first matching key. The returned slice must contain every stored key with the prefix, in ascending sorted order, with no duplicates and no keys lacking the prefix. An empty prefix should return all keys. When nothing matches, return an empty (non-nil-sensitive) result consistent with the current contract. Keep the existing exported signature and the behavior of all other `Map` methods unchanged; this is a boundary fix, not a rewrite of the traversal strategy.

# Test guidelines

Run `go test ./internal/treemap/...` and confirm it passes. Add or extend table-driven cases in `internal/treemap` covering: an exact prefix-equal key, a prefix that is the very first stored key, single-element runs, the empty prefix returning every key, and a prefix with no matches. Verify ordering and that no non-matching neighbors leak in. Do not weaken existing assertions.

# Lint guidelines

Run `go vet ./internal/treemap/...` and `go build ./...` and ensure both are clean. Keep imports tidy and code `gofmt`-formatted.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
