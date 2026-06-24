// Package labelstore interns label sets to dense uint32 ids.
//
// Records flowing through kindling carry a small map of string labels
// (host, environment, app, ...). Storing the maps verbatim wastes memory
// when the same combinations repeat. labelstore canonicalises and
// dedupes them so that downstream code can reference an id and look up
// the materialised map only when necessary.
package labelstore

import (
	"errors"
	"sort"
	"strings"
	"sync"
)

// LabelSet is an immutable view of a label map.
type LabelSet struct {
	keys   []string
	values []string
}

// Get returns the value of key.
func (l *LabelSet) Get(key string) (string, bool) {
	for i, k := range l.keys {
		if k == key {
			return l.values[i], true
		}
	}
	return "", false
}

// Each invokes fn for each label in key order.
func (l *LabelSet) Each(fn func(k, v string)) {
	for i, k := range l.keys {
		fn(k, l.values[i])
	}
}

// Len reports the number of labels.
func (l *LabelSet) Len() int { return len(l.keys) }

// Canonical returns a stable string representation, e.g. "k1=v1,k2=v2".
func (l *LabelSet) Canonical() string {
	var b strings.Builder
	for i, k := range l.keys {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString(k)
		b.WriteByte('=')
		b.WriteString(l.values[i])
	}
	return b.String()
}

// Store interns LabelSets.
type Store struct {
	mu      sync.RWMutex
	maxCard int
	byKey   map[string]uint32
	sets    []*LabelSet
}

// New constructs a Store with cardinality cap maxCard. A value of zero
// disables the cap (use with care).
func New(maxCard int) *Store {
	return &Store{
		maxCard: maxCard,
		byKey:   map[string]uint32{},
	}
}

// Intern canonicalises labels and returns its id.
func (s *Store) Intern(labels map[string]string) (uint32, error) {
	keys := make([]string, 0, len(labels))
	for k := range labels {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	values := make([]string, len(keys))
	for i, k := range keys {
		values[i] = labels[k]
	}
	set := &LabelSet{keys: keys, values: values}
	canon := set.Canonical()
	s.mu.RLock()
	if id, ok := s.byKey[canon]; ok {
		s.mu.RUnlock()
		return id, nil
	}
	s.mu.RUnlock()
	s.mu.Lock()
	defer s.mu.Unlock()
	if id, ok := s.byKey[canon]; ok {
		return id, nil
	}
	if s.maxCard > 0 && len(s.sets) >= s.maxCard {
		return 0, errors.New("labelstore: cardinality limit reached")
	}
	id := uint32(len(s.sets))
	s.sets = append(s.sets, set)
	s.byKey[canon] = id
	return id, nil
}

// Lookup returns the LabelSet for id.
func (s *Store) Lookup(id uint32) (*LabelSet, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if int(id) >= len(s.sets) {
		return nil, false
	}
	return s.sets[id], true
}

// Len returns the number of distinct sets.
func (s *Store) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.sets)
}

// Snapshot returns canonical strings for all sets.
func (s *Store) Snapshot() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]string, len(s.sets))
	for i, set := range s.sets {
		out[i] = set.Canonical()
	}
	return out
}
