package crdt

import "sync"

// GSet is a grow-only set. Elements can only be added, never removed.
// Merge is set union.
type GSet struct {
	mu       sync.RWMutex
	elements map[string]struct{}
}

// NewGSet creates an empty G-Set.
func NewGSet() *GSet {
	return &GSet{elements: make(map[string]struct{})}
}

// Add inserts an element.
func (s *GSet) Add(elem string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.elements[elem] = struct{}{}
}

// Contains checks membership.
func (s *GSet) Contains(elem string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, ok := s.elements[elem]
	return ok
}

// Elements returns a copy of all elements.
func (s *GSet) Elements() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]string, 0, len(s.elements))
	for k := range s.elements {
		result = append(result, k)
	}
	return result
}

// Len returns the set cardinality.
func (s *GSet) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.elements)
}

// Merge performs set union with another G-Set.
func (s *GSet) Merge(other *GSet) {
	s.mu.Lock()
	defer s.mu.Unlock()
	other.mu.RLock()
	defer other.mu.RUnlock()
	for k := range other.elements {
		s.elements[k] = struct{}{}
	}
}

// ORSet is an Observed-Remove Set. Elements can be added and removed;
// add wins over concurrent remove. Each add is tagged with a unique
// (nodeID, counter) pair so that removes only affect observed adds.
type ORSet struct {
	mu       sync.RWMutex
	entries  map[string]map[ORTag]struct{} // element -> set of tags
	counters map[string]uint64             // nodeID -> next counter
}

// ORTag uniquely identifies an add operation.
type ORTag struct {
	NodeID  string
	Counter uint64
}

// NewORSet creates an empty OR-Set.
func NewORSet() *ORSet {
	return &ORSet{
		entries:  make(map[string]map[ORTag]struct{}),
		counters: make(map[string]uint64),
	}
}

// Add inserts an element, tagging it with a unique (nodeID, counter).
func (s *ORSet) Add(elem string, nodeID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.counters[nodeID]++
	tag := ORTag{NodeID: nodeID, Counter: s.counters[nodeID]}
	if s.entries[elem] == nil {
		s.entries[elem] = make(map[ORTag]struct{})
	}
	s.entries[elem][tag] = struct{}{}
}

// Remove removes an element by clearing all its observed tags.
// Concurrent adds (unseen tags) will survive.
func (s *ORSet) Remove(elem string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.entries, elem)
}

// Contains checks if an element has any active tags.
func (s *ORSet) Contains(elem string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	tags, ok := s.entries[elem]
	return ok && len(tags) > 0
}

// Elements returns all elements that have at least one active tag.
func (s *ORSet) Elements() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]string, 0, len(s.entries))
	for k, tags := range s.entries {
		if len(tags) > 0 {
			result = append(result, k)
		}
	}
	return result
}

// Len returns the count of active elements.
func (s *ORSet) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	count := 0
	for _, tags := range s.entries {
		if len(tags) > 0 {
			count++
		}
	}
	return count
}

// Merge combines two OR-Sets. For each element, the resulting tag set
// is the union of both replicas' tag sets.
func (s *ORSet) Merge(other *ORSet) {
	s.mu.Lock()
	defer s.mu.Unlock()
	other.mu.RLock()
	defer other.mu.RUnlock()

	for elem, tags := range other.entries {
		if s.entries[elem] == nil {
			s.entries[elem] = make(map[ORTag]struct{})
		}
		for tag := range tags {
			s.entries[elem][tag] = struct{}{}
		}
	}
	for nodeID, c := range other.counters {
		if c > s.counters[nodeID] {
			s.counters[nodeID] = c
		}
	}
}

// Tags returns the tag set for an element (for testing/debugging).
func (s *ORSet) Tags(elem string) []ORTag {
	s.mu.RLock()
	defer s.mu.RUnlock()
	tags, ok := s.entries[elem]
	if !ok {
		return nil
	}
	result := make([]ORTag, 0, len(tags))
	for t := range tags {
		result = append(result, t)
	}
	return result
}
