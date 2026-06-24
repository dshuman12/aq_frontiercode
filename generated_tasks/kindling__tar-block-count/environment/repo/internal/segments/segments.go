// Package segments reads and writes the on-disk segment files used by
// the kindling indexer.
//
// A segment file is a single-pass append of records, terminated by a
// fixed footer holding the count and a CRC32 over the payload. The
// format is intentionally trivial - segments are immutable once written
// and small enough to mmap whole.
package segments

import (
	"encoding/binary"
	"errors"
	"hash/crc32"
	"io"
	"os"
)

// Magic identifies a segment file.
const Magic uint32 = 0x4B53_4547 // "KSEG"

// Footer trails every segment.
type Footer struct {
	Count uint64
	CRC   uint32
}

// Writer streams records into a segment file.
type Writer struct {
	f      *os.File
	hash   crc32hasher
	count  uint64
	closed bool
}

type crc32hasher struct {
	sum uint32
}

func (h *crc32hasher) write(b []byte) {
	h.sum = crc32.Update(h.sum, crc32.IEEETable, b)
}

// Create opens path for writing and emits the magic header.
func Create(path string) (*Writer, error) {
	f, err := os.Create(path)
	if err != nil {
		return nil, err
	}
	w := &Writer{f: f}
	var hdr [4]byte
	binary.BigEndian.PutUint32(hdr[:], Magic)
	if _, err := f.Write(hdr[:]); err != nil {
		_ = f.Close()
		return nil, err
	}
	w.hash.write(hdr[:])
	return w, nil
}

// Append writes one record (length-prefixed).
func (w *Writer) Append(payload []byte) error {
	if w.closed {
		return errors.New("segments: writer closed")
	}
	var n [4]byte
	binary.BigEndian.PutUint32(n[:], uint32(len(payload)))
	if _, err := w.f.Write(n[:]); err != nil {
		return err
	}
	w.hash.write(n[:])
	if _, err := w.f.Write(payload); err != nil {
		return err
	}
	w.hash.write(payload)
	w.count++
	return nil
}

// Close finalises the segment by writing the footer.
func (w *Writer) Close() error {
	if w.closed {
		return nil
	}
	w.closed = true
	var foot [12]byte
	binary.BigEndian.PutUint64(foot[:8], w.count)
	binary.BigEndian.PutUint32(foot[8:12], w.hash.sum)
	if _, err := w.f.Write(foot[:]); err != nil {
		return err
	}
	if err := w.f.Sync(); err != nil {
		return err
	}
	return w.f.Close()
}

// Read reads all records from a segment, verifying the CRC.
func Read(path string) ([][]byte, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	if len(data) < 16 {
		return nil, errors.New("segments: file too small")
	}
	if binary.BigEndian.Uint32(data[:4]) != Magic {
		return nil, errors.New("segments: bad magic")
	}
	body := data[4 : len(data)-12]
	footer := data[len(data)-12:]
	count := binary.BigEndian.Uint64(footer[:8])
	wantCRC := binary.BigEndian.Uint32(footer[8:12])
	gotCRC := crc32.ChecksumIEEE(data[:len(data)-12])
	if gotCRC != wantCRC {
		return nil, errors.New("segments: crc mismatch")
	}
	out := make([][]byte, 0, count)
	r := newCursor(body)
	for r.remaining() > 0 {
		n, err := r.readUint32()
		if err != nil {
			return nil, err
		}
		buf, err := r.readN(int(n))
		if err != nil {
			return nil, err
		}
		out = append(out, buf)
	}
	if uint64(len(out)) != count {
		return nil, errors.New("segments: record count mismatch")
	}
	return out, nil
}

type cursor struct {
	data []byte
	pos  int
}

func newCursor(b []byte) *cursor { return &cursor{data: b} }

func (c *cursor) remaining() int { return len(c.data) - c.pos }

func (c *cursor) readUint32() (uint32, error) {
	if c.remaining() < 4 {
		return 0, io.ErrUnexpectedEOF
	}
	v := binary.BigEndian.Uint32(c.data[c.pos:])
	c.pos += 4
	return v, nil
}

func (c *cursor) readN(n int) ([]byte, error) {
	if c.remaining() < n {
		return nil, io.ErrUnexpectedEOF
	}
	out := make([]byte, n)
	copy(out, c.data[c.pos:])
	c.pos += n
	return out, nil
}
