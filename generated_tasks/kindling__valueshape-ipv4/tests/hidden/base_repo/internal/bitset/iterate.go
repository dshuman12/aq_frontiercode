package bitset

// FromInts builds a BitSet pre-populated with the given indices.
func FromInts(idx []int) *BitSet {
	b := New(0)
	for _, i := range idx {
		b.Set(i)
	}
	return b
}

// ToInts returns the indices of all set bits in ascending order.
func (b *BitSet) ToInts() []int {
	out := make([]int, 0, b.Count())
	b.Each(func(i int) bool { out = append(out, i); return true })
	return out
}

// Equal reports whether b and other contain the same indices.
func (b *BitSet) Equal(other *BitSet) bool {
	if b.Count() != other.Count() {
		return false
	}
	a, c := b.ToInts(), other.ToInts()
	for i := range a {
		if a[i] != c[i] {
			return false
		}
	}
	return true
}

// Difference returns bits in b but not in other.
func (b *BitSet) Difference(other *BitSet) *BitSet {
	out := New(0)
	b.Each(func(i int) bool {
		if !other.Get(i) {
			out.Set(i)
		}
		return true
	})
	return out
}

// SymmetricDifference returns bits in exactly one of b or other.
func (b *BitSet) SymmetricDifference(other *BitSet) *BitSet {
	left := b.Difference(other)
	right := other.Difference(b)
	return left.Union(right)
}

// Any reports whether any bit is set.
func (b *BitSet) Any() bool {
	for _, w := range b.data {
		if w != 0 {
			return true
		}
	}
	return false
}

// Clone returns a deep copy.
func (b *BitSet) Clone() *BitSet {
	out := &BitSet{data: make([]uint64, len(b.data))}
	copy(out.data, b.data)
	return out
}
