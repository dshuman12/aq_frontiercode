// Package bloom is a bit-vector Bloom filter used to dedup record
// fingerprints across large input streams.
package bloom

import (
	"hash/fnv"
	"math"
)

// Filter is a bit-vector Bloom filter.
type Filter struct {
	bits      []uint64
	numHashes uint32
	numBits   uint64
}

// New returns a filter sized for `expected` items at `targetFP` rate.
func New(expected uint64, targetFP float64) *Filter {
	if expected == 0 {
		expected = 1
	}
	if targetFP <= 0 || targetFP >= 1 {
		targetFP = 0.01
	}
	numBits := uint64(math.Ceil(-1.0 * float64(expected) * math.Log(targetFP) / (math.Ln2 * math.Ln2)))
	if numBits < 64 {
		numBits = 64
	}
	numHashes := uint32(math.Round(float64(numBits) / float64(expected) * math.Ln2))
	if numHashes < 1 {
		numHashes = 1
	}
	words := (numBits + 63) / 64
	return &Filter{
		bits:      make([]uint64, words),
		numHashes: numHashes,
		numBits:   numBits,
	}
}

// Insert adds key to the filter.
func (f *Filter) Insert(key []byte) {
	for i := uint32(0); i < f.numHashes; i++ {
		bit := f.hashToBit(i, key)
		f.bits[bit/64] |= 1 << (bit % 64)
	}
}

// Contains reports whether key may be present (no false negatives).
func (f *Filter) Contains(key []byte) bool {
	for i := uint32(0); i < f.numHashes; i++ {
		bit := f.hashToBit(i, key)
		if f.bits[bit/64]&(1<<(bit%64)) == 0 {
			return false
		}
	}
	return true
}

// FillRatio returns the approximate fraction of bits set.
func (f *Filter) FillRatio() float64 {
	var set uint64
	for _, w := range f.bits {
		set += uint64(popcount(w))
	}
	return float64(set) / float64(f.numBits)
}

func (f *Filter) hashToBit(salt uint32, key []byte) uint64 {
	h := fnv.New64a()
	var saltBytes [4]byte
	saltBytes[0] = byte(salt)
	saltBytes[1] = byte(salt >> 8)
	saltBytes[2] = byte(salt >> 16)
	saltBytes[3] = byte(salt >> 24)
	_, _ = h.Write(saltBytes[:])
	_, _ = h.Write(key)
	return h.Sum64() % f.numBits
}

func popcount(w uint64) int {
	c := 0
	for w != 0 {
		c++
		w &= w - 1
	}
	return c
}
