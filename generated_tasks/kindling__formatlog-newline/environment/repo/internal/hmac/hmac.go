// Package hmac provides HMAC-based authentication helpers.
package hmac

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/hex"
	"fmt"
	"hash"
)

// Algorithm enumerates supported hash algorithms.
type Algorithm int

const (
	AlgSHA256 Algorithm = iota
	AlgSHA512
)

// ParseAlgorithm returns the matching Algorithm.
func ParseAlgorithm(s string) (Algorithm, error) {
	switch s {
	case "sha256":
		return AlgSHA256, nil
	case "sha512":
		return AlgSHA512, nil
	}
	return 0, fmt.Errorf("hmac: unknown algorithm %q", s)
}

// Sum computes HMAC-<alg>(key, message).
func Sum(alg Algorithm, key, message []byte) []byte {
	h := hmac.New(hashFor(alg), key)
	_, _ = h.Write(message)
	return h.Sum(nil)
}

// Hex returns the hex digest.
func Hex(alg Algorithm, key, message []byte) string {
	return hex.EncodeToString(Sum(alg, key, message))
}

// Verify reports whether mac equals HMAC(key, message).
func Verify(alg Algorithm, key, message, mac []byte) bool {
	expected := Sum(alg, key, message)
	return hmac.Equal(expected, mac)
}

func hashFor(alg Algorithm) func() hash.Hash {
	switch alg {
	case AlgSHA512:
		return sha512.New
	default:
		return sha256.New
	}
}

// DigestSize returns the byte size of the chosen algorithm's digest.
func DigestSize(alg Algorithm) int {
	switch alg {
	case AlgSHA512:
		return 64
	default:
		return 32
	}
}
