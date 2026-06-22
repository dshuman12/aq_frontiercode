package crdt

import "sync"

// LWWRegister is a Last-Writer-Wins register. Each write carries a timestamp;
// the value with the highest timestamp wins. Ties broken by node ID.
type LWWRegister struct {
	mu        sync.RWMutex
	value     interface{}
	timestamp int64
	nodeID    string
}

// NewLWWRegister creates a register with an initial zero value.
func NewLWWRegister(nodeID string) *LWWRegister {
	return &LWWRegister{nodeID: nodeID}
}

// Set updates the register value with the given timestamp.
// Returns true if the value was actually updated.
func (r *LWWRegister) Set(value interface{}, timestamp int64, nodeID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if timestamp > r.timestamp || (timestamp == r.timestamp && nodeID > r.nodeID) {
		r.value = value
		r.timestamp = timestamp
		r.nodeID = nodeID
		return true
	}
	return false
}

// Get returns the current value and its timestamp.
func (r *LWWRegister) Get() (interface{}, int64) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.value, r.timestamp
}

// Merge incorporates another LWW register's state.
func (r *LWWRegister) Merge(other *LWWRegister) {
	other.mu.RLock()
	v := other.value
	ts := other.timestamp
	nid := other.nodeID
	other.mu.RUnlock()
	r.Set(v, ts, nid)
}

// Snapshot returns value, timestamp, nodeID.
func (r *LWWRegister) Snapshot() (interface{}, int64, string) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.value, r.timestamp, r.nodeID
}

// MVRegister is a Multi-Value register that preserves all concurrent writes.
// When concurrent updates occur, all values are kept until a dominating write
// supersedes them.
type MVRegister struct {
	mu      sync.RWMutex
	entries []MVEntry
}

// MVEntry holds one version of the register value.
type MVEntry struct {
	Value     interface{}
	Timestamp int64
	NodeID    string
	Counter   uint64 // per-node logical counter
}

// NewMVRegister creates an empty multi-value register.
func NewMVRegister() *MVRegister {
	return &MVRegister{}
}

// Set adds a new version to the register. Versions that are causally dominated
// by the new entry are removed. Concurrent versions are kept.
func (mv *MVRegister) Set(value interface{}, timestamp int64, nodeID string, counter uint64) {
	mv.mu.Lock()
	defer mv.mu.Unlock()

	// In-place filter: swap-and-truncate to avoid allocation
	n := 0
	for i := range mv.entries {
		e := mv.entries[i]
		if e.NodeID == nodeID && e.Counter <= counter {
			continue
		}
		if e.Timestamp < timestamp && e.NodeID == nodeID {
			continue
		}
		mv.entries[n] = e
		n++
	}
	mv.entries = mv.entries[:n]
	mv.entries = append(mv.entries, MVEntry{
		Value:     value,
		Timestamp: timestamp,
		NodeID:    nodeID,
		Counter:   counter,
	})
}

// Get returns all current concurrent values.
func (mv *MVRegister) Get() []MVEntry {
	mv.mu.RLock()
	defer mv.mu.RUnlock()
	result := make([]MVEntry, len(mv.entries))
	copy(result, mv.entries)
	return result
}

// Merge incorporates entries from another MV register.
// For each node, we keep only the entry with the highest counter.
func (mv *MVRegister) Merge(other *MVRegister) {
	mv.mu.Lock()
	defer mv.mu.Unlock()
	other.mu.RLock()
	defer other.mu.RUnlock()

	// Build a map of nodeID -> highest-counter entry across both
	best := make(map[string]MVEntry)
	for _, e := range mv.entries {
		if existing, ok := best[e.NodeID]; !ok || e.Counter > existing.Counter {
			best[e.NodeID] = e
		}
	}
	for _, e := range other.entries {
		if existing, ok := best[e.NodeID]; !ok || e.Counter > existing.Counter {
			best[e.NodeID] = e
		}
	}

	mv.entries = make([]MVEntry, 0, len(best))
	for _, e := range best {
		mv.entries = append(mv.entries, e)
	}
}

// Len returns the number of concurrent values.
func (mv *MVRegister) Len() int {
	mv.mu.RLock()
	defer mv.mu.RUnlock()
	return len(mv.entries)
}