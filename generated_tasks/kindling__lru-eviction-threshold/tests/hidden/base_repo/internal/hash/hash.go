// Package hash exposes a small set of stdlib hash helpers used by
// kindling for fingerprinting record fields.
package hash

import (
	"crypto/md5"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

// Algorithm enumerates the supported algorithms.
type Algorithm int

const (
	AlgMD5 Algorithm = iota
	AlgSHA1
	AlgSHA256
)

// ParseAlgorithm returns the matching Algorithm.
func ParseAlgorithm(s string) (Algorithm, error) {
	switch s {
	case "md5":
		return AlgMD5, nil
	case "sha1":
		return AlgSHA1, nil
	case "sha256":
		return AlgSHA256, nil
	}
	return 0, fmt.Errorf("hash: unknown algorithm %q", s)
}

// Hex returns the lowercase hex digest of data with the given algorithm.
func Hex(alg Algorithm, data []byte) string {
	switch alg {
	case AlgMD5:
		sum := md5.Sum(data)
		return hex.EncodeToString(sum[:])
	case AlgSHA1:
		sum := sha1.Sum(data)
		return hex.EncodeToString(sum[:])
	case AlgSHA256:
		sum := sha256.Sum256(data)
		return hex.EncodeToString(sum[:])
	default:
		return ""
	}
}

// Truncate returns the first n hex characters of digest.
func Truncate(digest string, n int) string {
	if n <= 0 || n >= len(digest) {
		return digest
	}
	return digest[:n]
}

// FieldFingerprint returns a short stable fingerprint over a list of
// fields (name + value pairs). Used by the dedup index.
func FieldFingerprint(alg Algorithm, fields map[string]string) string {
	keys := make([]string, 0, len(fields))
	for k := range fields {
		keys = append(keys, k)
	}
	for i := 1; i < len(keys); i++ {
		for j := i; j > 0 && keys[j-1] > keys[j]; j-- {
			keys[j-1], keys[j] = keys[j], keys[j-1]
		}
	}
	var buf []byte
	for _, k := range keys {
		buf = append(buf, k...)
		buf = append(buf, '=')
		buf = append(buf, fields[k]...)
		buf = append(buf, ';')
	}
	return Truncate(Hex(alg, buf), 12)
}
