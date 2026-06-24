package atomic_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/dleblanc/kindling/internal/atomic"
)

func TestWriteAndRead(t *testing.T) {
	d := t.TempDir()
	p := filepath.Join(d, "x.txt")
	if err := atomic.WriteFile(p, []byte("hi"), 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(p)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != "hi" {
		t.Errorf("got %q", got)
	}
}

func TestAppend(t *testing.T) {
	d := t.TempDir()
	p := filepath.Join(d, "x.log")
	atomic.AppendFile(p, []byte("a\n"), 0o644)
	atomic.AppendFile(p, []byte("b\n"), 0o644)
	got, _ := os.ReadFile(p)
	if string(got) != "a\nb\n" {
		t.Errorf("got %q", got)
	}
}

func TestEnsureDirIdempotent(t *testing.T) {
	d := filepath.Join(t.TempDir(), "a", "b", "c")
	if err := atomic.EnsureDir(d, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := atomic.EnsureDir(d, 0o755); err != nil {
		t.Fatal(err)
	}
	if !atomic.IsDir(d) {
		t.Error("not a directory")
	}
}

func TestRemoveTreeIgnoresMissing(t *testing.T) {
	if err := atomic.RemoveTree("/nonexistent/x"); err != nil {
		t.Errorf("got %v", err)
	}
}

func TestExistsAndFileSize(t *testing.T) {
	d := t.TempDir()
	p := filepath.Join(d, "x")
	if atomic.Exists(p) {
		t.Error("should not exist yet")
	}
	atomic.WriteFile(p, []byte("hello"), 0o644)
	if !atomic.Exists(p) {
		t.Error("should exist")
	}
	if atomic.FileSize(p) != 5 {
		t.Errorf("got %d", atomic.FileSize(p))
	}
}
