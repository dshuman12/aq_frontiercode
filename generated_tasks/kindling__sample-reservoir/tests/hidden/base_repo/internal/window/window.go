// Package window provides a sliding window of timestamped values.
package window

import (
	"sync"
	"time"
)

// Sample is one observed value at a point in time.
type Sample struct {
	At    time.Time
	Value float64
}

// Window is a fixed-time-span ring of samples.
type Window struct {
	mu       sync.Mutex
	span     time.Duration
	samples  []Sample
	now      func() time.Time
}

// New returns a window covering the last `span`.
func New(span time.Duration) *Window {
	return &Window{span: span, now: time.Now}
}

// SetNow replaces the clock; used in tests.
func (w *Window) SetNow(now func() time.Time) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.now = now
}

// Observe records v with timestamp `now()`.
func (w *Window) Observe(v float64) {
	w.mu.Lock()
	defer w.mu.Unlock()
	now := w.now()
	w.evictLocked(now)
	w.samples = append(w.samples, Sample{At: now, Value: v})
}

// Snapshot returns the current samples.
func (w *Window) Snapshot() []Sample {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.evictLocked(w.now())
	out := make([]Sample, len(w.samples))
	copy(out, w.samples)
	return out
}

// Sum returns the sum of values currently in the window.
func (w *Window) Sum() float64 {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.evictLocked(w.now())
	var s float64
	for _, x := range w.samples {
		s += x.Value
	}
	return s
}

// Mean returns the arithmetic mean of values currently in the window.
func (w *Window) Mean() float64 {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.evictLocked(w.now())
	if len(w.samples) == 0 {
		return 0
	}
	var s float64
	for _, x := range w.samples {
		s += x.Value
	}
	return s / float64(len(w.samples))
}

// Count returns the number of samples currently in the window.
func (w *Window) Count() int {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.evictLocked(w.now())
	return len(w.samples)
}

func (w *Window) evictLocked(now time.Time) {
	cutoff := now.Add(-w.span)
	first := 0
	for first < len(w.samples) && w.samples[first].At.Before(cutoff) {
		first++
	}
	if first > 0 {
		w.samples = append([]Sample(nil), w.samples[first:]...)
	}
}
