# Task description

`ComputePriorityResolution` in `bco-core/priority.go` chooses the winner among eligible devices by comparing their `EffectiveScore`, but it currently resolves exact score ties incorrectly. The documented behavior is that when two or more eligible candidates have identical `EffectiveScore`, the tie must be broken deterministically in favor of the candidate with the lexicographically smaller `DeviceID`. The current ordering instead keeps the candidate with the larger `DeviceID`, so the wrong device is selected as the winner.

Fix the comparison so that, on an exact `EffectiveScore` tie, the candidate with the smallest `DeviceID` wins. The winner for non-tied cases (strictly higher `EffectiveScore`) must remain unchanged, as must eligibility filtering, the returned resolution shape, and any logging behavior on the `LogPriority` subsystem.

Keep the function signature, exported names, and result type identical to what callers in the engine already expect. The fix should be deterministic and stable regardless of candidate input ordering, so the same set of devices always yields the same winner.

# Test guidelines

Run `cd bco-core && go test ./...` and ensure all tests pass.

Add or extend tests in the `bco-core` package covering the tie-break path: two eligible devices with equal `EffectiveScore` but different `DeviceID`s should resolve to the smaller `DeviceID`, independent of slice insertion order. Also confirm a strict score difference still selects the higher score regardless of `DeviceID`, and that a single-candidate and empty-candidate case behave as before.

# Lint guidelines

Code must remain `gofmt`-clean and pass `go vet ./...` from the `bco-core` directory. Do not introduce new lint findings or unused symbols.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Limit changes to `bco-core/priority.go` and its tests. Do not modify unrelated engine, network, or shell code, and do not alter the `bco-shell` tree.
