package crdt

import "sync"

// ORMap is an Observed-Remove Map where keys map to LWW registers.
// Keys can be added and removed; add-wins semantics apply.
// Each key's value is resolved by last-writer-wins.
type ORMap struct {
	mu       sync.RWMutex
	keys     *ORSet
	values   map[string]*LWWRegister
}

// NewORMap creates an empty OR-Map.
func NewORMap() *ORMap {
	return &ORMap{
		keys:   NewORSet(),
		values: make(map[string]*LWWRegister),
	}
}

// Put sets a key-value pair with the given timestamp and node.
func (m *ORMap) Put(key string, value interface{}, timestamp int64, nodeID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.keys.mu.Lock()
	m.keys.counters[nodeID]++
	tag := ORTag{NodeID: nodeID, Counter: m.keys.counters[nodeID]}
	if m.keys.entries[key] == nil {
		m.keys.entries[key] = make(map[ORTag]struct{})
	}
	m.keys.entries[key][tag] = struct{}{}
	m.keys.mu.Unlock()

	if m.values[key] == nil {
		m.values[key] = NewLWWRegister(nodeID)
	}
	m.values[key].Set(value, timestamp, nodeID)
}

// Get returns the value for a key, or (nil, false) if absent.
func (m *ORMap) Get(key string) (interface{}, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	m.keys.mu.RLock()
	tags, ok := m.keys.entries[key]
	hasKey := ok && len(tags) > 0
	m.keys.mu.RUnlock()
	if !hasKey {
		return nil, false
	}
	reg := m.values[key]
	if reg == nil {
		return nil, false
	}
	v, _ := reg.Get()
	return v, true
}

// Delete removes a key.
func (m *ORMap) Delete(key string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.keys.mu.Lock()
	delete(m.keys.entries, key)
	m.keys.mu.Unlock()
}

// Keys returns all active keys.
func (m *ORMap) Keys() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	m.keys.mu.RLock()
	defer m.keys.mu.RUnlock()
	result := make([]string, 0)
	for k, tags := range m.keys.entries {
		if len(tags) > 0 {
			result = append(result, k)
		}
	}
	return result
}

// Len returns the number of active keys.
func (m *ORMap) Len() int {
	return len(m.Keys())
}

// Merge incorporates another OR-Map. Keys use OR-Set merge (add-wins),
// values use LWW-Register merge.
func (m *ORMap) Merge(other *ORMap) {
	m.mu.Lock()
	defer m.mu.Unlock()
	other.mu.RLock()
	defer other.mu.RUnlock()

	// Merge key sets
	m.keys.Merge(other.keys)

	// Merge values
	for key, otherReg := range other.values {
		if m.values[key] == nil {
			m.values[key] = NewLWWRegister("")
		}
		m.values[key].Merge(otherReg)
	}
}