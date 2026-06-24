package wasm

import "time"

type Limits struct {
	MaxMemoryPages uint32

	MaxFuelTicks uint64

	MaxWallTime time.Duration
}

func DefaultWorkflow() Limits {
	return Limits{
		MaxMemoryPages: 64,
		MaxFuelTicks:   10_000_000,
		MaxWallTime:    2 * time.Second,
	}
}

func DefaultActivity() Limits {
	return Limits{
		MaxMemoryPages: 256,
		MaxFuelTicks:   1_000_000_000,
		MaxWallTime:    30 * time.Second,
	}
}
