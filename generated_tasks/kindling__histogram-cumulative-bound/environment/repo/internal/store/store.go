// Package store holds a sequence of records with stable u64 ids.
package store

import (
	"sort"
	"sync"

	"github.com/dleblanc/kindling/internal/record"
)

// Store is a thread-safe slice of records.
type Store struct {
	mu      sync.RWMutex
	records []*record.Record
}

// New returns an empty store.
func New() *Store {
	return &Store{records: nil}
}

// Append inserts r and returns its assigned id.
func (s *Store) Append(r *record.Record) uint64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	id := uint64(len(s.records))
	s.records = append(s.records, r)
	return id
}

// Len returns the number of stored records.
func (s *Store) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.records)
}

// Get returns the record at id, or nil if out of range.
func (s *Store) Get(id uint64) *record.Record {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if id >= uint64(len(s.records)) {
		return nil
	}
	return s.records[id]
}

// All returns a snapshot of every record (in id order).
func (s *Store) All() []*record.Record {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*record.Record, len(s.records))
	copy(out, s.records)
	return out
}

// Filter returns records satisfying pred.
func (s *Store) Filter(pred func(*record.Record) bool) []*record.Record {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []*record.Record
	for _, r := range s.records {
		if pred(r) {
			out = append(out, r)
		}
	}
	return out
}

// Reset empties the store.
func (s *Store) Reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.records = nil
}

// SortByTimestamp re-orders records ascending by Timestamp.
func (s *Store) SortByTimestamp() {
	s.mu.Lock()
	defer s.mu.Unlock()
	sort.SliceStable(s.records, func(i, j int) bool {
		return s.records[i].Timestamp.Before(s.records[j].Timestamp)
	})
}
