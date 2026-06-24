package mtime_test

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/mtime"
)

func TestOfMissing(t *testing.T) {
	if _, err := mtime.Of("/nonexistent/x"); err == nil {
		t.Error("expected error")
	}
}

func TestRoundTrip(t *testing.T) {
	d := t.TempDir()
	p := filepath.Join(d, "x")
	_ = os.WriteFile(p, nil, 0o644)
	want := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	if err := mtime.Set(p, want); err != nil {
		t.Fatal(err)
	}
	got, err := mtime.Of(p)
	if err != nil {
		t.Fatal(err)
	}
	if !got.Equal(want) {
		t.Errorf("got %v want %v", got, want)
	}
}

func TestIsOlderThan(t *testing.T) {
	d := t.TempDir()
	p := filepath.Join(d, "x")
	_ = os.WriteFile(p, nil, 0o644)
	mtime.Set(p, time.Now().Add(-2*time.Hour))
	old, err := mtime.IsOlderThan(p, time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	if !old {
		t.Error("expected old")
	}
}

func TestMissingOK(t *testing.T) {
	_, ok, err := mtime.MissingOK("/nonexistent/x")
	if err != nil || ok {
		t.Errorf("got ok=%v err=%v", ok, err)
	}
	d := t.TempDir()
	p := filepath.Join(d, "x")
	_ = os.WriteFile(p, nil, 0o644)
	_, ok, err = mtime.MissingOK(p)
	if !ok || err != nil {
		t.Errorf("got ok=%v err=%v", ok, err)
	}
}
