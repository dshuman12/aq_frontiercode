package clock

// Ordering represents the causal relationship between two clock values.
type Ordering int

const (
	Before     Ordering = -1
	Concurrent Ordering = 0
	After      Ordering = 1
	Equal      Ordering = 2
)

// Clock is the common interface for all logical clock implementations.
type Clock interface {
	// Tick advances the clock for a local event and returns the updated timestamp.
	Tick(nodeID string) Timestamp
	// Witness merges an observed remote timestamp into the local clock.
	Witness(nodeID string, other Timestamp) Timestamp
	// Now returns the current timestamp without advancing the clock.
	Now() Timestamp
}

// Timestamp is the common interface for all timestamp types.
type Timestamp interface {
	// Compare returns the causal ordering relative to another timestamp.
	Compare(other Timestamp) Ordering
	// Bytes serializes the timestamp to a byte slice.
	Bytes() []byte
}

// NodeID is a type alias for clarity.
type NodeID = string
