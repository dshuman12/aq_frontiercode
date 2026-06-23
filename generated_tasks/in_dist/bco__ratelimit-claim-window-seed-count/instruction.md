# Task description

`AllowClaimRequest` in `bco-core/ratelimit.go` is meant to permit at most 2 `CLAIM_REQUEST` messages per peer within each fixed 5-second window. When a request arrives that opens a brand-new window (rollover, or the very first request for a peer), the limiter resets the window but does not count the request that triggered the rollover. As a result the running count starts at zero instead of one, so a fresh window effectively allows three claims before it begins denying — an off-by-one. The first claim immediately after start still appears correct, which masks the defect.

Fix the rollover path so the request that opens a window is included in that window's count. After the change, within any single 5-second window a peer's first two `CLAIM_REQUEST`s must be allowed and the third and beyond denied, regardless of whether the window was just opened or already active. Once the window elapses, the count must reset and again admit exactly two. Keep the existing method signature, window duration, per-peer isolation, and concurrency safety unchanged; do not alter how other rate limiters (inbound IP) behave.

# Test guidelines

Run `cd bco-core && go test ./...` and confirm all packages pass. Add or extend table-driven tests in the `bco-core` package covering: the first claim in a new window, the second claim, the denied third claim within the same window, window rollover resetting the count, and per-peer independence so one peer's usage does not affect another. Tests should drive time deterministically rather than sleeping on the wall clock.

# Lint guidelines

Run `gofmt`/`go vet` over the changed files and ensure no formatting diffs remain. Keep the package building cleanly with `CGO_ENABLED=1`.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
