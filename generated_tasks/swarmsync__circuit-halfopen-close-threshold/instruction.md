# Task description

The three-state circuit breaker in `pkg/circuit/breaker.go` is failing to complete its recovery cycle. When the breaker is open and the cool-down elapses, it correctly transitions to half-open and begins admitting probe requests. However, once it has accumulated exactly the configured number of consecutive successful probes, it never transitions back to closed. Instead it remains stuck in half-open, continuing to throttle traffic to a service that has already recovered.

Fix the half-open success accounting so the breaker closes as soon as the required number of consecutive half-open successes is reached. After closing, the breaker should resume normal closed-state behavior: success/failure counters relevant to the half-open probe window must be reset so a subsequent fault episode starts from a clean slate.

Keep the existing exported API, state constants, configuration fields, and method signatures unchanged. Preserve the current behavior for the open and closed states, including failure-threshold tripping from closed to open and the half-open-failure path back to open. Only the success-driven half-open-to-closed transition should change. Avoid touching other packages.

# Test guidelines

Run `go test ./pkg/circuit/...` to validate the change. Add or extend tests in `pkg/circuit` to cover driving the breaker open, waiting for the half-open transition, then feeding exactly the threshold count of successful probes and asserting the state becomes closed. Also cover the boundary case where one fewer success keeps it half-open, and confirm a failure during half-open still reopens it.

# Lint guidelines

Run `go vet ./pkg/circuit/...` and `gofmt -l pkg/circuit` to confirm the code is vet-clean and properly formatted with no listed files.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
