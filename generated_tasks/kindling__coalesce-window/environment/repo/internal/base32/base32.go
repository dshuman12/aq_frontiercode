// Package base32 implements RFC 4648 base32 encoding.
package base32

import "fmt"

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

// Encode returns the base32 encoding of input.
func Encode(input []byte) string {
	if len(input) == 0 {
		return ""
	}
	out := make([]byte, 0, ((len(input)+4)/5)*8)
	i := 0
	for ; i+5 <= len(input); i += 5 {
		writeBlock(input[i:i+5], 0, &out)
	}
	rem := len(input) - i
	if rem > 0 {
		var buf [5]byte
		copy(buf[:], input[i:])
		pad := 0
		switch rem {
		case 1:
			pad = 6
		case 2:
			pad = 4
		case 3:
			pad = 3
		case 4:
			pad = 1
		}
		writeBlock(buf[:], pad, &out)
	}
	return string(out)
}

// Decode reverses Encode.
func Decode(s string) ([]byte, error) {
	if len(s)%8 != 0 {
		return nil, fmt.Errorf("base32: bad length %d", len(s))
	}
	out := make([]byte, 0, len(s)/8*5)
	for i := 0; i < len(s); i += 8 {
		var n uint64
		pad := 0
		for k := 0; k < 8; k++ {
			ch := s[i+k]
			switch {
			case ch >= 'A' && ch <= 'Z':
				n = (n << 5) | uint64(ch-'A')
			case ch >= '2' && ch <= '7':
				n = (n << 5) | uint64(ch-'2'+26)
			case ch == '=':
				n = (n << 5)
				pad++
			default:
				return nil, fmt.Errorf("base32: bad char %q at %d", ch, i+k)
			}
		}
		take := 0
		switch pad {
		case 0:
			take = 5
		case 1:
			take = 4
		case 3:
			take = 3
		case 4:
			take = 2
		case 6:
			take = 1
		default:
			return nil, fmt.Errorf("base32: bad pad %d", pad)
		}
		for k := 0; k < take; k++ {
			out = append(out, byte((n>>(32-k*8))&0xff))
		}
	}
	return out, nil
}

func writeBlock(chunk []byte, pad int, out *[]byte) {
	n := uint64(chunk[0])<<32 | uint64(chunk[1])<<24 | uint64(chunk[2])<<16 |
		uint64(chunk[3])<<8 | uint64(chunk[4])
	chars := 8 - pad
	for i := 0; i < chars; i++ {
		shift := 5 * (7 - i)
		idx := (n >> shift) & 0x1f
		*out = append(*out, alphabet[idx])
	}
	for i := 0; i < pad; i++ {
		*out = append(*out, '=')
	}
}
