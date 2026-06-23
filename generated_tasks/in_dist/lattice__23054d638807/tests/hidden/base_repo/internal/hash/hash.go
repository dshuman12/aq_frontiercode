// Package hash provides content-hashing helpers used by pkg/cache.
// We keep this in internal/ so out-of-tree consumers can't depend on
// the algorithm choice — it's a private implementation detail.
package hash

import (
	"encoding/hex"
	"io"
	"os"

	"github.com/zeebo/blake3"
)

// HashFile returns the lowercase-hex blake3 digest of the file at path.
// It streams the file rather than reading it into memory, so this is
// safe for large input files.
func HashFile(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	h := blake3.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	sum := h.Sum(nil)
	return hex.EncodeToString(sum), nil
}

// HashBytes returns the hex digest of an in-memory buffer. Used for
// hashing the resolved Command + Env strings.
func HashBytes(b []byte) string {
	h := blake3.New()
	h.Write(b)
	return hex.EncodeToString(h.Sum(nil))
}

// MultiHasher accumulates several digests into one. Used by
// pkg/cache to combine input-file hashes + command + env into the
// single CacheKey.
type MultiHasher struct {
	h *blake3.Hasher
}

// NewMulti returns a fresh MultiHasher.
func NewMulti() *MultiHasher {
	return &MultiHasher{h: blake3.New()}
}

// AddString feeds a UTF-8 string into the hasher with a length prefix
// (so "abc" + "def" hashes differently from "ab" + "cdef").
func (m *MultiHasher) AddString(s string) {
	m.AddBytes([]byte(s))
}

// AddBytes feeds bytes with a length prefix.
func (m *MultiHasher) AddBytes(b []byte) {
	var lenBuf [10]byte
	n := putUvarint(lenBuf[:], uint64(len(b)))
	m.h.Write(lenBuf[:n])
	m.h.Write(b)
}

// Sum returns the final hex digest.
func (m *MultiHasher) Sum() string {
	return hex.EncodeToString(m.h.Sum(nil))
}

// putUvarint encodes a uint64 in little-endian variable-length form.
// Inlined so we don't pull in encoding/binary just for this.
func putUvarint(buf []byte, x uint64) int {
	i := 0
	for x >= 0x80 {
		buf[i] = byte(x) | 0x80
		x >>= 7
		i++
	}
	buf[i] = byte(x)
	return i + 1
}
