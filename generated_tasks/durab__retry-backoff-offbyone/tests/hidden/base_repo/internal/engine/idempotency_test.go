package engine

import (
	"context"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/pkg/types"
)

func TestIdempotencyEmptyKeyIsNeverFound(t *testing.T) {
	c := NewIdempotencyCache(0)
	exec := types.Execution{WorkflowID: "w", RunID: "r"}
	c.Remember("ns", "w", "", exec)
	if _, ok := c.Lookup("ns", "w", ""); ok {
		t.Fatal("empty key should never hit")
	}
}

func TestIdempotencyRoundTrip(t *testing.T) {
	c := NewIdempotencyCache(time.Hour)
	exec := types.Execution{WorkflowID: "w", RunID: "r"}
	c.Remember("ns", "w", "k", exec)
	got, ok := c.Lookup("ns", "w", "k")
	if !ok || got != exec {
		t.Fatalf("lookup: %v %v", got, ok)
	}
}

func TestIdempotencyExpiry(t *testing.T) {
	c := NewIdempotencyCache(time.Second)
	now := time.Date(2025, 9, 24, 0, 0, 0, 0, time.UTC)
	c.clock = func() time.Time { return now }
	c.Remember("ns", "w", "k", types.Execution{WorkflowID: "w", RunID: "r"})
	now = now.Add(2 * time.Second)
	if _, ok := c.Lookup("ns", "w", "k"); ok {
		t.Fatal("entry should be expired")
	}
}

func TestIdempotencySweep(t *testing.T) {
	c := NewIdempotencyCache(time.Second)
	now := time.Date(2025, 9, 24, 0, 0, 0, 0, time.UTC)
	c.clock = func() time.Time { return now }
	c.Remember("ns", "w", "k", types.Execution{WorkflowID: "w", RunID: "r"})
	now = now.Add(2 * time.Second)
	c.Sweep(context.Background())
	if _, ok := c.entries[c.key("ns", "w", "k")]; ok {
		t.Fatal("entry should be swept")
	}
}

func TestIdempotencyKeyIsolation(t *testing.T) {
	c := NewIdempotencyCache(0)
	c.Remember("a", "w", "k", types.Execution{WorkflowID: "w", RunID: "1"})
	c.Remember("b", "w", "k", types.Execution{WorkflowID: "w", RunID: "2"})
	got, _ := c.Lookup("a", "w", "k")
	if got.RunID != "1" {
		t.Fatalf("got %v", got)
	}
	got, _ = c.Lookup("b", "w", "k")
	if got.RunID != "2" {
		t.Fatalf("got %v", got)
	}
}
