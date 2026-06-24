package retentionplan

import (
	"testing"
	"time"
)

func files() []File {
	now := time.Now()
	return []File{
		{Path: "a", Size: 100, Mtime: now.Add(-72 * time.Hour), Label: "x"},
		{Path: "b", Size: 200, Mtime: now.Add(-24 * time.Hour), Label: "x"},
		{Path: "c", Size: 300, Mtime: now.Add(-1 * time.Hour), Label: "y"},
		{Path: "d", Size: 400, Mtime: now.Add(-1 * time.Hour), Label: "y"},
		{Path: "e", Size: 500, Mtime: now.Add(-1 * time.Hour), Label: "y"},
	}
}

func TestMaxAge(t *testing.T) {
	now := time.Now()
	a := Plan(files(), Policy{MaxAge: 48 * time.Hour}, now)
	if len(a) != 1 || a[0].File.Path != "a" {
		t.Fatalf("got %+v", a)
	}
}

func TestMaxBytes(t *testing.T) {
	now := time.Now()
	// Sum is 1500. Cap to 800. Should drop the oldest until sum <= 800.
	a := Plan(files(), Policy{MaxBytes: 800}, now)
	if len(a) < 1 {
		t.Fatalf("expected at least one drop, got %v", a)
	}
}

func TestPerLabel(t *testing.T) {
	now := time.Now()
	a := Plan(files(), Policy{PerLabel: 2}, now)
	if len(a) != 1 {
		t.Fatalf("expected 1 drop, got %d", len(a))
	}
}

func TestSurvivors(t *testing.T) {
	now := time.Now()
	a := Plan(files(), Policy{MaxAge: 48 * time.Hour}, now)
	survivors := Survivors(files(), a)
	if len(survivors) != 4 {
		t.Fatalf("got %d", len(survivors))
	}
}

func TestEstimateBytes(t *testing.T) {
	a := []Action{{File: File{Size: 100}}, {File: File{Size: 250}}}
	if EstimateBytesFreed(a) != 350 {
		t.Fatalf("got %d", EstimateBytesFreed(a))
	}
}

func TestEmpty(t *testing.T) {
	if Plan(nil, Policy{}, time.Now()) != nil {
		t.Fatal("expected nil")
	}
}
