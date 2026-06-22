# Task description

Add a message type multiplexer to the `transport` package by implementing `Mux` in `pkg/transport/mux.go`. The multiplexer routes incoming envelopes to handlers registered by their `MsgType`, enabling consumers to dispatch different message kinds to dedicated logic.

`Mux` should support:

- Registering a handler for a given `MsgType`, replacing any prior handler for that type.
- Dispatching an envelope to the handler matching its `MsgType`.
- A fallback handler invoked when no handler is registered for an envelope's type; if no fallback exists, dispatch should report this in a clear, observable way rather than panicking.
- Per-type dispatch statistics, queryable so callers can see how many envelopes each `MsgType` received.
- `HasHandler` to report whether a type currently has a registered handler.
- `Remove` to unregister a handler for a type.

Reuse the existing envelope/message and `MsgType` definitions in `pkg/transport/message.go`; do not modify the codec, channel, or existing message wire format. The implementation must be safe for concurrent registration, removal, and dispatch. Keep the package dependency-free (stdlib only).

# Test guidelines

Run `go test ./...` to validate the full module. Add or extend tests in `pkg/transport` covering: routing to the correct handler by `MsgType`, fallback behavior when a type is unregistered and when no fallback is set, handler replacement, `Remove` then dispatch, `HasHandler` results before and after registration, accurate per-type stats counts, and concurrent dispatch safety.

# Lint guidelines

Run `go vet ./...` and `gofmt -l pkg/transport` before submitting; the listing must be empty and vet must report no issues. Ensure `go build ./...` succeeds.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Follow idiomatic Go naming and error handling consistent with the surrounding `transport` package, and document exported identifiers with standard doc comments.
