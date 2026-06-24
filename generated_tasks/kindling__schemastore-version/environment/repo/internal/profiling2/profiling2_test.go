package profiling2

import (
	"strings"
	"testing"
)

func TestTakeAndSnapshots(t *testing.T) {
	c := New(10)
	c.Take()
	c.Take()
	if len(c.Snapshots()) != 2 {
		t.Fatalf("got %d", len(c.Snapshots()))
	}
}

func TestSummariseEmpty(t *testing.T) {
	c := New(10)
	if c.Summarise().N != 0 {
		t.Fatal("expected zero")
	}
}

func TestSummarise(t *testing.T) {
	c := New(10)
	for i := 0; i < 3; i++ {
		c.Take()
	}
	s := c.Summarise()
	if s.N != 3 {
		t.Fatalf("got %d", s.N)
	}
}

func TestRetention(t *testing.T) {
	c := New(2)
	for i := 0; i < 5; i++ {
		c.Take()
	}
	if len(c.Snapshots()) != 2 {
		t.Fatalf("got %d", len(c.Snapshots()))
	}
}

func TestFormatHistogram(t *testing.T) {
	snaps := []Snapshot{{Goroutines: 1}, {Goroutines: 1}, {Goroutines: 2}}
	out := FormatHistogram(snaps)
	if !strings.Contains(out, "g=1") || !strings.Contains(out, "count=2") {
		t.Fatalf("got %s", out)
	}
}
