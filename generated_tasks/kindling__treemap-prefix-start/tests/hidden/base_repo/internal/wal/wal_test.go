package wal

import (
	"os"
	"path/filepath"
	"testing"
)

func TestAppendScan(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "log")
	l, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 10; i++ {
		if _, err := l.Append([]byte{byte(i)}); err != nil {
			t.Fatal(err)
		}
	}
	if err := l.Close(); err != nil {
		t.Fatal(err)
	}
	got := []byte{}
	if err := Scan(path, func(r Record) error {
		got = append(got, r.Payload...)
		return nil
	}); err != nil {
		t.Fatal(err)
	}
	if len(got) != 10 {
		t.Fatalf("got %d", len(got))
	}
}

func TestReopenSeq(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "log")
	l, _ := Open(path)
	for i := 0; i < 5; i++ {
		_, _ = l.Append([]byte("x"))
	}
	_ = l.Close()
	l2, _ := Open(path)
	defer l2.Close()
	seq, err := l2.Append([]byte("y"))
	if err != nil {
		t.Fatal(err)
	}
	if seq != 6 {
		t.Fatalf("seq %d", seq)
	}
}

func TestCorruptTrailing(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "log")
	l, _ := Open(path)
	_, _ = l.Append([]byte("hi"))
	_ = l.Close()
	f, _ := os.OpenFile(path, os.O_WRONLY|os.O_APPEND, 0o644)
	_, _ = f.Write([]byte("garbage"))
	_ = f.Close()
	count := 0
	_ = Scan(path, func(Record) error { count++; return nil })
	if count != 1 {
		t.Fatalf("count %d", count)
	}
}
