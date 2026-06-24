// Package profiling provides tiny in-process profiling helpers.
package profiling

import (
	"sync/atomic"
	"time"
)

// Counter is a monotonic atomic uint64 counter.
type Counter struct {
	v atomic.Uint64
}

// Inc increments the counter by 1.
func (c *Counter) Inc() {
	c.v.Add(1)
}

// Add increments the counter by n.
func (c *Counter) Add(n uint64) {
	c.v.Add(n)
}

// Get reads the current value.
func (c *Counter) Get() uint64 {
	return c.v.Load()
}

// Reset zeroes the counter.
func (c *Counter) Reset() {
	c.v.Store(0)
}

// Span is one captured timing.
type Span struct {
	Name     string
	Duration time.Duration
}

// Millis returns the duration as integer milliseconds.
func (s Span) Millis() int64 {
	return s.Duration.Milliseconds()
}

// Measure invokes fn and returns the value plus a captured span.
func Measure[T any](name string, fn func() T) (T, Span) {
	start := time.Now()
	v := fn()
	return v, Span{Name: name, Duration: time.Since(start)}
}

// Timer is an RAII-style timer used with `defer`.
type Timer struct {
	name  string
	start time.Time
	sink  func(Span)
}

// NewTimer starts a timer that calls sink at Stop.
func NewTimer(name string, sink func(Span)) *Timer {
	return &Timer{name: name, start: time.Now(), sink: sink}
}

// Stop emits the span.
func (t *Timer) Stop() {
	if t.sink != nil {
		t.sink(Span{Name: t.name, Duration: time.Since(t.start)})
	}
}
