package wasm

import "time"

// Limits caps a single invocation's resource use. Zero values mean
// "no limit" but the engine constructs Limits with sane defaults.
type Limits struct {
	// MaxMemoryPages bounds the linear memory; each page is 64KiB.
	MaxMemoryPages uint32
	// MaxFuelTicks bounds CPU work, measured in wazero "fuel" units. The
	// engine charges 1 unit per emitted instruction; expect ~10 million
	// units per second of CPU on a typical machine.
	MaxFuelTicks uint64
	// MaxWallTime caps real elapsed time. Necessary because some host
	// calls block (network would not be allowed, but the engine itself
	// may call back into the runtime). The default is generous.
	MaxWallTime time.Duration
}

// DefaultWorkflow returns limits suitable for a deterministic workflow tick.
// Tighter on CPU (replay should be cheap), tight on memory.
func DefaultWorkflow() Limits {
	return Limits{
		MaxMemoryPages: 64,  // 4 MiB
		MaxFuelTicks:   10_000_000,
		MaxWallTime:    2 * time.Second,
	}
}

// DefaultActivity returns limits suitable for a single activity attempt.
// More generous than workflow because activities do real work.
func DefaultActivity() Limits {
	return Limits{
		MaxMemoryPages: 256, // 16 MiB
		MaxFuelTicks:   1_000_000_000,
		MaxWallTime:    30 * time.Second,
	}
}
