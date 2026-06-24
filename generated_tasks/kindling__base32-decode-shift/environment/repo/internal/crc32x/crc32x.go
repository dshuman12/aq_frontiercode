// Package crc32x is a CRC-32 (IEEE 802.3) implementation with a
// precomputed table.
package crc32x

const poly uint32 = 0xedb8_8320

var table = [256]uint32{}

func init() {
	for i := 0; i < 256; i++ {
		c := uint32(i)
		for k := 0; k < 8; k++ {
			if c&1 != 0 {
				c = poly ^ (c >> 1)
			} else {
				c >>= 1
			}
		}
		table[i] = c
	}
}

// Sum returns CRC-32 over data.
func Sum(data []byte) uint32 {
	c := ^uint32(0)
	for _, b := range data {
		c = (c >> 8) ^ table[byte(c)^b]
	}
	return ^c
}

// State is a streaming Sum accumulator.
type State struct {
	c uint32
}

// New returns a fresh State.
func New() *State { return &State{c: ^uint32(0)} }

// Update folds bytes into the state.
func (s *State) Update(b []byte) {
	c := s.c
	for _, x := range b {
		c = (c >> 8) ^ table[byte(c)^x]
	}
	s.c = c
}

// Sum returns the current CRC value.
func (s *State) Sum() uint32 {
	return ^s.c
}

// Reset clears the state.
func (s *State) Reset() {
	s.c = ^uint32(0)
}
