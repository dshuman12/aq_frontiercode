package crdt

import "sync"

// EWFlag is an Enable-Wins Flag CRDT.
// Concurrent enable and disable operations resolve in favor of enable.
// Uses a dots-based approach: each enable adds a unique dot,
// disable observes and removes all current dots.
type EWFlag struct {
	mu       sync.RWMutex
	dots     map[string]uint64
	counters map[string]uint64
}

// NewEWFlag creates a new enable-wins flag (initially disabled).
func NewEWFlag() *EWFlag {
	return &EWFlag{
		dots:     make(map[string]uint64),
		counters: make(map[string]uint64),
	}
}

// Enable enables the flag from the given node.
func (f *EWFlag) Enable(nodeID string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.counters[nodeID]++
	f.dots[nodeID] = f.counters[nodeID]
}

// Disable disables the flag by removing all observed dots.
func (f *EWFlag) Disable() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.dots = make(map[string]uint64)
}

// Value returns true if the flag is enabled (has any active dots).
func (f *EWFlag) Value() bool {
	f.mu.RLock()
	defer f.mu.RUnlock()
	return len(f.dots) > 0
}

// Merge incorporates another EWFlag's state.
// For each node, the higher counter wins (enable-wins semantics).
func (f *EWFlag) Merge(other *EWFlag) {
	f.mu.Lock()
	defer f.mu.Unlock()
	other.mu.RLock()
	defer other.mu.RUnlock()

	for nodeID := range f.dots {
		if _, ok := other.dots[nodeID]; !ok {
			delete(f.dots, nodeID)
		}
	}
	for nodeID, otherDot := range other.dots {
		if localDot, ok := f.dots[nodeID]; !ok || otherDot > localDot {
			f.dots[nodeID] = otherDot
		}
	}
	for nodeID, otherCounter := range other.counters {
		if otherCounter > f.counters[nodeID] {
			f.counters[nodeID] = otherCounter
		}
	}
}

// DotCount returns the number of active dots (for testing/debugging).
func (f *EWFlag) DotCount() int {
	f.mu.RLock()
	defer f.mu.RUnlock()
	return len(f.dots)
}
