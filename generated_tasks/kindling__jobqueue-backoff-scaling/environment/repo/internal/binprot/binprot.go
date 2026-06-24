// Package binprot implements a small length-prefixed, tagged binary
// protocol used by kindling's replication channel.
//
// The on-the-wire encoding favours forward compatibility: each field is
// preceded by a varint tag (field number << 3 | wire-type) so unknown
// fields can be skipped without breaking older readers.
//
// Wire types:
//
//	0  varint
//	1  fixed64
//	2  length-delimited
//	5  fixed32
package binprot

import (
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"math"
)

// WireType is one of the four supported wire types.
type WireType uint8

const (
	WireVarint  WireType = 0
	WireFixed64 WireType = 1
	WireBytes   WireType = 2
	WireFixed32 WireType = 5
)

// MaxVarintLen64 caps a 64-bit varint at 10 bytes.
const MaxVarintLen64 = 10

// PutVarint writes v to buf, returning the number of bytes written.
func PutVarint(buf []byte, v uint64) int {
	n := 0
	for v >= 0x80 {
		buf[n] = byte(v) | 0x80
		v >>= 7
		n++
	}
	buf[n] = byte(v)
	return n + 1
}

// ReadVarint reads a varint from r.
func ReadVarint(r io.ByteReader) (uint64, int, error) {
	var x uint64
	var s uint
	for n := 0; n < MaxVarintLen64; n++ {
		b, err := r.ReadByte()
		if err != nil {
			return 0, n, err
		}
		if b < 0x80 {
			if n == MaxVarintLen64-1 && b > 1 {
				return 0, n, errors.New("binprot: varint overflow")
			}
			return x | uint64(b)<<s, n + 1, nil
		}
		x |= uint64(b&0x7F) << s
		s += 7
	}
	return 0, MaxVarintLen64, errors.New("binprot: varint too long")
}

// ZigZag encodes a signed int64 to an unsigned varint-friendly form.
func ZigZag(v int64) uint64 {
	return uint64((v << 1) ^ (v >> 63))
}

// UnZigZag reverses ZigZag.
func UnZigZag(v uint64) int64 {
	return int64((v >> 1) ^ -(v & 1))
}

// EncodeTag composes a tag from field number and wire type.
func EncodeTag(field int, wire WireType) uint64 {
	return uint64(field)<<3 | uint64(wire)
}

// DecodeTag splits a tag back into field number and wire type.
func DecodeTag(tag uint64) (int, WireType) {
	return int(tag >> 3), WireType(tag & 7)
}

// Writer composes binprot frames.
type Writer struct {
	w io.Writer
}

// NewWriter constructs a Writer.
func NewWriter(w io.Writer) *Writer { return &Writer{w: w} }

// PutTag writes a tag.
func (w *Writer) PutTag(field int, wt WireType) error {
	var buf [MaxVarintLen64]byte
	n := PutVarint(buf[:], EncodeTag(field, wt))
	_, err := w.w.Write(buf[:n])
	return err
}

// PutVarint writes a tag and varint value.
func (w *Writer) PutVarint(field int, v uint64) error {
	if err := w.PutTag(field, WireVarint); err != nil {
		return err
	}
	var buf [MaxVarintLen64]byte
	n := PutVarint(buf[:], v)
	_, err := w.w.Write(buf[:n])
	return err
}

// PutBytes writes a tagged byte slice.
func (w *Writer) PutBytes(field int, b []byte) error {
	if err := w.PutTag(field, WireBytes); err != nil {
		return err
	}
	var buf [MaxVarintLen64]byte
	n := PutVarint(buf[:], uint64(len(b)))
	if _, err := w.w.Write(buf[:n]); err != nil {
		return err
	}
	_, err := w.w.Write(b)
	return err
}

// PutString is convenience for PutBytes.
func (w *Writer) PutString(field int, s string) error { return w.PutBytes(field, []byte(s)) }

// PutFixed64 writes a fixed-width 64-bit value.
func (w *Writer) PutFixed64(field int, v uint64) error {
	if err := w.PutTag(field, WireFixed64); err != nil {
		return err
	}
	var buf [8]byte
	binary.LittleEndian.PutUint64(buf[:], v)
	_, err := w.w.Write(buf[:])
	return err
}

// PutFloat64 encodes a float64 as a fixed64.
func (w *Writer) PutFloat64(field int, v float64) error {
	return w.PutFixed64(field, math.Float64bits(v))
}

// Reader streams tagged values.
type Reader struct {
	r io.ByteReader
}

// NewReader constructs a Reader from any io.ByteReader.
func NewReader(r io.ByteReader) *Reader { return &Reader{r: r} }

// NextTag reads one tag.
func (r *Reader) NextTag() (int, WireType, error) {
	v, _, err := ReadVarint(r.r)
	if err != nil {
		return 0, 0, err
	}
	field, wt := DecodeTag(v)
	return field, wt, nil
}

// ReadVarint reads a varint following a varint-typed tag.
func (r *Reader) ReadVarint() (uint64, error) {
	v, _, err := ReadVarint(r.r)
	return v, err
}

// ReadBytes reads a length-delimited byte slice.
func (r *Reader) ReadBytes() ([]byte, error) {
	n, _, err := ReadVarint(r.r)
	if err != nil {
		return nil, err
	}
	if n > 1<<28 {
		return nil, fmt.Errorf("binprot: oversize length %d", n)
	}
	buf := make([]byte, n)
	for i := uint64(0); i < n; i++ {
		b, err := r.r.ReadByte()
		if err != nil {
			return nil, err
		}
		buf[i] = b
	}
	return buf, nil
}

// ReadFixed64 reads 8 little-endian bytes.
func (r *Reader) ReadFixed64() (uint64, error) {
	var v uint64
	for i := 0; i < 8; i++ {
		b, err := r.r.ReadByte()
		if err != nil {
			return 0, err
		}
		v |= uint64(b) << (8 * uint(i))
	}
	return v, nil
}

// ReadFloat64 reads a float64 from a fixed64.
func (r *Reader) ReadFloat64() (float64, error) {
	v, err := r.ReadFixed64()
	if err != nil {
		return 0, err
	}
	return math.Float64frombits(v), nil
}
