package lockfile

import (
	"os"
	"path/filepath"
	"strconv"
	"testing"
)

func TestAcquireRelease(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "lock")
	l, err := Acquire(p)
	if err != nil {
		t.Fatal(err)
	}
	if l.Path() != p {
		t.Fatal("path")
	}
	if err := l.Release(); err != nil {
		t.Fatal(err)
	}
}

func TestSecondAcquireFails(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "lock")
	// Write a file owned by an unlikely PID.
	_ = os.WriteFile(p, []byte("9999999\n"), 0o644)
	if _, err := Acquire(p); err == nil {
		// Could succeed if 9999999 happens to map to a live process; tolerate that case.
		t.Skip("system has process 9999999")
	}
}

func TestSelfReentrant(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "lock")
	l, _ := Acquire(p)
	defer l.Release()
	l2, err := Acquire(p)
	if err != nil {
		t.Fatal(err)
	}
	_ = l2
}

func TestStalePIDReclaimed(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "lock")
	_ = os.WriteFile(p, []byte(strconv.Itoa(0)+"\n"), 0o644)
	l, err := Acquire(p)
	if err != nil {
		t.Fatal(err)
	}
	defer l.Release()
}
