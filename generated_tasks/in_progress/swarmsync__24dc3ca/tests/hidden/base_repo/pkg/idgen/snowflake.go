package idgen

import (
	"encoding/binary"
	"sync"
	"time"
)

const (
	epochMs      = 1700000000000
	nodeBits     = 10
	sequenceBits = 12
	maxNode      = (1 << nodeBits) - 1
	maxSequence  = (1 << sequenceBits) - 1
	timeShift    = nodeBits + sequenceBits
	nodeShift    = sequenceBits
)

// Snowflake generates 64-bit unique, time-ordered IDs inspired by Twitter's Snowflake.
type Snowflake struct {
	mu       sync.Mutex
	nodeID   int64
	lastTime int64
	sequence int64
}

// NewSnowflake creates a generator for the given node (0 to 1023).
func NewSnowflake(nodeID int) *Snowflake {
	if nodeID < 0 { nodeID = 0 }
	if nodeID > maxNode { nodeID = maxNode }
	return &Snowflake{nodeID: int64(nodeID)}
}

// Generate produces the next unique ID.
func (s *Snowflake) Generate() int64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UnixMilli() - epochMs
	if now == s.lastTime {
		s.sequence = (s.sequence + 1) & maxSequence
		if s.sequence == 0 {
			for now <= s.lastTime {
				now = time.Now().UnixMilli() - epochMs
			}
		}
	} else {
		s.sequence = 0
	}
	s.lastTime = now
	return (now << timeShift) | (s.nodeID << nodeShift) | s.sequence
}

// Decompose extracts timestamp, nodeID, and sequence from an ID.
func Decompose(id int64) (timestamp int64, nodeID int, sequence int) {
	timestamp = (id >> timeShift) + epochMs
	nodeID = int((id >> nodeShift) & maxNode)
	sequence = int(id & maxSequence)
	return
}

// IDToBytes converts an ID to big-endian bytes.
func IDToBytes(id int64) []byte {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, uint64(id))
	return buf
}

// BytesToID converts big-endian bytes to an ID.
func BytesToID(b []byte) int64 {
	if len(b) < 8 { return 0 }
	return int64(binary.BigEndian.Uint64(b))
}

// ULID generates universally unique lexicographically sortable identifiers.
type ULID struct {
	mu      sync.Mutex
	lastMs  int64
	entropy uint64
}

// NewULID creates a ULID generator.
func NewULID() *ULID {
	return &ULID{}
}

// Generate produces a 128-bit ULID as two int64s: (timestamp part, random part).
func (u *ULID) Generate() (int64, int64) {
	u.mu.Lock()
	defer u.mu.Unlock()
	now := time.Now().UnixMilli()
	if now == u.lastMs {
		u.entropy++
	} else {
		u.entropy = uint64(now) * 6364136223846793005
		u.lastMs = now
	}
	return now, int64(u.entropy)
}

// ULIDString returns a 26-character Crockford Base32 string.
func (u *ULID) ULIDString() string {
	ts, rnd := u.Generate()
	const enc = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
	var buf [26]byte
	for i := 9; i >= 0; i-- {
		buf[i] = enc[ts&0x1F]
		ts >>= 5
	}
	urnd := uint64(rnd)
	for i := 25; i >= 10; i-- {
		buf[i] = enc[urnd&0x1F]
		urnd >>= 5
	}
	return string(buf[:])
}

// NodeID returns the node ID of this generator.
func (s *Snowflake) NodeID() int {
	return int(s.nodeID)
}
