# Task description

`pruneSince` in `bco-core/ratelimit.go` compacts a timestamp slice down to the entries still inside the rolling window. It is the shared core used by both `peerAppRateLimiter` and `inboundIPRateLimiter`, so its boundary semantics drive every rolling-window rate decision in the network layer.

The window cutoff is currently treated as inclusive: a timestamp landing exactly on the cutoff is kept as "still inside the window." That retains the oldest sample one tick too long, shifting every rolling-window decision by one boundary event and inflating effective counts right at second and minute boundaries.

Make the prune cutoff exclusive so that a timestamp falling exactly on the window boundary is dropped, while timestamps strictly newer than the cutoff are kept. Only the boundary-equality case should change; samples clearly inside or outside the window must behave as before, and the function's signature, return contract, and ordering guarantees must stay intact. Both rate limiters should observe the corrected boundary behavior without any additional changes at their call sites.

Keep the change confined to the prune logic. Do not alter the rate-limit thresholds, window durations, exported limiter constructors, or the connection-gater wiring in `network.go`.

# Test guidelines

Run `cd bco-core && go test ./...` and confirm the suite passes.

Add or extend tests under `bco-core` covering `pruneSince` boundary semantics: a timestamp exactly on the cutoff must be pruned, a timestamp one tick newer must be retained, and entries well inside or well outside the window must be unaffected. Include coverage that the corrected cutoff flows through both `peerAppRateLimiter` and `inboundIPRateLimiter` so effective counts at second/minute boundaries are not inflated. Keep existing rate-limit tests green.

# Lint guidelines

Run `gofmt` and `go vet ./bco-core/...` and resolve any reported issues. Code must be formatted and vet-clean before completion.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
