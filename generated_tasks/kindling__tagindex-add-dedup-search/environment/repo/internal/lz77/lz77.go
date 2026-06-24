// Package lz77 implements a tiny LZ77-inspired compressor used to shrink
// repeated log payloads before shipping them to a remote sink.
//
// The encoder emits a stream of two kinds of records:
//
//   - LITERAL: 0x00 followed by a length byte and `length` literal bytes.
//   - MATCH:   0x01 followed by two big-endian uint16s: distance, length.
//
// MATCH distance is at most 4096 bytes and length at most 64. The
// resulting format is decompressible without any tables, which keeps the
// reader code small. This is not a replacement for gzip; it shines on
// telemetry where the same field values repeat thousands of times.
package lz77

import (
	"encoding/binary"
	"errors"
	"io"
)

const (
	maxDistance = 4096
	maxLength   = 64
	minMatch    = 4
)

// Compress returns a compressed copy of src.
func Compress(src []byte) []byte {
	var dst []byte
	for i := 0; i < len(src); {
		dist, length := findMatch(src, i)
		if length >= minMatch {
			dst = append(dst, 0x01)
			var buf [4]byte
			binary.BigEndian.PutUint16(buf[:2], uint16(dist))
			binary.BigEndian.PutUint16(buf[2:], uint16(length))
			dst = append(dst, buf[:]...)
			i += length
			continue
		}
		// Greedy literal run, capped at 255.
		end := i + 1
		for end < len(src) && end-i < 255 {
			d, l := findMatch(src, end)
			if l >= minMatch {
				_ = d
				break
			}
			end++
		}
		dst = append(dst, 0x00, byte(end-i))
		dst = append(dst, src[i:end]...)
		i = end
	}
	return dst
}

func findMatch(src []byte, pos int) (dist, length int) {
	if pos+minMatch > len(src) {
		return 0, 0
	}
	start := pos - maxDistance
	if start < 0 {
		start = 0
	}
	bestDist, bestLen := 0, 0
	for k := start; k < pos; k++ {
		l := 0
		for l < maxLength && pos+l < len(src) && src[k+l] == src[pos+l] && k+l < pos {
			l++
		}
		if l > bestLen {
			bestLen = l
			bestDist = pos - k
		}
	}
	return bestDist, bestLen
}

// Decompress reverses Compress.
func Decompress(src []byte) ([]byte, error) {
	var dst []byte
	r := newSliceReader(src)
	for {
		tag, err := r.ReadByte()
		if err == io.EOF {
			return dst, nil
		}
		if err != nil {
			return nil, err
		}
		switch tag {
		case 0x00:
			n, err := r.ReadByte()
			if err != nil {
				return nil, err
			}
			payload, err := r.ReadN(int(n))
			if err != nil {
				return nil, err
			}
			dst = append(dst, payload...)
		case 0x01:
			head, err := r.ReadN(4)
			if err != nil {
				return nil, err
			}
			dist := int(binary.BigEndian.Uint16(head[:2]))
			length := int(binary.BigEndian.Uint16(head[2:]))
			if dist > len(dst) || dist == 0 {
				return nil, errors.New("lz77: bad distance")
			}
			start := len(dst) - dist
			for i := 0; i < length; i++ {
				dst = append(dst, dst[start+i])
			}
		default:
			return nil, errors.New("lz77: bad tag")
		}
	}
}

type sliceReader struct {
	data []byte
	pos  int
}

func newSliceReader(data []byte) *sliceReader { return &sliceReader{data: data} }

func (r *sliceReader) ReadByte() (byte, error) {
	if r.pos >= len(r.data) {
		return 0, io.EOF
	}
	b := r.data[r.pos]
	r.pos++
	return b, nil
}

func (r *sliceReader) ReadN(n int) ([]byte, error) {
	if r.pos+n > len(r.data) {
		return nil, io.ErrUnexpectedEOF
	}
	out := r.data[r.pos : r.pos+n]
	r.pos += n
	return out, nil
}
