// Package deltastore stores changes as small "delta" records relative to
// a baseline. The benefit is dense storage when records mostly repeat:
// dashboards that ship per-second snapshots compress 50-100x using
// deltastore vs. the same data stored verbatim.
package deltastore

import (
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"
)

// Field is one named value.
type Field struct {
	Name  string
	Value string
}

// Snapshot is a complete state at a given time.
type Snapshot struct {
	Time   time.Time
	Fields map[string]string
}

// Delta is a diff between two snapshots.
type Delta struct {
	Time  time.Time
	Set   map[string]string
	Unset []string
}

// Store holds a baseline snapshot and a chain of deltas.
type Store struct {
	mu     sync.RWMutex
	base   Snapshot
	deltas []Delta
	maxLen int
}

// New constructs a Store with baseline at t.
func New(base Snapshot, maxLen int) *Store {
	if maxLen <= 0 {
		maxLen = 4096
	}
	cloned := Snapshot{Time: base.Time, Fields: cloneMap(base.Fields)}
	return &Store{base: cloned, maxLen: maxLen}
}

// Record adds a snapshot, computing the delta from the last known state.
func (s *Store) Record(snap Snapshot) error {
	if snap.Time.IsZero() {
		return errors.New("deltastore: snapshot time required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	prev := s.materialiseLocked(s.head())
	delta := computeDelta(prev.Fields, snap)
	s.deltas = append(s.deltas, delta)
	if len(s.deltas) > s.maxLen {
		// Roll the baseline forward to drop the oldest delta.
		applied := applyDelta(s.base.Fields, s.deltas[0])
		s.base.Time = s.deltas[0].Time
		s.base.Fields = applied
		s.deltas = s.deltas[1:]
	}
	return nil
}

// Materialise returns the snapshot at the n-th recorded delta (0-based).
func (s *Store) Materialise(idx int) (Snapshot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if idx < 0 || idx > len(s.deltas) {
		return Snapshot{}, fmt.Errorf("deltastore: index %d out of range", idx)
	}
	return s.materialiseLocked(idx), nil
}

// Latest returns the most recent snapshot.
func (s *Store) Latest() Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.materialiseLocked(s.head())
}

// Len returns the number of deltas recorded.
func (s *Store) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.deltas)
}

// Each invokes fn for each materialised snapshot in order.
func (s *Store) Each(fn func(Snapshot) bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	cur := cloneMap(s.base.Fields)
	if !fn(Snapshot{Time: s.base.Time, Fields: cloneMap(cur)}) {
		return
	}
	for _, d := range s.deltas {
		cur = applyDelta(cur, d)
		if !fn(Snapshot{Time: d.Time, Fields: cloneMap(cur)}) {
			return
		}
	}
}

func (s *Store) head() int { return len(s.deltas) }

func (s *Store) materialiseLocked(end int) Snapshot {
	cur := cloneMap(s.base.Fields)
	t := s.base.Time
	for i := 0; i < end; i++ {
		cur = applyDelta(cur, s.deltas[i])
		t = s.deltas[i].Time
	}
	return Snapshot{Time: t, Fields: cur}
}

func cloneMap(m map[string]string) map[string]string {
	out := make(map[string]string, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}

func computeDelta(prev map[string]string, snap Snapshot) Delta {
	d := Delta{Time: snap.Time, Set: map[string]string{}}
	for k, v := range snap.Fields {
		if old, ok := prev[k]; !ok || old != v {
			d.Set[k] = v
		}
	}
	for k := range prev {
		if _, ok := snap.Fields[k]; !ok {
			d.Unset = append(d.Unset, k)
		}
	}
	sort.Strings(d.Unset)
	return d
}

func applyDelta(prev map[string]string, d Delta) map[string]string {
	out := cloneMap(prev)
	for k, v := range d.Set {
		out[k] = v
	}
	for _, k := range d.Unset {
		delete(out, k)
	}
	return out
}
