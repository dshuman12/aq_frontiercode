# Task description

Investigate and fix the concurrent workflow-start race exercised by the engine concurrency tests. `Engine.StartWorkflow` must behave correctly when multiple goroutines try to start the same logical workflow at the same time, especially when an idempotency key is configured. The observable contract should be that concurrent starts for the same namespace, workflow ID, and idempotency key return one shared `types.Execution` and do not create duplicate workflow records, duplicate start history, or extra initial decision tasks. Calls without an idempotency key should keep the existing behavior and validation rules.

The fix should fit the engine’s current concurrency model: state changes for a run are serialized through engine-managed locks, storage remains the durable authority, and public method signatures should not change. Preserve existing defaults for namespace and task queue, existing error wrapping where possible, metrics semantics for successful starts, and the in-process nature of `IdempotencyCache`. Avoid broad rewrites of storage backends or unrelated workflow lifecycle code; the issue should be solved at the boundary where start requests, idempotency lookup/remember, and workflow creation interact under concurrency.

Add or update tests in `internal/engine` that reliably cover the race-prone scenario. The tests should assert externally visible outcomes such as all callers receiving the same execution for a shared idempotency key, a single workflow being listed or described, and only the expected initial history/task side effects being present. Include enough concurrency to make the regression meaningful while keeping the test deterministic and fast.

# Test guidelines

Run the visible test command:

```sh
go test ./...
```

Also run the repository’s race-aware validation workflow:

```sh
make test
```

`make test` expands to `go test -race ./...` and is important for this task because the bug is concurrency-related. If the change touches API behavior outside the engine, run the relevant package tests directly as well, but prefer the full suite before finishing.

Public tests for this task belong in `internal/engine`. They should exercise concurrent `StartWorkflow` calls against the existing in-memory store where possible, and should check both success values and persisted side effects rather than relying only on absence of panics. Keep sleeps and timing assumptions out of the test unless unavoidable; use goroutines, synchronization primitives, and result collection to force overlap.

# Lint guidelines

Run:

```sh
make lint
```

This runs `go vet ./...`. Ensure all edited Go files are formatted with `gofmt`; the project does not use a separate formatter configuration. If you add helper types or synchronization, verify there are no copied locks, unchecked goroutine leaks in tests, or vet warnings from closure capture.

# Style guidelines

Keep the patch focused on the start-race behavior and its tests. Do not change exported function names, request/response types, storage interfaces, CLI behavior, or WASM-related packages unless the existing interfaces make a small internal adjustment necessary.

Prefer simple synchronization with clear ownership over clever lock-free code. Any new locking should avoid holding more than one per-run lock at a time and should not introduce deadlocks with storage calls used elsewhere in the engine. Comments are useful if they explain a concurrency invariant that future maintainers must preserve.

Do not introduce generated files, compiled artifacts, database files, coverage output, or example WASM binaries. Maintain compatibility with the Go version and dependency set already declared in `go.mod`; do not add external dependencies for this fix.
