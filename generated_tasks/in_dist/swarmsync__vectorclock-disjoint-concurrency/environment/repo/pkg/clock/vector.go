package clock

import (
	"encoding/binary"
	"sort"
	"sync"
)

// VectorTimestamp holds per-node counters for causal ordering.
type VectorTimestamp struct {
	Entries map[string]uint64
}

// NewVectorTimestamp creates an empty vector timestamp.
func NewVectorTimestamp() *VectorTimestamp {
	return &VectorTimestamp{Entries: make(map[string]uint64)}
}

// Clone returns a deep copy of the vector timestamp.
func (vt *VectorTimestamp) Clone() *VectorTimestamp {
	c := NewVectorTimestamp()
	for k, v := range vt.Entries {
		c.Entries[k] = v
	}
	return c
}

// Get returns the counter for a given node (0 if unseen).
func (vt *VectorTimestamp) Get(nodeID string) uint64 {
	return vt.Entries[nodeID]
}

// Set updates the counter for a given node.
func (vt *VectorTimestamp) Set(nodeID string, val uint64) {
	vt.Entries[nodeID] = val
}

// Increment advances the counter for a given node by 1 and returns the new value.
func (vt *VectorTimestamp) Increment(nodeID string) uint64 {
	vt.Entries[nodeID]++
	return vt.Entries[nodeID]
}

// Merge takes the element-wise max of this timestamp and another.
func (vt *VectorTimestamp) Merge(other *VectorTimestamp) {
	for k, v := range other.Entries {
		if v > vt.Entries[k] {
			vt.Entries[k] = v
		}
	}
}

// Compare returns the causal ordering between two vector timestamps.
// Before: all entries in vt <= other, at least one strictly less.
// After: all entries in other <= vt, at least one strictly less.
// Equal: all entries identical.
// Concurrent: neither dominates the other.
func (vt *VectorTimestamp) Compare(other Timestamp) Ordering {
	o, ok := other.(*VectorTimestamp)
	if !ok {
		return Concurrent
	}

	hasLess := false
	hasGreater := false

	for k, a := range vt.Entries {
		b := o.Entries[k]
		if a < b {
			hasLess = true
		} else if a > b {
			hasGreater = true
		}
		if hasLess && hasGreater {
			return Concurrent
		}
	}

	for k, b := range o.Entries {
		if _, exists := vt.Entries[k]; !exists && b > 0 {
			hasLess = true
		}
	}

	if !hasLess && !hasGreater {
		return Equal
	}
	if hasLess {
		return Before
	}
	return After
}

// Bytes serializes the vector timestamp to a deterministic byte representation.
// Format: [count:4][for each entry: keyLen:2, key:N, value:8] sorted by key.
func (vt *VectorTimestamp) Bytes() []byte {
	keys := make([]string, 0, len(vt.Entries))
	for k := range vt.Entries {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	size := 4
	for _, k := range keys {
		size += 2 + len(k) + 8
	}
	buf := make([]byte, size)
	binary.BigEndian.PutUint32(buf[0:4], uint32(len(keys)))
	offset := 4
	for _, k := range keys {
		binary.BigEndian.PutUint16(buf[offset:offset+2], uint16(len(k)))
		offset += 2
		copy(buf[offset:], k)
		offset += len(k)
		binary.BigEndian.PutUint64(buf[offset:offset+8], vt.Entries[k])
		offset += 8
	}
	return buf
}

// ParseVectorTimestamp deserializes bytes back into a VectorTimestamp.
func ParseVectorTimestamp(data []byte) (*VectorTimestamp, error) {
	if len(data) < 4 {
		return nil, errShortData
	}
	count := binary.BigEndian.Uint32(data[0:4])
	vt := NewVectorTimestamp()
	offset := 4
	for i := uint32(0); i < count; i++ {
		if offset+2 > len(data) {
			return nil, errShortData
		}
		keyLen := int(binary.BigEndian.Uint16(data[offset : offset+2]))
		offset += 2
		if offset+keyLen+8 > len(data) {
			return nil, errShortData
		}
		key := string(data[offset : offset+keyLen])
		offset += keyLen
		val := binary.BigEndian.Uint64(data[offset : offset+8])
		offset += 8
		vt.Entries[key] = val
	}
	return vt, nil
}

// VectorClock provides a thread-safe vector clock for a specific node.
type VectorClock struct {
	mu      sync.RWMutex
	nodeID  string
	current *VectorTimestamp
}

// NewVectorClock creates a new vector clock for the given node.
func NewVectorClock(nodeID string) *VectorClock {
	return &VectorClock{
		nodeID:  nodeID,
		current: NewVectorTimestamp(),
	}
}

// Tick advances the local counter by 1 and returns the new timestamp.
func (vc *VectorClock) Tick(nodeID string) Timestamp {
	vc.mu.Lock()
	defer vc.mu.Unlock()
	vc.current.Increment(vc.nodeID)
	return vc.current.Clone()
}

// Witness merges a remote timestamp into the local clock and advances.
// The nodeID parameter is ignored; the clock always increments its own node counter.
func (vc *VectorClock) Witness(nodeID string, other Timestamp) Timestamp {
	vc.mu.Lock()
	defer vc.mu.Unlock()
	if vt, ok := other.(*VectorTimestamp); ok {
		vc.current.Merge(vt)
	}
	vc.current.Increment(vc.nodeID)
	return vc.current.Clone()
}

// Now returns the current timestamp without advancing the clock.
func (vc *VectorClock) Now() Timestamp {
	vc.mu.RLock()
	defer vc.mu.RUnlock()
	return vc.current.Clone()
}

// NodeID returns the identity of this clock's owner.
func (vc *VectorClock) NodeID() string {
	return vc.nodeID
}

// Snapshot returns a copy of the internal timestamp for inspection.
func (vc *VectorClock) Snapshot() *VectorTimestamp {
	vc.mu.RLock()
	defer vc.mu.RUnlock()
	return vc.current.Clone()
}