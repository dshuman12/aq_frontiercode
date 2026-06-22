# Task description

Fix two issues in the Bloom filter package (`pkg/bloom/filter.go`), keeping all changes confined to `pkg/bloom`.

**Correctness:** `CountingFilter` can incorrectly report a previously-added, not-fully-removed element as absent. This false negative violates the core Bloom filter guarantee. Ensure membership queries remain reliable across arbitrary add/remove sequences, including elements added multiple times and heavy interleaved churn from unrelated elements. An element that has been added more times than it has been removed must always test as present. Removal behavior for unaffected elements must stay correct, and counters must not be corrupted by saturation or underflow.

**Performance:** `Filter.FillRatio` currently scans the entire bit array on every call. Make it run in constant time while returning exactly the same value for every reachable filter state, including after unions, additions, and resets.

Preserve all exported names, method signatures, and serialization formats so existing callers and any persisted/encoded filters continue to work unchanged. Externally observable behavior must remain identical apart from the corrected false-negative case and the faster `FillRatio`.

# Test guidelines

Run `go test ./...` to validate. Bloom filter tests live in `pkg/bloom` (`pkg/bloom/bloom_test.go`); extend or add cases there to cover the regression and the invariant.

Add coverage for: repeated additions and partial removals of an element confirming it still tests present; interleaved add/remove churn across many elements; and `FillRatio` correctness after sequences of additions, unions, and resets, asserting it matches a full-scan computation for each state.

# Lint guidelines

Run `go vet ./...` and `gofmt -l pkg/bloom` (expect no output) before submitting.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
