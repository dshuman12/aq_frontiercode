// Package sample implements reservoir sampling.
package sample

import (
	"math/rand"
)

// Reservoir is a fixed-size reservoir over a stream of items.
type Reservoir struct {
	cap     int
	items   []any
	seen    int64
	rand    *rand.Rand
}

// New returns a reservoir of capacity n.
func New(n int, seed int64) *Reservoir {
	if n < 1 {
		n = 1
	}
	src := rand.NewSource(seed)
	return &Reservoir{cap: n, items: make([]any, 0, n), rand: rand.New(src)}
}

// Observe presents v to the reservoir; it may or may not be retained.
func (r *Reservoir) Observe(v any) {
	r.seen++
	if len(r.items) < r.cap {
		r.items = append(r.items, v)
		return
	}
	idx := r.rand.Int63n(r.seen)
	if idx < int64(r.cap) {
		r.items[idx] = v
	}
}

// Items returns a copy of the retained items.
func (r *Reservoir) Items() []any {
	out := make([]any, len(r.items))
	copy(out, r.items)
	return out
}

// Seen returns the count of observed items.
func (r *Reservoir) Seen() int64 { return r.seen }

// Capacity returns the reservoir capacity.
func (r *Reservoir) Capacity() int { return r.cap }

// Reset clears the reservoir.
func (r *Reservoir) Reset() {
	r.items = r.items[:0]
	r.seen = 0
}
