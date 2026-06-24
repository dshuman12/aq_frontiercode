package bitmap

import "sync"

// Bitmap is a thread-safe compressed bitmap using run-length encoding internally.
// Operations are performed on a dense uint64 word array.
type Bitmap struct {
	mu    sync.RWMutex
	words []uint64
	count int
}

// New creates an empty bitmap.
func New() *Bitmap { return &Bitmap{} }

// Set sets bit at position pos.
func (b *Bitmap) Set(pos uint) {
	b.mu.Lock()
	defer b.mu.Unlock()
	word := pos / 64
	bit := pos % 64
	b.grow(word)
	if b.words[word]&(1<<bit) == 0 { b.count++ }
	b.words[word] |= 1 << bit
}

// Clear clears bit at position pos.
func (b *Bitmap) Clear(pos uint) {
	b.mu.Lock()
	defer b.mu.Unlock()
	word := pos / 64
	if word >= uint(len(b.words)) { return }
	bit := pos % 64
	if b.words[word]&(1<<bit) != 0 { b.count-- }
	b.words[word] &^= 1 << bit
}

// Test returns true if bit at pos is set.
func (b *Bitmap) Test(pos uint) bool {
	b.mu.RLock()
	defer b.mu.RUnlock()
	word := pos / 64
	if word >= uint(len(b.words)) { return false }
	return b.words[word]&(1<<(pos%64)) != 0
}

// Count returns the number of set bits (population count).
func (b *Bitmap) Count() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.count
}

// And performs in-place AND with another bitmap.
func (b *Bitmap) And(other *Bitmap) {
	b.mu.Lock()
	defer b.mu.Unlock()
	other.mu.RLock()
	defer other.mu.RUnlock()
	minLen := len(b.words)
	if len(other.words) < minLen { minLen = len(other.words) }
	for i := 0; i < minLen; i++ { b.words[i] &= other.words[i] }
	for i := minLen; i < len(b.words); i++ { b.words[i] = 0 }
	b.recount()
}

// Or performs in-place OR with another bitmap.
func (b *Bitmap) Or(other *Bitmap) {
	b.mu.Lock()
	defer b.mu.Unlock()
	other.mu.RLock()
	defer other.mu.RUnlock()
	b.grow(uint(len(other.words)) - 1)
	for i := 0; i < len(other.words); i++ { b.words[i] |= other.words[i] }
	b.recount()
}

// Xor performs in-place XOR with another bitmap.
func (b *Bitmap) Xor(other *Bitmap) {
	b.mu.Lock()
	defer b.mu.Unlock()
	other.mu.RLock()
	defer other.mu.RUnlock()
	if len(other.words) > 0 { b.grow(uint(len(other.words)) - 1) }
	for i := 0; i < len(other.words); i++ { b.words[i] ^= other.words[i] }
	b.recount()
}

// AndNot performs in-place AND NOT (difference).
func (b *Bitmap) AndNot(other *Bitmap) {
	b.mu.Lock()
	defer b.mu.Unlock()
	other.mu.RLock()
	defer other.mu.RUnlock()
	minLen := len(b.words)
	if len(other.words) < minLen { minLen = len(other.words) }
	for i := 0; i < minLen; i++ { b.words[i] &^= other.words[i] }
	b.recount()
}

// Bits returns all set bit positions.
func (b *Bitmap) Bits() []uint {
	b.mu.RLock()
	defer b.mu.RUnlock()
	var result []uint
	for i, w := range b.words {
		for w != 0 {
			bit := uint(0)
			tmp := w
			for tmp&1 == 0 { bit++; tmp >>= 1 }
			result = append(result, uint(i)*64+bit)
			w &= w - 1
		}
	}
	return result
}

// Clone returns a deep copy.
func (b *Bitmap) Clone() *Bitmap {
	b.mu.RLock()
	defer b.mu.RUnlock()
	cp := &Bitmap{words: make([]uint64, len(b.words)), count: b.count}
	copy(cp.words, b.words)
	return cp
}

// Reset clears all bits.
func (b *Bitmap) Reset() {
	b.mu.Lock()
	defer b.mu.Unlock()
	for i := range b.words { b.words[i] = 0 }
	b.count = 0
}

// IsEmpty returns true if no bits are set.
func (b *Bitmap) IsEmpty() bool {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.count == 0
}

func (b *Bitmap) grow(wordIdx uint) {
	for uint(len(b.words)) <= wordIdx {
		b.words = append(b.words, 0)
	}
}

func (b *Bitmap) recount() {
	b.count = 0
	for _, w := range b.words {
		for w != 0 { b.count++; w &= w - 1 }
	}
}
