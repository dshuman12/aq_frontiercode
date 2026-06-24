package clock

import "sync"

// LamportClock implements a simple Lamport logical clock.
// Each event increments the counter; receiving a message
// takes the max of local and remote then increments.
type LamportClock struct {
	mu      sync.Mutex
	nodeID  string
	counter uint64
}

// NewLamportClock creates a Lamport clock for the given node.
func NewLamportClock(nodeID string) *LamportClock {
	return &LamportClock{nodeID: nodeID}
}

// Tick increments the clock for a local event.
func (lc *LamportClock) Tick(nodeID string) Timestamp {
	lc.mu.Lock()
	defer lc.mu.Unlock()
	lc.counter++
	return &LamportTimestamp{Counter: lc.counter, NodeID: lc.nodeID}
}

// Witness merges a remote timestamp and increments.
func (lc *LamportClock) Witness(nodeID string, other Timestamp) Timestamp {
	lc.mu.Lock()
	defer lc.mu.Unlock()
	if lt, ok := other.(*LamportTimestamp); ok {
		if lt.Counter > lc.counter {
			lc.counter = lt.Counter
		}
	}
	lc.counter++
	return &LamportTimestamp{Counter: lc.counter, NodeID: lc.nodeID}
}

// Now returns the current timestamp without advancing.
func (lc *LamportClock) Now() Timestamp {
	lc.mu.Lock()
	defer lc.mu.Unlock()
	return &LamportTimestamp{Counter: lc.counter, NodeID: lc.nodeID}
}

// NodeID returns the clock owner.
func (lc *LamportClock) NodeID() string { return lc.nodeID }

// Value returns the raw counter value.
func (lc *LamportClock) Value() uint64 {
	lc.mu.Lock()
	defer lc.mu.Unlock()
	return lc.counter
}

// LamportTimestamp is a simple (counter, nodeID) pair.
type LamportTimestamp struct {
	Counter uint64
	NodeID  string
}

// Compare returns ordering: lower counter = Before, higher = After.
// Ties broken by node ID.
func (lt *LamportTimestamp) Compare(other Timestamp) Ordering {
	o, ok := other.(*LamportTimestamp)
	if !ok { return Concurrent }
	if lt.Counter < o.Counter { return Before }
	if lt.Counter > o.Counter { return After }
	if lt.NodeID == o.NodeID { return Equal }
	if lt.NodeID < o.NodeID { return Before }
	return After
}

// Bytes serializes the timestamp.
func (lt *LamportTimestamp) Bytes() []byte {
	buf := make([]byte, 8+len(lt.NodeID))
	buf[0] = byte(lt.Counter >> 56)
	buf[1] = byte(lt.Counter >> 48)
	buf[2] = byte(lt.Counter >> 40)
	buf[3] = byte(lt.Counter >> 32)
	buf[4] = byte(lt.Counter >> 24)
	buf[5] = byte(lt.Counter >> 16)
	buf[6] = byte(lt.Counter >> 8)
	buf[7] = byte(lt.Counter)
	copy(buf[8:], lt.NodeID)
	return buf
}
