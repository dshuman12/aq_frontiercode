# Task description

The reservoir sampler in `internal/sample/sample.go` can select a replacement slot index equal to the reservoir's capacity. Valid backing-storage slots are `0..cap-1`, so an index equal to `cap` is out of range: it can never address a real slot, it skews the replacement probability for items seen after the reservoir fills, and it risks an out-of-bounds access when that index is used directly.

Fix the inclusion/replacement decision so the chosen index always stays strictly within capacity. After the reservoir is full, each newly observed item must be admitted with the correct reservoir-sampling probability, and when admitted it must replace a uniformly chosen existing slot in `0..cap-1`. Items observed before the reservoir fills must still occupy successive slots as before.

Keep the exported API, function signatures, and sampling semantics unchanged apart from this correctness fix. Do not alter behavior for the not-yet-full case, and do not change how randomness is sourced; only the index range/comparison logic should change so probabilities and bounds are correct.

# Test guidelines

Run `go test ./internal/sample/...` to validate the change.

Add or extend tests in `internal/sample` to cover the post-fill replacement path: confirm chosen indices never reach `cap`, that early items fill slots `0..cap-1` directly, and that long input streams produce stable, in-range selections without panics. Prefer a seeded or injectable randomness source so replacement decisions are deterministic and assertable.

# Lint guidelines

Run `go vet ./internal/sample/...` and `go build ./...` and ensure both pass cleanly with no new warnings.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from main or any other branch.
