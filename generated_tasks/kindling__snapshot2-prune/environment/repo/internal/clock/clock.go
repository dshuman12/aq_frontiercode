// Package clock provides Lamport-style logical clock helpers.
package clock

import "sync/atomic"

// Lamport is a thread-safe Lamport clock.
type Lamport struct {
	t atomic.Uint64
}

// Tick increments and returns the new value.
func (c *Lamport) Tick() uint64 {
	return c.t.Add(1)
}

// Observe folds an external timestamp into the clock and returns the
// post-update value.
func (c *Lamport) Observe(external uint64) uint64 {
	for {
		cur := c.t.Load()
		next := max3(cur, external) + 1
		if c.t.CompareAndSwap(cur, next) {
			return next
		}
	}
}

// Now returns the current value.
func (c *Lamport) Now() uint64 {
	return c.t.Load()
}

// Reset zeros the clock.
func (c *Lamport) Reset() {
	c.t.Store(0)
}

func max3(a, b uint64) uint64 {
	if a > b {
		return a
	}
	return b
}
