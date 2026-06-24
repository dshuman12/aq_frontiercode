// Package hexx is a tiny lowercase hex encoder/decoder. Mirrors the
// stdlib but lives separately so the encoding is documented as part
// of the kindling manifest format.
package hexx

import "fmt"

const lowerHex = "0123456789abcdef"

// Encode returns the lowercase hex encoding of data.
func Encode(data []byte) string {
	out := make([]byte, len(data)*2)
	for i, b := range data {
		out[i*2] = lowerHex[b>>4]
		out[i*2+1] = lowerHex[b&0x0f]
	}
	return string(out)
}

// Decode returns the bytes for the lowercase hex string s.
func Decode(s string) ([]byte, error) {
	if len(s)%2 != 0 {
		return nil, fmt.Errorf("hexx: odd length %d", len(s))
	}
	out := make([]byte, len(s)/2)
	for i := 0; i < len(s); i += 2 {
		hi, ok := hexDigit(s[i])
		if !ok {
			return nil, fmt.Errorf("hexx: bad hi nibble at %d (%q)", i, s[i])
		}
		lo, ok := hexDigit(s[i+1])
		if !ok {
			return nil, fmt.Errorf("hexx: bad lo nibble at %d (%q)", i+1, s[i+1])
		}
		out[i/2] = (hi << 4) | lo
	}
	return out, nil
}

func hexDigit(b byte) (byte, bool) {
	switch {
	case b >= '0' && b <= '9':
		return b - '0', true
	case b >= 'a' && b <= 'f':
		return b - 'a' + 10, true
	case b >= 'A' && b <= 'F':
		return b - 'A' + 10, true
	}
	return 0, false
}

// Equal reports whether two hex strings decode to the same bytes.
func Equal(a, b string) bool {
	ab, err := Decode(a)
	if err != nil {
		return false
	}
	bb, err := Decode(b)
	if err != nil {
		return false
	}
	if len(ab) != len(bb) {
		return false
	}
	for i := range ab {
		if ab[i] != bb[i] {
			return false
		}
	}
	return true
}
