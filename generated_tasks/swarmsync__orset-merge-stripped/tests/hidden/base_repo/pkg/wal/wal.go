package wal

import (
	"encoding/binary"
	"errors"
	"hash/crc32"
	"sync"
)

var (
	ErrCorrupted = errors.New("wal: corrupted entry")
	ErrClosed    = errors.New("wal: log is closed")
	ErrEmpty     = errors.New("wal: log is empty")
)

// EntryType identifies the kind of WAL entry.
type EntryType uint8

const (
	EntryPut    EntryType = 1
	EntryDelete EntryType = 2
	EntryCommit EntryType = 3
	EntryAbort  EntryType = 4
)

// Entry represents a single WAL record.
type Entry struct {
	LSN   uint64
	Type  EntryType
	Key   []byte
	Value []byte
	TxnID uint64
}

// Encode serializes an entry to bytes with CRC-32 integrity check.
func (e *Entry) Encode() []byte {
	keyLen := len(e.Key)
	valLen := len(e.Value)
	size := 8 + 1 + 8 + 4 + keyLen + 4 + valLen + 4
	buf := make([]byte, size)
	offset := 0
	binary.BigEndian.PutUint64(buf[offset:], e.LSN)
	offset += 8
	buf[offset] = byte(e.Type)
	offset++
	binary.BigEndian.PutUint64(buf[offset:], e.TxnID)
	offset += 8
	binary.BigEndian.PutUint32(buf[offset:], uint32(keyLen))
	offset += 4
	copy(buf[offset:], e.Key)
	offset += keyLen
	binary.BigEndian.PutUint32(buf[offset:], uint32(valLen))
	offset += 4
	copy(buf[offset:], e.Value)
	offset += valLen
	crc := crc32.ChecksumIEEE(buf[:offset])
	binary.BigEndian.PutUint32(buf[offset:], crc)
	return buf
}

// DecodeEntry deserializes bytes into an Entry.
func DecodeEntry(data []byte) (*Entry, error) {
	if len(data) < 29 {
		return nil, ErrCorrupted
	}
	offset := 0
	lsn := binary.BigEndian.Uint64(data[offset:])
	offset += 8
	typ := EntryType(data[offset])
	offset++
	txnID := binary.BigEndian.Uint64(data[offset:])
	offset += 8
	keyLen := int(binary.BigEndian.Uint32(data[offset:]))
	offset += 4
	if offset+keyLen+4 > len(data)-4 {
		return nil, ErrCorrupted
	}
	key := make([]byte, keyLen)
	copy(key, data[offset:])
	offset += keyLen
	valLen := int(binary.BigEndian.Uint32(data[offset:]))
	offset += 4
	if offset+valLen+4 > len(data) {
		return nil, ErrCorrupted
	}
	val := make([]byte, valLen)
	copy(val, data[offset:])
	offset += valLen
	expectedCRC := binary.BigEndian.Uint32(data[offset:])
	actualCRC := crc32.ChecksumIEEE(data[:offset])
	if expectedCRC != actualCRC {
		return nil, ErrCorrupted
	}
	return &Entry{LSN: lsn, Type: typ, Key: key, Value: val, TxnID: txnID}, nil
}

// Log is an in-memory write-ahead log with append, replay, and truncation.
type Log struct {
	mu      sync.Mutex
	entries []Entry
	nextLSN uint64
	closed  bool
}

// NewLog creates an empty WAL.
func NewLog() *Log { return &Log{nextLSN: 1} }

// Append adds an entry to the log and returns its LSN.
func (l *Log) Append(typ EntryType, key, value []byte, txnID uint64) (uint64, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.closed {
		return 0, ErrClosed
	}
	lsn := l.nextLSN
	l.nextLSN++
	e := Entry{LSN: lsn, Type: typ, Key: cp(key), Value: cp(value), TxnID: txnID}
	l.entries = append(l.entries, e)
	return lsn, nil
}

// Replay returns all entries from the given LSN onwards.
func (l *Log) Replay(fromLSN uint64) []Entry {
	l.mu.Lock()
	defer l.mu.Unlock()
	var result []Entry
	for _, e := range l.entries {
		if e.LSN >= fromLSN {
			result = append(result, e)
		}
	}
	return result
}

// Truncate removes all entries with LSN <= maxLSN.
func (l *Log) Truncate(maxLSN uint64) int {
	l.mu.Lock()
	defer l.mu.Unlock()
	n := 0
	for n < len(l.entries) && l.entries[n].LSN <= maxLSN {
		n++
	}
	l.entries = l.entries[n:]
	return n
}

// Len returns the number of entries.
func (l *Log) Len() int { l.mu.Lock(); defer l.mu.Unlock(); return len(l.entries) }

// LastLSN returns the LSN of the most recent entry.
func (l *Log) LastLSN() uint64 { l.mu.Lock(); defer l.mu.Unlock(); return l.nextLSN - 1 }

// Close marks the log as closed.
func (l *Log) Close() { l.mu.Lock(); defer l.mu.Unlock(); l.closed = true }

// IsClosed returns true if the log is closed.
func (l *Log) IsClosed() bool { l.mu.Lock(); defer l.mu.Unlock(); return l.closed }

func cp(b []byte) []byte {
	if b == nil {
		return nil
	}
	c := make([]byte, len(b))
	copy(c, b)
	return c
}
