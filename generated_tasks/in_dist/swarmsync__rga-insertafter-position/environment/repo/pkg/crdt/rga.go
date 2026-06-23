package crdt

import "sync"

// RGAElement represents a single element in the Replicated Growable Array.
type RGAElement struct {
	ID        RGAId
	Value     interface{}
	Deleted   bool
	Prev      *RGAId
}

// RGAId uniquely identifies an element using a (nodeID, counter) pair.
type RGAId struct {
	NodeID  string
	Counter uint64
}

// RGA implements a Replicated Growable Array for ordered sequences.
// It supports concurrent insert and delete with convergent ordering.
type RGA struct {
	mu       sync.RWMutex
	nodeID   string
	counter  uint64
	elements []RGAElement
	index    map[RGAId]int
}

// NewRGA creates an empty RGA for the given node.
func NewRGA(nodeID string) *RGA {
	return &RGA{
		nodeID: nodeID,
		index:  make(map[RGAId]int),
	}
}

// Append adds an element at the end of the sequence.
func (r *RGA) Append(value interface{}) RGAId {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.counter++
	id := RGAId{NodeID: r.nodeID, Counter: r.counter}
	var prev *RGAId
	if len(r.elements) > 0 {
		lastID := r.elements[len(r.elements)-1].ID
		prev = &lastID
	}
	elem := RGAElement{ID: id, Value: value, Prev: prev}
	r.index[id] = len(r.elements)
	r.elements = append(r.elements, elem)
	return id
}

// InsertAfter inserts a value after the element with the given ID.
// If afterID is the zero value, inserts at the beginning.
func (r *RGA) InsertAfter(afterID RGAId, value interface{}) RGAId {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.counter++
	id := RGAId{NodeID: r.nodeID, Counter: r.counter}

	insertIdx := 0
	if afterID != (RGAId{}) {
		if idx, ok := r.index[afterID]; ok {
			insertIdx = idx
		}
	}

	elem := RGAElement{ID: id, Value: value, Prev: &afterID}
	r.elements = append(r.elements, RGAElement{})
	copy(r.elements[insertIdx+1:], r.elements[insertIdx:])
	r.elements[insertIdx] = elem
	r.rebuildIndex()
	return id
}

// Delete marks an element as deleted (tombstone).
func (r *RGA) Delete(id RGAId) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	idx, ok := r.index[id]
	if !ok { return false }
	r.elements[idx].Deleted = true
	return true
}

// Values returns all non-deleted values in order.
func (r *RGA) Values() []interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []interface{}
	for _, e := range r.elements {
		if !e.Deleted { result = append(result, e.Value) }
	}
	return result
}

// Len returns the count of non-deleted elements.
func (r *RGA) Len() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	count := 0
	for _, e := range r.elements {
		if !e.Deleted { count++ }
	}
	return count
}

// TotalLen returns the total count including tombstones.
func (r *RGA) TotalLen() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.elements)
}

// Merge incorporates elements from another RGA.
// Elements are merged based on their IDs; duplicates are skipped.
func (r *RGA) Merge(other *RGA) {
	r.mu.Lock()
	defer r.mu.Unlock()
	other.mu.RLock()
	defer other.mu.RUnlock()

	for _, e := range other.elements {
		if _, exists := r.index[e.ID]; exists {
			idx := r.index[e.ID]
			if e.Deleted { r.elements[idx].Deleted = true }
			continue
		}
		r.index[e.ID] = len(r.elements)
		r.elements = append(r.elements, e)
	}
}

// NodeID returns the owner of this RGA.
func (r *RGA) NodeID() string { return r.nodeID }

func (r *RGA) rebuildIndex() {
	r.index = make(map[RGAId]int, len(r.elements))
	for i, e := range r.elements { r.index[e.ID] = i }
}
