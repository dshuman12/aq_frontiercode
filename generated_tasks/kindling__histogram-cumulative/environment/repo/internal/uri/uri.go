// Package uri implements percent encoding/decoding for URLs.
package uri

import "fmt"

// PercentEncode encodes bytes that are not URL-unreserved.
func PercentEncode(input []byte) string {
	out := make([]byte, 0, len(input))
	for _, b := range input {
		if isUnreserved(b) {
			out = append(out, b)
			continue
		}
		out = append(out, '%')
		out = append(out, hex(b>>4))
		out = append(out, hex(b&0x0f))
	}
	return string(out)
}

// PercentDecode reverses PercentEncode.
func PercentDecode(s string) ([]byte, error) {
	out := make([]byte, 0, len(s))
	for i := 0; i < len(s); {
		ch := s[i]
		if ch == '%' {
			if i+2 >= len(s) {
				return nil, fmt.Errorf("uri: short escape at %d", i)
			}
			hi, err := dehex(s[i+1])
			if err != nil {
				return nil, err
			}
			lo, err := dehex(s[i+2])
			if err != nil {
				return nil, err
			}
			out = append(out, (hi<<4)|lo)
			i += 3
			continue
		}
		out = append(out, ch)
		i++
	}
	return out, nil
}

func isUnreserved(b byte) bool {
	return (b >= 'A' && b <= 'Z') ||
		(b >= 'a' && b <= 'z') ||
		(b >= '0' && b <= '9') ||
		b == '-' || b == '_' || b == '.' || b == '~'
}

func hex(b byte) byte {
	if b < 10 {
		return '0' + b
	}
	return 'A' + b - 10
}

func dehex(b byte) (byte, error) {
	switch {
	case b >= '0' && b <= '9':
		return b - '0', nil
	case b >= 'A' && b <= 'F':
		return b - 'A' + 10, nil
	case b >= 'a' && b <= 'f':
		return b - 'a' + 10, nil
	}
	return 0, fmt.Errorf("uri: bad hex %q", b)
}
