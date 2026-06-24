package wal

import "testing"

func TestLog_Append(t *testing.T) {
	l := NewLog()
	lsn, err := l.Append(EntryPut, []byte("k"), []byte("v"), 1)
	if err != nil {
		t.Fatal(err)
	}
	if lsn != 1 {
		t.Fatalf("expected LSN 1, got %d", lsn)
	}
	if l.Len() != 1 {
		t.Fatal("expected 1 entry")
	}
}

func TestLog_Replay(t *testing.T) {
	l := NewLog()
	l.Append(EntryPut, []byte("k1"), []byte("v1"), 1)
	l.Append(EntryPut, []byte("k2"), []byte("v2"), 1)
	l.Append(EntryCommit, nil, nil, 1)
	entries := l.Replay(1)
	if len(entries) != 3 {
		t.Fatalf("expected 3, got %d", len(entries))
	}
}

func TestLog_ReplayFrom(t *testing.T) {
	l := NewLog()
	l.Append(EntryPut, []byte("k1"), []byte("v1"), 1)
	l.Append(EntryPut, []byte("k2"), []byte("v2"), 1)
	entries := l.Replay(2)
	if len(entries) != 1 {
		t.Fatalf("expected 1, got %d", len(entries))
	}
}

func TestLog_Truncate(t *testing.T) {
	l := NewLog()
	l.Append(EntryPut, []byte("k1"), []byte("v1"), 1)
	l.Append(EntryPut, []byte("k2"), []byte("v2"), 1)
	l.Append(EntryPut, []byte("k3"), []byte("v3"), 1)
	removed := l.Truncate(2)
	if removed != 2 {
		t.Fatalf("expected 2 removed, got %d", removed)
	}
	if l.Len() != 1 {
		t.Fatalf("expected 1 remaining, got %d", l.Len())
	}
}

func TestLog_Close(t *testing.T) {
	l := NewLog()
	l.Close()
	_, err := l.Append(EntryPut, []byte("k"), []byte("v"), 1)
	if err != ErrClosed {
		t.Fatal("should be closed")
	}
}

func TestLog_LastLSN(t *testing.T) {
	l := NewLog()
	l.Append(EntryPut, nil, nil, 0)
	l.Append(EntryPut, nil, nil, 0)
	if l.LastLSN() != 2 {
		t.Fatalf("expected 2, got %d", l.LastLSN())
	}
}

func TestEntry_EncodeDecode(t *testing.T) {
	e := &Entry{LSN: 42, Type: EntryPut, Key: []byte("hello"), Value: []byte("world"), TxnID: 7}
	data := e.Encode()
	decoded, err := DecodeEntry(data)
	if err != nil {
		t.Fatal(err)
	}
	if decoded.LSN != 42 {
		t.Fatal("LSN mismatch")
	}
	if string(decoded.Key) != "hello" {
		t.Fatal("key mismatch")
	}
	if string(decoded.Value) != "world" {
		t.Fatal("value mismatch")
	}
	if decoded.TxnID != 7 {
		t.Fatal("txnID mismatch")
	}
}

func TestEntry_DecodeCorrupt(t *testing.T) {
	e := &Entry{LSN: 1, Type: EntryPut, Key: []byte("k"), Value: []byte("v"), TxnID: 0}
	data := e.Encode()
	data[len(data)-1] ^= 0xFF
	_, err := DecodeEntry(data)
	if err != ErrCorrupted {
		t.Fatal("should detect corruption")
	}
}

func TestLog_IsClosed(t *testing.T) {
	l := NewLog()
	if l.IsClosed() {
		t.Fatal("should not be closed")
	}
	l.Close()
	if !l.IsClosed() {
		t.Fatal("should be closed")
	}
}
