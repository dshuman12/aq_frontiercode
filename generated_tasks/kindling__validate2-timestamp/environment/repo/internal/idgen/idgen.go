// Package idgen produces lexicographically-sortable, random-tail
// identifiers similar to ULIDs, with crockford base32 encoding.
//
// The format is 10 timestamp characters (ms precision) followed by 16
// random characters; total 26 ASCII characters. Sortability survives
// across encoders because the timestamp prefix is fixed-width.
package idgen

import (
	"crypto/rand"
	"errors"
	"sync"
	"time"
)

const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ" // crockford base32

// Generator emits ids; it is safe for concurrent use.
type Generator struct {
	mu      sync.Mutex
	lastTs  int64
	lastRnd [10]byte
}

// New constructs a Generator.
func New() *Generator { return &Generator{} }

// Next returns the next id.
func (g *Generator) Next() string { return g.At(time.Now()) }

// At returns an id for the given time.
func (g *Generator) At(t time.Time) string {
	g.mu.Lock()
	defer g.mu.Unlock()
	ms := t.UnixMilli()
	if ms == g.lastTs {
		incrementBytes(g.lastRnd[:])
	} else {
		_, _ = rand.Read(g.lastRnd[:])
		g.lastTs = ms
	}
	var out [26]byte
	encodeTime(out[:10], ms)
	encodeRandom(out[10:], g.lastRnd[:])
	return string(out[:])
}

func incrementBytes(b []byte) {
	for i := len(b) - 1; i >= 0; i-- {
		b[i]++
		if b[i] != 0 {
			return
		}
	}
}

func encodeTime(out []byte, ms int64) {
	for i := 9; i >= 0; i-- {
		out[i] = alphabet[ms&31]
		ms >>= 5
	}
}

func encodeRandom(out, in []byte) {
	idx := 0
	bits := 0
	var carry uint16
	for _, b := range in {
		carry = carry<<8 | uint16(b)
		bits += 8
		for bits >= 5 {
			bits -= 5
			out[idx] = alphabet[(carry>>bits)&31]
			idx++
			if idx == 16 {
				return
			}
		}
	}
	if idx < 16 {
		out[idx] = alphabet[(carry<<(5-bits))&31]
	}
}

// Validate returns nil if id has the expected shape and alphabet.
func Validate(id string) error {
	if len(id) != 26 {
		return errors.New("idgen: wrong length")
	}
	for i := 0; i < len(id); i++ {
		c := id[i]
		ok := false
		for _, a := range []byte(alphabet) {
			if a == c {
				ok = true
				break
			}
		}
		if !ok {
			return errors.New("idgen: invalid character")
		}
	}
	return nil
}
