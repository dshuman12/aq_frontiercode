// Package json2 is a small streaming JSON encoder + decoder used in
// kindling's high-throughput export path.
//
// Compared with encoding/json the implementation:
//
//   - Allocates one buffer per Encoder rather than once per Marshal call.
//   - Skips reflection for the common map[string]any / []any cases.
//   - Decodes via a token stream so the consumer can short-circuit on
//     bad input without materialising a full document.
//
// It is intentionally narrower than encoding/json (no struct tags, no
// custom Marshalers, no number-as-string mode); callers that want those
// continue to use the standard library.
package json2

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"
	"unicode/utf16"
	"unicode/utf8"
)

// TokenKind tags one decoded token.
type TokenKind int

const (
	TokInvalid TokenKind = iota
	TokObjectBegin
	TokObjectEnd
	TokArrayBegin
	TokArrayEnd
	TokKey
	TokString
	TokNumber
	TokBool
	TokNull
)

// Token is one item from the decoder.
type Token struct {
	Kind TokenKind
	Str  string
	Num  float64
	Bool bool
}

// Decoder streams tokens from r.
type Decoder struct {
	r          *bufio.Reader
	stack      []byte // 'o' or 'a'
	expectKey  bool
	expectComma bool
}

// NewDecoder constructs a Decoder.
func NewDecoder(r io.Reader) *Decoder {
	return &Decoder{r: bufio.NewReader(r)}
}

// Next returns the next token or io.EOF.
func (d *Decoder) Next() (Token, error) {
	if err := d.skipWS(); err != nil {
		return Token{}, err
	}
	c, err := d.r.ReadByte()
	if err != nil {
		return Token{}, err
	}
	if d.expectComma {
		switch c {
		case ',':
			d.expectComma = false
			if d.top() == 'o' {
				d.expectKey = true
			}
			if err := d.skipWS(); err != nil {
				return Token{}, err
			}
			c, err = d.r.ReadByte()
			if err != nil {
				return Token{}, err
			}
		case '}', ']':
			d.expectComma = false
			return d.handleClose(c)
		default:
			return Token{}, fmt.Errorf("json2: expected , or close, got %q", c)
		}
	}
	if c == '}' || c == ']' {
		return d.handleClose(c)
	}
	switch c {
	case '{':
		d.stack = append(d.stack, 'o')
		d.expectKey = true
		return Token{Kind: TokObjectBegin}, nil
	case '[':
		d.stack = append(d.stack, 'a')
		return Token{Kind: TokArrayBegin}, nil
	case '"':
		s, err := d.readStringRest()
		if err != nil {
			return Token{}, err
		}
		if d.expectKey {
			d.expectKey = false
			if err := d.skipWS(); err != nil {
				return Token{}, err
			}
			colon, err := d.r.ReadByte()
			if err != nil {
				return Token{}, err
			}
			if colon != ':' {
				return Token{}, fmt.Errorf("json2: expected : after key, got %q", colon)
			}
			return Token{Kind: TokKey, Str: s}, nil
		}
		d.expectComma = true
		return Token{Kind: TokString, Str: s}, nil
	case 't':
		if err := d.expect("rue"); err != nil {
			return Token{}, err
		}
		d.expectComma = true
		return Token{Kind: TokBool, Bool: true}, nil
	case 'f':
		if err := d.expect("alse"); err != nil {
			return Token{}, err
		}
		d.expectComma = true
		return Token{Kind: TokBool, Bool: false}, nil
	case 'n':
		if err := d.expect("ull"); err != nil {
			return Token{}, err
		}
		d.expectComma = true
		return Token{Kind: TokNull}, nil
	}
	if c == '-' || (c >= '0' && c <= '9') {
		_ = d.r.UnreadByte()
		n, err := d.readNumber()
		if err != nil {
			return Token{}, err
		}
		d.expectComma = true
		return Token{Kind: TokNumber, Num: n}, nil
	}
	return Token{}, fmt.Errorf("json2: unexpected byte %q", c)
}

func (d *Decoder) handleClose(c byte) (Token, error) {
	if len(d.stack) == 0 {
		return Token{}, errors.New("json2: unexpected close")
	}
	top := d.stack[len(d.stack)-1]
	if (c == '}' && top != 'o') || (c == ']' && top != 'a') {
		return Token{}, errors.New("json2: mismatched close")
	}
	d.stack = d.stack[:len(d.stack)-1]
	d.expectKey = false
	d.expectComma = len(d.stack) > 0
	if c == '}' {
		return Token{Kind: TokObjectEnd}, nil
	}
	return Token{Kind: TokArrayEnd}, nil
}

func (d *Decoder) top() byte {
	if len(d.stack) == 0 {
		return 0
	}
	return d.stack[len(d.stack)-1]
}

func (d *Decoder) skipWS() error {
	for {
		b, err := d.r.ReadByte()
		if err != nil {
			return err
		}
		if b == ' ' || b == '\t' || b == '\n' || b == '\r' {
			continue
		}
		return d.r.UnreadByte()
	}
}

func (d *Decoder) expect(want string) error {
	for i := 0; i < len(want); i++ {
		b, err := d.r.ReadByte()
		if err != nil {
			return err
		}
		if b != want[i] {
			return fmt.Errorf("json2: expected %q got %q", want[i], b)
		}
	}
	return nil
}

