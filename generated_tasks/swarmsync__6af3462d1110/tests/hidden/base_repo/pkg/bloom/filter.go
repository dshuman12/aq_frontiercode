package bloom

import (
	"crypto/sha256"
	"encoding/binary"
	"math"
	"sync"
)

// Filter is a standard Bloom filter for probabilistic set membership testing.
// False positives are possible; false negatives are not.
type Filter struct {
	mu      sync.RWMutex
	bits    []uint64 // bit array stored as uint64 words
	size    uint     // total number of bits
	hashNum uint     // number of hash functions
	count   uint     // number of elements inserted
}

// NewFilter creates a Bloom filter optimized for the given expected number
// of elements and desired false positive rate.
func NewFilter(expectedElements uint, fpRate float64) *Filter {
	if expectedElements == 0 {
		expectedElements = 1
	}
	if fpRate <= 0 || fpRate >= 1 {
		fpRate = 0.01
	}

	// Optimal size: m = -n*ln(p) / (ln(2))^2
	m := uint(math.Ceil(-float64(expectedElements) * math.Log(fpRate) / (math.Ln2 * math.Ln2)))
	if m == 0 {
		m = 1
	}

	// Optimal hash functions: k = (m/n) * ln(2)
	k := uint(math.Ceil(float64(m) / float64(expectedElements) * math.Ln2))
	if k == 0 {
		k = 1
	}

	words := (m + 63) / 64
	return &Filter{
		bits:    make([]uint64, words),
		size:    m,
		hashNum: k,
	}
}

// NewFilterRaw creates a Bloom filter with explicit size and hash count.
func NewFilterRaw(sizeBits, hashCount uint) *Filter {
	if sizeBits == 0 {
		sizeBits = 64
	}
	if hashCount == 0 {
		hashCount = 1
	}
	words := (sizeBits + 63) / 64
	return &Filter{
		bits:    make([]uint64, words),
		size:    sizeBits,
		hashNum: hashCount,
	}
}

// Add inserts an element into the filter.
func (f *Filter) Add(data []byte) {
	f.mu.Lock()
	defer f.mu.Unlock()
	h1, h2 := doubleHash(data)
	for i := uint(0); i < f.hashNum; i++ {
		pos := (h1 + uint64(i)*h2) % uint64(f.size)
		word := pos / 64
		bit := pos % 64
		f.bits[word] |= 1 << bit
	}
	f.count++
}

// Contains tests if an element might be in the set.
// Returns true if all hash positions are set (may be a false positive).
// Returns false if any hash position is clear (guaranteed not in set).
func (f *Filter) Contains(data []byte) bool {
	f.mu.RLock()
	defer f.mu.RUnlock()
	h1, h2 := doubleHash(data)
	for i := uint(0); i < f.hashNum; i++ {
		pos := (h1 + uint64(i)*h2) % uint64(f.size)
		word := pos / 64
		bit := pos % 64
		if f.bits[word]&(1<<bit) == 0 {
			return false
		}
	}
	return true
}

// Count returns the number of elements that have been added.
func (f *Filter) Count() uint {
	f.mu.RLock()
	defer f.mu.RUnlock()
	return f.count
}

// FPRate returns the theoretical false positive rate given the current fill.
func (f *Filter) FPRate() float64 {
	f.mu.RLock()
	defer f.mu.RUnlock()
	return math.Pow(1-math.Exp(-float64(f.hashNum)*float64(f.count)/float64(f.size)), float64(f.hashNum))
}

// Size returns the number of bits in the filter.
func (f *Filter) Size() uint {
	return f.size
}

// HashNum returns the number of hash functions used.
func (f *Filter) HashNum() uint {
	return f.hashNum
}

// FillRatio returns the fraction of bits that are set.
func (f *Filter) FillRatio() float64 {
	f.mu.RLock()
	defer f.mu.RUnlock()
	set := 0
	for _, word := range f.bits {
		for word != 0 {
			set++
			word &= word - 1
		}
	}
	return float64(set) / float64(f.size)
}

// Reset clears all bits and resets the count.
func (f *Filter) Reset() {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i := range f.bits {
		f.bits[i] = 0
	}
	f.count = 0
}

