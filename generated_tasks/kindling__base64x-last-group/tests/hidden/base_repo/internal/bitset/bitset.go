// Package bitset implements a compact growable bit set.
//
// Bit sets back the kindling inverted index posting lists. Compared with
// a hash set they trade compactness for cheaper bulk operations
// (intersect, union, count).
package bitset

import "math/bits"

// BitSet is a growable bit set backed by a uint64 slice.
type BitSet struct {
	data []uint64
}

// New constructs a BitSet sized to hold capacity bits.
func New(capacity int) *BitSet {
	if capacity <= 0 {
		return &BitSet{}
	}
	return &BitSet{data: make([]uint64, (capacity+63)/64)}
}

// Set marks bit i.
func (b *BitSet) Set(i int) {
	w, m := i/64, uint64(1)<<(uint(i)%64)
	for len(b.data) <= w {
		b.data = append(b.data, 0)
	}
	b.data[w] |= m
}

// Clear unsets bit i.
func (b *BitSet) Clear(i int) {
	w := i / 64
	if w >= len(b.data) {
		return
	}
	b.data[w] &^= uint64(1) << (uint(i) % 64)
}

// Get returns true if bit i is set.
func (b *BitSet) Get(i int) bool {
	w := i / 64
	if w >= len(b.data) {
		return false
	}
	return b.data[w]&(uint64(1)<<(uint(i)%64)) != 0
}

// Count returns the number of set bits.
func (b *BitSet) Count() int {
	n := 0
	for _, w := range b.data {
		n += bits.OnesCount64(w)
	}
	return n
}

// Union returns a new BitSet containing bits set in either b or other.
func (b *BitSet) Union(other *BitSet) *BitSet {
	max := len(b.data)
	if len(other.data) > max {
		max = len(other.data)
	}
	out := &BitSet{data: make([]uint64, max)}
	for i := 0; i < max; i++ {
		var l, r uint64
		if i < len(b.data) {
			l = b.data[i]
		}
		if i < len(other.data) {
			r = other.data[i]
		}
		out.data[i] = l | r
	}
	return out
}

// Intersect returns a new BitSet of bits set in both b and other.
func (b *BitSet) Intersect(other *BitSet) *BitSet {
	min := len(b.data)
	if len(other.data) < min {
		min = len(other.data)
	}
	out := &BitSet{data: make([]uint64, min)}
	for i := 0; i < min; i++ {
		out.data[i] = b.data[i] & other.data[i]
	}
	return out
}

// Each invokes fn for every set bit, in ascending order.
func (b *BitSet) Each(fn func(i int) bool) {
	for w, word := range b.data {
		for word != 0 {
			tz := bits.TrailingZeros64(word)
			if !fn(w*64 + tz) {
				return
			}
			word &^= uint64(1) << uint(tz)
		}
	}
}

// Cap returns the capacity in bits.
func (b *BitSet) Cap() int { return len(b.data) * 64 }
