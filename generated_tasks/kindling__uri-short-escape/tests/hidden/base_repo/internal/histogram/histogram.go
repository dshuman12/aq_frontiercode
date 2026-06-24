// Package histogram implements a fixed-bucket histogram.
package histogram

// Histogram is a fixed-bucket counter accumulator.
type Histogram struct {
	bounds   []uint64
	counts   []uint64
	overflow uint64
	sum      uint64
}

// New builds a histogram with the given inclusive upper bounds.
func New(bounds []uint64) *Histogram {
	return &Histogram{
		bounds: append([]uint64(nil), bounds...),
		counts: make([]uint64, len(bounds)),
	}
}

// Observe records a value.
func (h *Histogram) Observe(v uint64) {
	h.sum += v
	for i, b := range h.bounds {
		if v <= b {
			h.counts[i]++
			return
		}
	}
	h.overflow++
}

// Count returns the total observation count.
func (h *Histogram) Count() uint64 {
	var n uint64
	for _, c := range h.counts {
		n += c
	}
	return n + h.overflow
}

// Buckets returns the per-bucket counts plus the overflow bucket.
func (h *Histogram) Buckets() ([]uint64, uint64) {
	out := make([]uint64, len(h.counts))
	copy(out, h.counts)
	return out, h.overflow
}

// Sum returns the running sum.
func (h *Histogram) Sum() uint64 {
	return h.sum
}

// CumulativeBelow returns the count of observations at or below bound.
func (h *Histogram) CumulativeBelow(bound uint64) uint64 {
	var c uint64
	for i, b := range h.bounds {
		if b > bound {
			break
		}
		c += h.counts[i]
	}
	return c
}
