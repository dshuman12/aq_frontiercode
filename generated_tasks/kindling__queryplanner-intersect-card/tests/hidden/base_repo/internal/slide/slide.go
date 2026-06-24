// Package slide implements a record-time-window aggregator.
package slide

import (
	"sync"
	"time"

	"github.com/dleblanc/kindling/internal/record"
)

// Window holds the most recent records within a time span.
type Window struct {
	mu    sync.Mutex
	span  time.Duration
	items []*record.Record
}

// New returns a window covering the last `span`.
func New(span time.Duration) *Window {
	return &Window{span: span}
}

// Push adds r to the window.
func (w *Window) Push(r *record.Record) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.evictLocked(time.Now())
	w.items = append(w.items, r)
}

// Snapshot returns a copy of the records in the window.
func (w *Window) Snapshot() []*record.Record {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.evictLocked(time.Now())
	out := make([]*record.Record, len(w.items))
	copy(out, w.items)
	return out
}

// Count returns the number of records in the window.
func (w *Window) Count() int {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.evictLocked(time.Now())
	return len(w.items)
}

// CountByLevel returns a map level -> count over the window.
func (w *Window) CountByLevel() map[string]int {
	out := map[string]int{}
	for _, r := range w.Snapshot() {
		out[r.Level]++
	}
	return out
}

// Reset clears the window.
func (w *Window) Reset() {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.items = nil
}

func (w *Window) evictLocked(now time.Time) {
	cutoff := now.Add(-w.span)
	first := 0
	for first < len(w.items) && w.items[first].Timestamp.Before(cutoff) {
		first++
	}
	if first > 0 {
		w.items = append([]*record.Record(nil), w.items[first:]...)
	}
}
