# Task description

Investigate and fix the panic in `pkg/watcher/watcher.go` that can occur when the watcher is stopped at the same time its context is cancelled. The watcher should tolerate concurrent or repeated shutdown paths without attempting to close the same channel or resource twice. Preserve the existing public watcher behavior: callers should still be able to start watching, receive change notifications, stop the watcher, and rely on context cancellation to end background work. The change should make shutdown idempotent and safe under races between an explicit `stop()`/close path, context cancellation, filesystem watcher errors, and goroutine exit cleanup.

Keep the fix focused on the watcher package. Do not change CLI watch semantics, scheduler behavior, parser behavior, or cache behavior unless a direct compile-time contract requires it. Avoid introducing long sleeps, timing-sensitive polling, or goroutine leaks; tests should be deterministic enough for normal `go test` execution. If the watcher exposes a stop or close function, its contract should remain compatible with existing callers while adding the guarantee that calling it more than once, or calling it after cancellation, does not panic.

Success means the watcher can be shut down from multiple paths in any order, all owned goroutines and filesystem watcher resources are released, and the existing watch notifications continue to work for valid file changes.

# Test guidelines

Run the visible test command:

```sh
go test ./...
```

Also run the repository’s normal validation workflow when possible:

```sh
make test
make lint
```

`make test` runs the suite with the race detector, `-count=1`, and a 60 second timeout, which is especially relevant for this concurrency fix. `make lint` runs `go vet ./...` and `golangci-lint` when it is installed.

Add or update tests under `pkg/watcher`. Cover the race-prone shutdown cases directly: stopping twice, cancelling the context and then stopping, stopping and then cancelling, and any existing event-loop path that might close shared channels during exit. Tests should fail on a double-close panic rather than merely checking that no events are produced. Where temporary files or directories are needed, use Go test temp directories and clean up watchers promptly.

Keep tests portable across Linux and macOS. Filesystem notification delivery can differ by platform, so do not rely on exact event counts or fragile timing. Prefer assertions about safe shutdown, absence of panic, and eventual goroutine completion over assumptions about a specific fsnotify event sequence.

# Lint guidelines

Format Go code with:

```sh
gofmt -w pkg/watcher
```

If imports change, run the repository formatter target:

```sh
make fmt
```

Before finishing, ensure `go vet ./...` passes either directly or through `make lint`. Do not add dependencies for this fix unless they are clearly necessary; the standard library synchronization primitives should be sufficient for idempotent shutdown.

# Style guidelines

Keep the patch small and idiomatic Go. Use clear ownership for channels and external resources: only one path should perform the actual close, and all other shutdown paths should observe that it has already happened. Prefer simple synchronization such as `sync.Once`, a mutex-protected state flag, or context-aware coordination that makes the lifecycle obvious to reviewers.

Avoid masking panics with broad `recover` blocks; the watcher should be structurally safe rather than silently swallowing double-close bugs. Do not add logging noise or change user-facing output for normal watch operation. Maintain existing function names, exported types, and return values unless a compile error exposes an unavoidable mismatch, and keep comments concise when they clarify lifecycle guarantees.
