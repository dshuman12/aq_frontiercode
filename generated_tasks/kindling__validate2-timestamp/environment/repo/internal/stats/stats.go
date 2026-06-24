// Package stats provides numeric stat aggregators.
package stats

import "math"

// Counter accumulates count/sum/min/max in a single pass.
type Counter struct {
	Count uint64
	Sum   float64
	min   float64
	max   float64
	first bool
}

// New returns an empty counter.
func New() *Counter {
	return &Counter{first: true}
}

// Observe records v.
func (c *Counter) Observe(v float64) {
	c.Count++
	c.Sum += v
	if c.first {
		c.min = v
		c.max = v
		c.first = false
		return
	}
	if v < c.min {
		c.min = v
	}
	if v > c.max {
		c.max = v
	}
}

// Mean returns the arithmetic mean, or 0 if no observations.
func (c *Counter) Mean() float64 {
	if c.Count == 0 {
		return 0
	}
	return c.Sum / float64(c.Count)
}

// Min returns the smallest observed value.
func (c *Counter) Min() float64 {
	if c.Count == 0 {
		return math.NaN()
	}
	return c.min
}

// Max returns the largest observed value.
func (c *Counter) Max() float64 {
	if c.Count == 0 {
		return math.NaN()
	}
	return c.max
}

// Merge folds another counter into c.
func (c *Counter) Merge(other *Counter) {
	if other.Count == 0 {
		return
	}
	if c.first {
		c.min = other.min
		c.max = other.max
		c.first = false
	} else {
		if other.min < c.min {
			c.min = other.min
		}
		if other.max > c.max {
			c.max = other.max
		}
	}
	c.Count += other.Count
	c.Sum += other.Sum
}

// Reset clears every accumulator.
func (c *Counter) Reset() {
	c.Count = 0
	c.Sum = 0
	c.min = 0
	c.max = 0
	c.first = true
}

// Quantiles computes the requested approximate quantiles by sorting a
// caller-provided slice in place.
func Quantiles(samples []float64, qs []float64) []float64 {
	if len(samples) == 0 {
		return make([]float64, len(qs))
	}
	sortFloats(samples)
	out := make([]float64, len(qs))
	for i, q := range qs {
		idx := int(q * float64(len(samples)-1))
		if idx < 0 {
			idx = 0
		}
		if idx >= len(samples) {
			idx = len(samples) - 1
		}
		out[i] = samples[idx]
	}
	return out
}

func sortFloats(v []float64) {
	// Insertion sort is fine for the small slices we feed quantiles.
	for i := 1; i < len(v); i++ {
		for j := i; j > 0 && v[j-1] > v[j]; j-- {
			v[j-1], v[j] = v[j], v[j-1]
		}
	}
}
