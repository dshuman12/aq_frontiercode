// Package wal implements a tiny write-ahead log used to durably stage
// pending index mutations.
//
// Each record is encoded as:
//
//	8 bytes big-endian sequence number
//	4 bytes big-endian length
//	N bytes payload
//	4 bytes CRC32 over (seq + len + payload)
//
// The log supports append, scan, and truncation by sequence. Records with
// invalid CRCs terminate scanning.
package wal

import (
	"bufio"
	"encoding/binary"
	"errors"
	"fmt"
	"hash/crc32"
	"io"
	"os"
	"sync"
)

// MaxRecord caps a single record at 8 MiB.
const MaxRecord = 8 * 1024 * 1024

// Record is one decoded entry.
type Record struct {
	Seq     uint64
	Payload []byte
}

// Log is an append-only WAL backed by a file.
type Log struct {
	mu   sync.Mutex
	f    *os.File
	w    *bufio.Writer
	last uint64
}

// Open opens or creates path.
func Open(path string) (*Log, error) {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0o644)
	if err != nil {
		return nil, err
	}
	l := &Log{f: f, w: bufio.NewWriter(f)}
	if err := l.recoverLastSeq(); err != nil {
		_ = f.Close()
		return nil, err
	}
	if _, err := l.f.Seek(0, io.SeekEnd); err != nil {
		_ = f.Close()
		return nil, err
	}
	return l, nil
}

func (l *Log) recoverLastSeq() error {
	if _, err := l.f.Seek(0, io.SeekStart); err != nil {
		return err
	}
	r := bufio.NewReader(l.f)
	for {
		rec, err := readRecord(r)
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return nil
		}
		l.last = rec.Seq
	}
}

// Append writes payload as a new record and returns the assigned sequence.
func (l *Log) Append(payload []byte) (uint64, error) {
	if len(payload) > MaxRecord {
		return 0, fmt.Errorf("wal: record too large (%d)", len(payload))
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	l.last++
	seq := l.last
	var hdr [12]byte
	binary.BigEndian.PutUint64(hdr[:8], seq)
	binary.BigEndian.PutUint32(hdr[8:12], uint32(len(payload)))
	if _, err := l.w.Write(hdr[:]); err != nil {
		return 0, err
	}
	if _, err := l.w.Write(payload); err != nil {
		return 0, err
	}
	h := crc32.NewIEEE()
	_, _ = h.Write(hdr[:])
	_, _ = h.Write(payload)
	var crc [4]byte
	binary.BigEndian.PutUint32(crc[:], h.Sum32())
	if _, err := l.w.Write(crc[:]); err != nil {
		return 0, err
	}
	return seq, nil
}

// Sync flushes to durable storage.
func (l *Log) Sync() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if err := l.w.Flush(); err != nil {
		return err
	}
	return l.f.Sync()
}

// Close flushes and closes the log.
func (l *Log) Close() error {
	if err := l.Sync(); err != nil {
		return err
	}
	return l.f.Close()
}

// Scan calls fn for every valid record, in order.
func Scan(path string, fn func(Record) error) error {
	f, err := os.Open(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}
	defer f.Close()
	r := bufio.NewReader(f)
	for {
		rec, err := readRecord(r)
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return nil
		}
		if err := fn(rec); err != nil {
			return err
		}
	}
}

func readRecord(r *bufio.Reader) (Record, error) {
	var hdr [12]byte
	if _, err := io.ReadFull(r, hdr[:]); err != nil {
		if err == io.EOF {
			return Record{}, io.EOF
		}
		return Record{}, err
	}
	seq := binary.BigEndian.Uint64(hdr[:8])
	n := binary.BigEndian.Uint32(hdr[8:12])
	if n > MaxRecord {
		return Record{}, fmt.Errorf("wal: oversize %d", n)
	}
	payload := make([]byte, n)
	if _, err := io.ReadFull(r, payload); err != nil {
		return Record{}, err
	}
	var crcBuf [4]byte
	if _, err := io.ReadFull(r, crcBuf[:]); err != nil {
		return Record{}, err
	}
	want := binary.BigEndian.Uint32(crcBuf[:])
	h := crc32.NewIEEE()
	_, _ = h.Write(hdr[:])
	_, _ = h.Write(payload)
	if h.Sum32() != want {
		return Record{}, errors.New("wal: crc mismatch")
	}
	return Record{Seq: seq, Payload: payload}, nil
}
