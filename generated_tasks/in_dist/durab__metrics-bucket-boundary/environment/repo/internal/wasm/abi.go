package wasm

const HostModuleName = "durab"

const (
	WorkflowEntry = "_durab_tick"

	ActivityEntry = "_durab_run"

	Alloc = "_durab_alloc"
)

const (
	HostReadHistory   = "read_history"
	HostEmitDecisions = "emit_decisions"
	HostGetInput      = "get_input"
	HostGetInfo       = "get_info"
	HostNow           = "now"
	HostRandom        = "random"
	HostNewUUID       = "new_uuid"
	HostLog           = "log"

	HostReadInput    = "read_input"
	HostWriteResult  = "write_result"
	HostWriteFailure = "write_failure"
	HostHeartbeat    = "heartbeat"
)

const (
	LogDebug int32 = 0
	LogInfo  int32 = 1
	LogWarn  int32 = 2
	LogError int32 = 3
)
