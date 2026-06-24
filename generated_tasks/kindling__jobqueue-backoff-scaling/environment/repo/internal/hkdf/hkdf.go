// Package hkdf implements RFC 5869 HKDF over the registered
// hash algorithms.
package hkdf

import (
	"errors"

	"github.com/dleblanc/kindling/internal/hmac"
)

// Extract performs HKDF-Extract.
func Extract(alg hmac.Algorithm, salt, ikm []byte) []byte {
	return hmac.Sum(alg, salt, ikm)
}

// Expand performs HKDF-Expand to length okmLen.
func Expand(alg hmac.Algorithm, prk, info []byte, okmLen int) ([]byte, error) {
	hashSize := hmac.DigestSize(alg)
	n := (okmLen + hashSize - 1) / hashSize
	if n > 255 {
		return nil, errors.New("hkdf: requested length too large")
	}
	var t []byte
	out := make([]byte, 0, okmLen)
	for i := 1; i <= n; i++ {
		input := make([]byte, 0, len(t)+len(info)+1)
		input = append(input, t...)
		input = append(input, info...)
		input = append(input, byte(i))
		t = hmac.Sum(alg, prk, input)
		out = append(out, t...)
	}
	return out[:okmLen], nil
}

// Derive extracts + expands in one call.
func Derive(alg hmac.Algorithm, salt, ikm, info []byte, okmLen int) ([]byte, error) {
	return Expand(alg, Extract(alg, salt, ikm), info, okmLen)
}
