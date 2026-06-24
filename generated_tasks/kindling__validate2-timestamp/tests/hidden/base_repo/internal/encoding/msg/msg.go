// Package msg implements a simple length-prefixed binary framing protocol.
//
// Each message is encoded as:
//
//	4 bytes big-endian length (excluding the 4-byte header)
//	1 byte  message-type tag
//	N bytes payload
//
// The framing is intended for log replay channels where readers need to
// recover from partial reads without losing message boundaries.
package msg

import (
	"encoding/binary"
	"errors"
	"fmt"
	"io"
)

// MaxLen caps a single message at 16 MiB to bound memory.
const MaxLen = 16 * 1024 * 1024

// Message is one decoded frame.
type Message struct {
	Tag     byte
	Payload []byte
}

// Writer writes framed messages to an io.Writer.
type Writer struct {
	w io.Writer
}

// NewWriter constructs a Writer.
func NewWriter(w io.Writer) *Writer { return &Writer{w: w} }

// Write emits one framed message.
func (w *Writer) Write(tag byte, payload []byte) error {
	if len(payload)+1 > MaxLen {
		return fmt.Errorf("msg: payload too large (%d)", len(payload))
	}
	var hdr [5]byte
	binary.BigEndian.PutUint32(hdr[:4], uint32(len(payload)+1))
	hdr[4] = tag
	if _, err := w.w.Write(hdr[:]); err != nil {
		return err
	}
	_, err := w.w.Write(payload)
	return err
}

// Reader reads framed messages from an io.Reader.
type Reader struct {
	r   io.Reader
	buf []byte
}

// NewReader constructs a Reader.
func NewReader(r io.Reader) *Reader { return &Reader{r: r} }

// Read returns the next message or io.EOF when the stream ends cleanly.
func (r *Reader) Read() (Message, error) {
	var hdr [4]byte
	if _, err := io.ReadFull(r.r, hdr[:]); err != nil {
		if err == io.ErrUnexpectedEOF {
			return Message{}, io.ErrUnexpectedEOF
		}
		return Message{}, err
	}
	n := binary.BigEndian.Uint32(hdr[:])
	if n == 0 {
		return Message{}, errors.New("msg: zero-length frame")
	}
	if n > MaxLen {
		return Message{}, fmt.Errorf("msg: oversize frame %d", n)
	}
	if cap(r.buf) < int(n) {
		r.buf = make([]byte, n)
	} else {
		r.buf = r.buf[:n]
	}
	if _, err := io.ReadFull(r.r, r.buf); err != nil {
		return Message{}, err
	}
	out := make([]byte, n-1)
	copy(out, r.buf[1:])
	return Message{Tag: r.buf[0], Payload: out}, nil
}

// CountFrames decodes and counts frames without allocating per-frame copies.
func CountFrames(r io.Reader) (int, error) {
	rr := NewReader(r)
	count := 0
	for {
		_, err := rr.Read()
		if err == io.EOF {
			return count, nil
		}
		if err != nil {
			return count, err
		}
		count++
	}
}