// Union merges another Bloom filter into this one (bitwise OR).
// Both filters must have the same size and hash count.
func (f *Filter) Union(other *Filter) bool {
	if f.size != other.size || f.hashNum != other.hashNum {
		return false
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	other.mu.RLock()
	defer other.mu.RUnlock()
	for i := range f.bits {
		f.bits[i] |= other.bits[i]
	}
	f.count += other.count
	return true
}

// doubleHash produces two independent 64-bit hashes from SHA-256.
func doubleHash(data []byte) (uint64, uint64) {
	h := sha256.Sum256(data)
	h1 := binary.BigEndian.Uint64(h[0:8])
	h2 := binary.BigEndian.Uint64(h[8:16])
	if h2 == 0 {
		h2 = 1
	}
	return h1, h2
}

// CountingFilter supports both Add and Remove by maintaining counters
// instead of single bits. Each position uses a 4-bit counter (0-15).
type CountingFilter struct {
	mu       sync.RWMutex
	counters []uint8 // each byte stores two 4-bit counters
	size     uint
	hashNum  uint
	count    uint
}

// NewCountingFilter creates a counting Bloom filter.
func NewCountingFilter(expectedElements uint, fpRate float64) *CountingFilter {
	if expectedElements == 0 {
		expectedElements = 1
	}
	if fpRate <= 0 || fpRate >= 1 {
		fpRate = 0.01
	}

	m := uint(math.Ceil(-float64(expectedElements) * math.Log(fpRate) / (math.Ln2 * math.Ln2)))
	if m == 0 {
		m = 1
	}
	k := uint(math.Ceil(float64(m) / float64(expectedElements) * math.Ln2))
	if k == 0 {
		k = 1
	}

	// Two counters per byte
	bytes := (m + 1) / 2
	return &CountingFilter{
		counters: make([]uint8, bytes),
		size:     m,
		hashNum:  k,
	}
}

// Add increments the counters for an element.
func (cf *CountingFilter) Add(data []byte) {
	cf.mu.Lock()
	defer cf.mu.Unlock()
	h1, h2 := doubleHash(data)
	for i := uint(0); i < cf.hashNum; i++ {
		pos := (h1 + uint64(i)*h2) % uint64(cf.size)
		cf.incrementCounter(pos)
	}
	cf.count++
}

// Remove decrements the counters for an element.
// Returns false if any counter would underflow.
func (cf *CountingFilter) Remove(data []byte) bool {
	cf.mu.Lock()
	defer cf.mu.Unlock()
	h1, h2 := doubleHash(data)

	// First check all positions
	for i := uint(0); i < cf.hashNum; i++ {
		pos := (h1 + uint64(i)*h2) % uint64(cf.size)
		if cf.getCounter(pos) == 0 {
			return false
		}
	}
	// Then decrement all
	for i := uint(0); i < cf.hashNum; i++ {
		pos := (h1 + uint64(i)*h2) % uint64(cf.size)
		cf.decrementCounter(pos)
	}
	if cf.count > 0 {
		cf.count--
	}
	return true
}

// Contains tests membership.
func (cf *CountingFilter) Contains(data []byte) bool {
	cf.mu.RLock()
	defer cf.mu.RUnlock()
	h1, h2 := doubleHash(data)
	for i := uint(0); i < cf.hashNum; i++ {
		pos := (h1 + uint64(i)*h2) % uint64(cf.size)
		if cf.getCounter(pos) == 0 {
			return false
		}
	}
	return true
}

// Count returns the number of net additions.
func (cf *CountingFilter) Count() uint {
	cf.mu.RLock()
	defer cf.mu.RUnlock()
	return cf.count
}

func (cf *CountingFilter) getCounter(pos uint64) uint8 {
	byteIdx := pos / 2
	if pos%2 == 0 {
		return cf.counters[byteIdx] & 0x0F
	}
	return cf.counters[byteIdx] >> 4
}

func (cf *CountingFilter) incrementCounter(pos uint64) {
	byteIdx := pos / 2
	if pos%2 == 0 {
		low := cf.counters[byteIdx] & 0x0F
		if low < 15 {
			cf.counters[byteIdx] = (cf.counters[byteIdx] & 0xF0) | (low + 1)
		}
	} else {
		high := cf.counters[byteIdx] >> 4
		if high < 15 {
			cf.counters[byteIdx] = (cf.counters[byteIdx] & 0x0F) | ((high + 1) << 4)
		}
	}
}

func (cf *CountingFilter) decrementCounter(pos uint64) {
	byteIdx := pos / 2
	if pos%2 == 0 {
		low := cf.counters[byteIdx] & 0x0F
		if low > 0 {
			cf.counters[byteIdx] = (cf.counters[byteIdx] & 0xF0) | (low - 1)
		}
	} else {
		high := cf.counters[byteIdx] >> 4
		if high > 0 {
			cf.counters[byteIdx] = (cf.counters[byteIdx] & 0x0F) | ((high - 1) << 4)
		}
	}
}

// ScalableFilter automatically grows by adding new filter slices
// when the current slice exceeds its capacity. Each new slice has
// a tighter false positive target to maintain the overall bound.
type ScalableFilter struct {
	mu       sync.RWMutex
	filters  []*Filter
	fpRate   float64
	growth   uint    // multiplier for each new slice's size
	maxSlice uint    // capacity per slice
	count    uint
}

// NewScalableFilter creates a scalable Bloom filter.
func NewScalableFilter(initialCapacity uint, fpRate float64, growthFactor uint) *ScalableFilter {
	if initialCapacity == 0 {
		initialCapacity = 1000
	}
	if growthFactor == 0 {
		growthFactor = 2
	}
	sf := &ScalableFilter{
		fpRate:   fpRate,
		growth:   growthFactor,
		maxSlice: initialCapacity,
	}
	sf.filters = append(sf.filters, NewFilter(initialCapacity, fpRate))
	return sf
}

// Add inserts an element. Creates a new slice if the current one is full.
func (sf *ScalableFilter) Add(data []byte) {
	sf.mu.Lock()
	defer sf.mu.Unlock()
	current := sf.filters[len(sf.filters)-1]
	if current.Count() >= sf.maxSlice {
		sf.maxSlice *= sf.growth
		tighterFP := sf.fpRate * math.Pow(0.5, float64(len(sf.filters)))
		newFilter := NewFilter(sf.maxSlice, tighterFP)
		sf.filters = append(sf.filters, newFilter)
		current = newFilter
	}
	current.Add(data)
	sf.count++
}

// Contains checks all slices for membership.
func (sf *ScalableFilter) Contains(data []byte) bool {
	sf.mu.RLock()
	defer sf.mu.RUnlock()
	for _, f := range sf.filters {
		if f.Contains(data) {
			return true
		}
	}
	return false
}

// Count returns the total number of elements across all slices.
func (sf *ScalableFilter) Count() uint {
	sf.mu.RLock()
	defer sf.mu.RUnlock()
	return sf.count
}

// SliceCount returns the number of filter slices.
func (sf *ScalableFilter) SliceCount() int {
	sf.mu.RLock()
	defer sf.mu.RUnlock()
	return len(sf.filters)
}