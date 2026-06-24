package clock

import (
	"encoding/binary"
	"sync"
	"time"
)

// HLCTimestamp combines a physical wall-clock time with a logical counter
// to produce causally-ordered timestamps even when clocks skew.
type HLCTimestamp struct {
	WallTime int64  // nanoseconds since epoch
	Logical  uint32 // logical counter for same wall-time events
	NodeID   string // originating node
}

// NewHLCTimestamp creates a timestamp from components.
func NewHLCTimestamp(wall int64, logical uint32, nodeID string) *HLCTimestamp {
	return &HLCTimestamp{WallTime: wall, Logical: logical, NodeID: nodeID}
}

// Compare returns causal ordering between two HLC timestamps.
// Wall time dominates; logical counter breaks ties; node ID breaks further ties.
func (h *HLCTimestamp) Compare(other Timestamp) Ordering {
	o, ok := other.(*HLCTimestamp)
	if !ok {
		return Concurrent
	}
	if h.WallTime < o.WallTime {
		return Before
	}
	if h.WallTime > o.WallTime {
		return After
	}
	if h.Logical < o.Logical {
		return Before
	}
	if h.Logical > o.Logical {
		return After
	}
	if h.NodeID == o.NodeID {
		return Equal
	}
	if h.NodeID < o.NodeID {
		return Before
	}
	return After
}

// Bytes serializes the HLC timestamp to bytes.
// Format: [wallTime:8][logical:4][nodeIDLen:2][nodeID:N]
func (h *HLCTimestamp) Bytes() []byte {
	nLen := len(h.NodeID)
	buf := make([]byte, 8+4+2+nLen)
	binary.BigEndian.PutUint64(buf[0:8], uint64(h.WallTime))
	binary.BigEndian.PutUint32(buf[8:12], h.Logical)
	binary.BigEndian.PutUint16(buf[12:14], uint16(nLen))
	copy(buf[14:], h.NodeID)
	return buf
}

// ParseHLCTimestamp deserializes bytes back into an HLCTimestamp.
func ParseHLCTimestamp(data []byte) (*HLCTimestamp, error) {
	if len(data) < 14 {
		return nil, errShortData
	}
	wall := int64(binary.BigEndian.Uint64(data[0:8]))
	logical := binary.BigEndian.Uint32(data[8:12])
	nLen := int(binary.BigEndian.Uint16(data[12:14]))
	if len(data) < 14+nLen {
		return nil, errShortData
	}
	nodeID := string(data[14 : 14+nLen])
	return &HLCTimestamp{WallTime: wall, Logical: logical, NodeID: nodeID}, nil
}

// Clone creates a deep copy.
func (h *HLCTimestamp) Clone() *HLCTimestamp {
	return &HLCTimestamp{WallTime: h.WallTime, Logical: h.Logical, NodeID: h.NodeID}
}

// PhysicalClock is a function that returns the current time in nanoseconds.
type PhysicalClock func() int64

// DefaultPhysicalClock returns time.Now().UnixNano().
func DefaultPhysicalClock() int64 {
	return time.Now().UnixNano()
}

// HybridLogicalClock implements the HLC algorithm for a single node.
// It ensures timestamps always move forward even when the physical clock
// drifts backward, and maintains causal ordering across nodes.
type HybridLogicalClock struct {
	mu       sync.Mutex
	nodeID   string
	last     *HLCTimestamp
	physical PhysicalClock
	maxDrift int64 // maximum tolerated wall-clock drift in nanoseconds
}

// NewHybridLogicalClock creates a new HLC for the given node.
func NewHybridLogicalClock(nodeID string) *HybridLogicalClock {
	return &HybridLogicalClock{
		nodeID:   nodeID,
		last:     &HLCTimestamp{WallTime: 0, Logical: 0, NodeID: nodeID},
		physical: DefaultPhysicalClock,
		maxDrift: int64(time.Minute),
	}
}

// WithPhysicalClock sets a custom physical clock (useful for testing).
func (hlc *HybridLogicalClock) WithPhysicalClock(pc PhysicalClock) *HybridLogicalClock {
	hlc.physical = pc
	return hlc
}

// WithMaxDrift sets the maximum tolerated wall-clock drift.
func (hlc *HybridLogicalClock) WithMaxDrift(d time.Duration) *HybridLogicalClock {
	hlc.maxDrift = int64(d)
	return hlc
}

// Tick generates a new timestamp for a local event.
// Algorithm:
//  1. pt = max(last.WallTime, physical_clock())
//  2. if pt == last.WallTime → increment logical counter
//  3. else → reset logical counter to 0
func (hlc *HybridLogicalClock) Tick(nodeID string) Timestamp {
	hlc.mu.Lock()
	defer hlc.mu.Unlock()

	pt := hlc.physical()
	if pt > hlc.last.WallTime {
		hlc.last.WallTime = pt
		hlc.last.Logical = 0
	} else {
		hlc.last.Logical++
	}
	return hlc.last.Clone()
}

// Witness incorporates a remote timestamp observed via a received message.
// Algorithm:
//  1. pt = max(last.WallTime, remote.WallTime, physical_clock())
//  2. if pt == last.WallTime == remote.WallTime → logical = max(last.Logical, remote.Logical) + 1
//  3. if pt == last.WallTime → logical = last.Logical + 1
//  4. if pt == remote.WallTime → logical = remote.Logical + 1
//  5. else → logical = 0
func (hlc *HybridLogicalClock) Witness(nodeID string, other Timestamp) Timestamp {
	hlc.mu.Lock()
	defer hlc.mu.Unlock()

	remote, ok := other.(*HLCTimestamp)
	if !ok {
		return hlc.last.Clone()
	}

	pt := hlc.physical()

	// Check for excessive drift
	if remote.WallTime-pt > hlc.maxDrift {
		// Clamp to physical time + max drift to avoid time jumps
		pt = remote.WallTime - hlc.maxDrift
	}

	maxWall := pt
	if hlc.last.WallTime > maxWall {
		maxWall = hlc.last.WallTime
	}
	if remote.WallTime > maxWall {
		maxWall = remote.WallTime
	}

	var logical uint32
	switch {
	case maxWall == hlc.last.WallTime && maxWall == remote.WallTime:
		logical = maxUint32(hlc.last.Logical, remote.Logical) + 1
	case maxWall == hlc.last.WallTime:
		logical = hlc.last.Logical + 1
	case maxWall == remote.WallTime:
		logical = remote.Logical + 1
	default:
		logical = 0
	}

	hlc.last.WallTime = maxWall
	hlc.last.Logical = logical
	return hlc.last.Clone()
}

// Now returns the current timestamp without advancing the clock.
func (hlc *HybridLogicalClock) Now() Timestamp {
	hlc.mu.Lock()
	defer hlc.mu.Unlock()
	return hlc.last.Clone()
}

// NodeID returns the identity of this clock's owner.
func (hlc *HybridLogicalClock) NodeID() string {
	return hlc.nodeID
}

func maxUint32(a, b uint32) uint32 {
	if a > b {
		return a
	}
	return b
}
