// Package adler32x is a streaming Adler-32 checksum implementation.
package adler32x

const modAdler uint32 = 65521

// Sum returns Adler-32 over data.
func Sum(data []byte) uint32 {
	var a uint32 = 1
	var b uint32
	for _, x := range data {
		a = (a + uint32(x)) % modAdler
		b = (b + a) % modAdler
	}
	return (b << 16) | a
}

// State is a streaming Adler-32 accumulator.
type State struct {
	a, b uint32
}

// New returns a fresh State.
func New() *State { return &State{a: 1} }

// Update folds bytes into the state.
func (s *State) Update(data []byte) {
	a, b := s.a, s.b
	for _, x := range data {
		a = (a + uint32(x)) % modAdler
		b = (b + a) % modAdler
	}
	s.a, s.b = a, b
}

// Sum returns the current checksum.
func (s *State) Sum() uint32 {
	return (s.b << 16) | s.a
}

// Reset clears the state.
func (s *State) Reset() {
	s.a, s.b = 1, 0
}