func (d *Decoder) readStringRest() (string, error) {
	var b strings.Builder
	for {
		c, err := d.r.ReadByte()
		if err != nil {
			return "", err
		}
		if c == '"' {
			return b.String(), nil
		}
		if c == '\\' {
			esc, err := d.r.ReadByte()
			if err != nil {
				return "", err
			}
			switch esc {
			case 'n':
				b.WriteByte('\n')
			case 't':
				b.WriteByte('\t')
			case 'r':
				b.WriteByte('\r')
			case 'b':
				b.WriteByte('\b')
			case 'f':
				b.WriteByte('\f')
			case '"':
				b.WriteByte('"')
			case '\\':
				b.WriteByte('\\')
			case '/':
				b.WriteByte('/')
			case 'u':
				var hex [4]byte
				if _, err := io.ReadFull(d.r, hex[:]); err != nil {
					return "", err
				}
				v, err := strconv.ParseUint(string(hex[:]), 16, 32)
				if err != nil {
					return "", err
				}
				r := rune(v)
				if utf16.IsSurrogate(r) {
					var pair [6]byte
					if _, err := io.ReadFull(d.r, pair[:]); err != nil {
						return "", err
					}
					if pair[0] != '\\' || pair[1] != 'u' {
						return "", errors.New("json2: bad surrogate pair")
					}
					v2, err := strconv.ParseUint(string(pair[2:6]), 16, 32)
					if err != nil {
						return "", err
					}
					r = utf16.DecodeRune(r, rune(v2))
				}
				var buf [4]byte
				n := utf8.EncodeRune(buf[:], r)
				b.Write(buf[:n])
			default:
				return "", fmt.Errorf("json2: bad escape %q", esc)
			}
			continue
		}
		b.WriteByte(c)
	}
}

func (d *Decoder) readNumber() (float64, error) {
	var b strings.Builder
	for {
		c, err := d.r.ReadByte()
		if err == io.EOF {
			break
		}
		if err != nil {
			return 0, err
		}
		switch {
		case (c >= '0' && c <= '9') || c == '.' || c == '-' || c == '+' || c == 'e' || c == 'E':
			b.WriteByte(c)
		default:
			_ = d.r.UnreadByte()
			return strconv.ParseFloat(b.String(), 64)
		}
	}
	return strconv.ParseFloat(b.String(), 64)
}

// Encoder streams JSON output.
type Encoder struct {
	w *bufio.Writer
}

// NewEncoder constructs an Encoder.
func NewEncoder(w io.Writer) *Encoder { return &Encoder{w: bufio.NewWriter(w)} }

// Flush flushes pending writes.
func (e *Encoder) Flush() error { return e.w.Flush() }

// EncodeAny encodes a generic value.
func (e *Encoder) EncodeAny(v any) error {
	switch x := v.(type) {
	case nil:
		_, err := e.w.WriteString("null")
		return err
	case bool:
		if x {
			_, err := e.w.WriteString("true")
			return err
		}
		_, err := e.w.WriteString("false")
		return err
	case string:
		return e.encodeString(x)
	case float64:
		_, err := e.w.WriteString(strconv.FormatFloat(x, 'g', -1, 64))
		return err
	case int:
		_, err := e.w.WriteString(strconv.Itoa(x))
		return err
	case int64:
		_, err := e.w.WriteString(strconv.FormatInt(x, 10))
		return err
	case uint64:
		_, err := e.w.WriteString(strconv.FormatUint(x, 10))
		return err
	case []any:
		if err := e.w.WriteByte('['); err != nil {
			return err
		}
		for i, item := range x {
			if i > 0 {
				if err := e.w.WriteByte(','); err != nil {
					return err
				}
			}
			if err := e.EncodeAny(item); err != nil {
				return err
			}
		}
		return e.w.WriteByte(']')
	case map[string]any:
		if err := e.w.WriteByte('{'); err != nil {
			return err
		}
		keys := make([]string, 0, len(x))
		for k := range x {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for i, k := range keys {
			if i > 0 {
				if err := e.w.WriteByte(','); err != nil {
					return err
				}
			}
			if err := e.encodeString(k); err != nil {
				return err
			}
			if err := e.w.WriteByte(':'); err != nil {
				return err
			}
			if err := e.EncodeAny(x[k]); err != nil {
				return err
			}
		}
		return e.w.WriteByte('}')
	}
	return fmt.Errorf("json2: unsupported type %T", v)
}

func (e *Encoder) encodeString(s string) error {
	if err := e.w.WriteByte('"'); err != nil {
		return err
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch c {
		case '"':
			if _, err := e.w.WriteString(`\"`); err != nil {
				return err
			}
		case '\\':
			if _, err := e.w.WriteString(`\\`); err != nil {
				return err
			}
		case '\n':
			if _, err := e.w.WriteString(`\n`); err != nil {
				return err
			}
		case '\r':
			if _, err := e.w.WriteString(`\r`); err != nil {
				return err
			}
		case '\t':
			if _, err := e.w.WriteString(`\t`); err != nil {
				return err
			}
		default:
			if c < 0x20 {
				if _, err := fmt.Fprintf(e.w, `\u%04x`, c); err != nil {
					return err
				}
				continue
			}
			if err := e.w.WriteByte(c); err != nil {
				return err
			}
		}
	}
	return e.w.WriteByte('"')
}
