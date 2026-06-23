// Package wasm wraps wazero so the rest of the engine doesn't see it
// directly. It defines the *host ABI* (which functions modules can import,
// which functions modules must export, calling conventions for passing
// bytes across the boundary) and enforces the resource limits the engine
// promises: deterministic time/RNG inside workflows, CPU+memory bounds for
// both workflows and activities.
package wasm

// HostModuleName is the wasm "module" of all functions the engine exposes
// to user code. Workflow and activity modules import functions like
// "durab.read_history", "durab.write_result", etc.
const HostModuleName = "durab"

// Exported names a user module must provide. The names are stable; renaming
// breaks every workflow/activity already deployed.
const (
	// WorkflowEntry is called once per decision tick. It takes no arguments
	// (state is read via host calls) and returns no value (decisions are
	// emitted via host calls).
	WorkflowEntry = "_durab_tick"

	// ActivityEntry is called once per activity invocation. Same shape as
	// WorkflowEntry; activities read input + write result via host calls.
	ActivityEntry = "_durab_run"

	// Alloc is an optional export. If present, the engine uses it to ask
	// the module to allocate a buffer of N bytes inside its own memory
	// and return the offset. The module must keep the buffer alive until
	// the next host call.
	Alloc = "_durab_alloc"
)

// Host function names. The contract for each is documented near its
// implementation in host_*.go.
const (
	// Workflow host functions.
	HostReadHistory    = "read_history"
	HostEmitDecisions  = "emit_decisions"
	HostGetInput       = "get_input"
	HostGetInfo        = "get_info"
	HostNow            = "now"
	HostRandom         = "random"
	HostNewUUID        = "new_uuid"
	HostLog            = "log"

	// Activity host functions.
	HostReadInput      = "read_input"
	HostWriteResult    = "write_result"
	HostWriteFailure   = "write_failure"
	HostHeartbeat      = "heartbeat"
)

// LogLevel constants passed to HostLog (the wasm side encodes these as i32).
const (
	LogDebug int32 = 0
	LogInfo  int32 = 1
	LogWarn  int32 = 2
	LogError int32 = 3
)
