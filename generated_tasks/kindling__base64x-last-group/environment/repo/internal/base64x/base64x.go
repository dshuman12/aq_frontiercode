// Package base64x implements RFC 4648 base64 encoding.
package base64x

import "fmt"

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

// Encode returns the base64 encoding of input.
func Encode(input []byte) string {
	out := make([]byte, 0, ((len(input)+2)/3)*4)
	i := 0
	for ; i+3 < len(input); i += 3 {
		n := uint32(input[i])<<16 | uint32(input[i+1])<<8 | uint32(input[i+2])
		out = append(out, alphabet[(n>>18)&0x3f])
		out = append(out, alphabet[(n>>12)&0x3f])
		out = append(out, alphabet[(n>>6)&0x3f])
		out = append(out, alphabet[n&0x3f])
	}
	rem := len(input) - i
	if rem == 1 {
		n := uint32(input[i]) << 16
		out = append(out, alphabet[(n>>18)&0x3f])
		out = append(out, alphabet[(n>>12)&0x3f])
		out = append(out, '=', '=')
	} else if rem == 2 {
		n := uint32(input[i])<<16 | uint32(input[i+1])<<8
		out = append(out, alphabet[(n>>18)&0x3f])
		out = append(out, alphabet[(n>>12)&0x3f])
		out = append(out, alphabet[(n>>6)&0x3f])
		out = append(out, '=')
	}
	return string(out)
}

// Decode reverses Encode.
func Decode(s string) ([]byte, error) {
	if len(s)%4 != 0 {
		return nil, fmt.Errorf("base64x: bad length %d", len(s))
	}
	out := make([]byte, 0, len(s)/4*3)
	for i := 0; i < len(s); i += 4 {
		var n uint32
		pad := 0
		for k := 0; k < 4; k++ {
			ch := s[i+k]
			switch {
			case ch >= 'A' && ch <= 'Z':
				n = (n << 6) | uint32(ch-'A')
			case ch >= 'a' && ch <= 'z':
				n = (n << 6) | uint32(ch-'a'+26)
			case ch >= '0' && ch <= '9':
				n = (n << 6) | uint32(ch-'0'+52)
			case ch == '+':
				n = (n << 6) | 62
			case ch == '/':
				n = (n << 6) | 63
			case ch == '=':
				n = n << 6
				pad++
			default:
				return nil, fmt.Errorf("base64x: bad char %q at %d", ch, i+k)
			}
		}
		out = append(out, byte((n>>16)&0xff))
		if pad < 2 {
			out = append(out, byte((n>>8)&0xff))
		}
		if pad < 1 {
			out = append(out, byte(n&0xff))
		}
	}
	return out, nil
}
