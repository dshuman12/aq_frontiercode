// Package bencode2 implements a streaming bencode encoder and decoder.
//
// Bencode is the encoding used by .torrent files; values are integers,
// byte strings, lists or dictionaries. This implementation differs from
// the simpler internal/bencode package in that it supports streaming
// reads and writes and exposes a token-based API similar to encoding/json.
package bencode2

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"sort"
	"strconv"
)

// Kind tags the type of a token.
type Kind int

const (
	KindInvalid Kind = iota
	KindInt
	KindBytes
	KindListBegin
	KindListEnd
	KindDictBegin
	KindDictEnd
	KindEOF
)

// Token is one item from the decoder.
type Token struct {
	Kind  Kind
	Int   int64
	Bytes []byte
}

// Decoder streams bencode tokens from an io.Reader.
type Decoder struct {
	r        *bufio.Reader
	stack    []byte // 'l' for list, 'd' for dict
	depth    int
	maxDepth int
}

// NewDecoder constructs a Decoder.
func NewDecoder(r io.Reader) *Decoder {
	return &Decoder{r: bufio.NewReader(r), maxDepth: 64}
}

// SetMaxDepth caps nesting depth (default 64).
func (d *Decoder) SetMaxDepth(n int) { d.maxDepth = n }

// Next returns the next token or io.EOF when the stream is exhausted.
func (d *Decoder) Next() (Token, error) {
	c, err := d.r.ReadByte()
	if err == io.EOF {
		if d.depth != 0 {
			return Token{}, errors.New("bencode2: unexpected EOF inside container")
		}
		return Token{Kind: KindEOF}, io.EOF
	}
	if err != nil {
		return Token{}, err
	}
	switch {
	case c == 'i':
		n, err := d.readIntUntil('e')
		if err != nil {
			return Token{}, err
		}
		return Token{Kind: KindInt, Int: n}, nil
	case c >= '0' && c <= '9':
		_ = d.r.UnreadByte()
		n, err := d.readIntUntil(':')
		if err != nil {
			return Token{}, err
		}
		if n < 0 {
			return Token{}, errors.New("bencode2: negative byte length")
		}
		buf := make([]byte, n)
		if _, err := io.ReadFull(d.r, buf); err != nil {
			return Token{}, err
		}
		return Token{Kind: KindBytes, Bytes: buf}, nil
	case c == 'l':
		if err := d.push('l'); err != nil {
			return Token{}, err
		}
		return Token{Kind: KindListBegin}, nil
	case c == 'd':
		if err := d.push('d'); err != nil {
			return Token{}, err
		}
		return Token{Kind: KindDictBegin}, nil
	case c == 'e':
		if d.depth == 0 {
			return Token{}, errors.New("bencode2: stray end marker")
		}
		top := d.stack[d.depth-1]
		d.depth--
		d.stack = d.stack[:d.depth]
		if top == 'l' {
			return Token{Kind: KindListEnd}, nil
		}
		return Token{Kind: KindDictEnd}, nil
	default:
		return Token{}, fmt.Errorf("bencode2: unexpected byte %q", c)
	}
}

func (d *Decoder) push(c byte) error {
	if d.depth >= d.maxDepth {
		return errors.New("bencode2: max depth exceeded")
	}
	d.stack = append(d.stack, c)
	d.depth++
	return nil
}

func (d *Decoder) readIntUntil(term byte) (int64, error) {
	var buf [24]byte
	n := 0
	for {
		b, err := d.r.ReadByte()
		if err != nil {
			return 0, err
		}
		if b == term {
			break
		}
		if n >= len(buf) {
			return 0, errors.New("bencode2: integer too long")
		}
		buf[n] = b
		n++
	}
	if n == 0 {
		return 0, errors.New("bencode2: empty integer")
	}
	v, err := strconv.ParseInt(string(buf[:n]), 10, 64)
	if err != nil {
		return 0, fmt.Errorf("bencode2: parse int: %w", err)
	}
	return v, nil
}

// Encoder writes bencode to an io.Writer.
type Encoder struct {
	w *bufio.Writer
}

// NewEncoder constructs an Encoder.
func NewEncoder(w io.Writer) *Encoder { return &Encoder{w: bufio.NewWriter(w)} }

// Flush flushes buffered bytes.
func (e *Encoder) Flush() error { return e.w.Flush() }

// EncodeInt writes an integer.
func (e *Encoder) EncodeInt(v int64) error {
	if err := e.w.WriteByte('i'); err != nil {
		return err
	}
	if _, err := e.w.WriteString(strconv.FormatInt(v, 10)); err != nil {
		return err
	}
	return e.w.WriteByte('e')
}

// EncodeBytes writes a byte string.
func (e *Encoder) EncodeBytes(b []byte) error {
	if _, err := e.w.WriteString(strconv.Itoa(len(b))); err != nil {
		return err
	}
	if err := e.w.WriteByte(':'); err != nil {
		return err
	}
	_, err := e.w.Write(b)
	return err
}

// EncodeString writes a string.
func (e *Encoder) EncodeString(s string) error { return e.EncodeBytes([]byte(s)) }

// EncodeList writes a list whose elements are produced by fn.
func (e *Encoder) EncodeList(fn func(*Encoder) error) error {
	if err := e.w.WriteByte('l'); err != nil {
		return err
	}
	if err := fn(e); err != nil {
		return err
	}
	return e.w.WriteByte('e')
}

// EncodeDict writes a dictionary using a stable-sorted sequence of keys.
func (e *Encoder) EncodeDict(entries map[string]func(*Encoder) error) error {
	if err := e.w.WriteByte('d'); err != nil {
		return err
	}
	keys := make([]string, 0, len(entries))
	for k := range entries {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		if err := e.EncodeString(k); err != nil {
			return err
		}
		if err := entries[k](e); err != nil {
			return err
		}
	}
	return e.w.WriteByte('e')
}
