// Package kvstore is an in-memory key/value cache with optional TTL,
// background expiry sweep, and basic operational counters. The store is
// safe for concurrent use.
package kvstore

import (
	"context"
	"sort"
	"sync"
	"sync/atomic"
	"time"
)

// Entry is one key/value record.
type Entry struct {
	Value     any
	ExpiresAt time.Time
}

// Store is the kv container.
type Store struct {
	mu      sync.RWMutex
	data    map[string]Entry
	now     func() time.Time
	hits    uint64
	misses  uint64
	expires uint64
}

// New constructs a Store.
func New() *Store {
	return &Store{data: map[string]Entry{}, now: time.Now}
}

// SetClock overrides the time source.
func (s *Store) SetClock(fn func() time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.now = fn
}

// Set inserts or replaces key.
func (s *Store) Set(key string, value any, ttl time.Duration) {
	expires := time.Time{}
	if ttl > 0 {
		expires = s.now().Add(ttl)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data[key] = Entry{Value: value, ExpiresAt: expires}
}

// Get returns the value for key.
func (s *Store) Get(key string) (any, bool) {
	s.mu.RLock()
	e, ok := s.data[key]
	s.mu.RUnlock()
	if !ok {
		atomic.AddUint64(&s.misses, 1)
		return nil, false
	}
	if !e.ExpiresAt.IsZero() && s.now().After(e.ExpiresAt) {
		s.mu.Lock()
		delete(s.data, key)
		s.mu.Unlock()
		atomic.AddUint64(&s.expires, 1)
		atomic.AddUint64(&s.misses, 1)
		return nil, false
	}
	atomic.AddUint64(&s.hits, 1)
	return e.Value, true
}

// Delete removes key.
func (s *Store) Delete(key string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data, key)
}

// Len returns the number of entries (including expired-but-not-swept).
func (s *Store) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.data)
}

// Keys returns a stable sorted list of current keys (excluding expired).
func (s *Store) Keys() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]string, 0, len(s.data))
	now := s.now()
	for k, e := range s.data {
		if !e.ExpiresAt.IsZero() && now.After(e.ExpiresAt) {
			continue
		}
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

// Sweep removes all expired entries; returns the number reclaimed.
func (s *Store) Sweep() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.now()
	n := 0
	for k, e := range s.data {
		if !e.ExpiresAt.IsZero() && now.After(e.ExpiresAt) {
			delete(s.data, k)
			n++
		}
	}
	atomic.AddUint64(&s.expires, uint64(n))
	return n
}

// RunSweeper sweeps every interval until ctx is cancelled.
func (s *Store) RunSweeper(ctx context.Context, interval time.Duration) {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			s.Sweep()
		}
	}
}

// Stats reports counters.
type Stats struct {
	Hits, Misses, Expires uint64
	Size                  int
}

// Stats returns a snapshot.
func (s *Store) Stats() Stats {
	return Stats{
		Hits:    atomic.LoadUint64(&s.hits),
		Misses:  atomic.LoadUint64(&s.misses),
		Expires: atomic.LoadUint64(&s.expires),
		Size:    s.Len(),
	}
}
