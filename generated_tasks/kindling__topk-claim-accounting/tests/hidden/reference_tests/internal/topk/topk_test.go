package topk

import (
	"strings"
	"testing"
)

func TestExact(t *testing.T) {
	tk := New(3)
	for _, c := range strings.Repeat("a", 10) + strings.Repeat("b", 5) + strings.Repeat("c", 3) + strings.Repeat("d", 2) {
		tk.Observe(string(c))
	}
	snap := tk.Snapshot()
	if snap[0].Key != "a" || snap[0].Count != 10 {
		t.Fatalf("top key/count = %s/%d", snap[0].Key, snap[0].Count)
	}
}

func TestEviction(t *testing.T) {
	tk := New(2)
	for _, c := range "aabbccddee" {
		tk.Observe(string(c))
	}
	if tk.Len() != 2 {
		t.Fatalf("len %d", tk.Len())
	}
}

func TestObserveN(t *testing.T) {
	tk := New(3)
	tk.ObserveN("x", 100)
	tk.ObserveN("y", 50)
	snap := tk.Snapshot()
	if snap[0].Key != "x" {
		t.Fatalf("got %s", snap[0].Key)
	}
}

func TestReset(t *testing.T) {
	tk := New(2)
	tk.Observe("a")
	tk.Reset()
	if tk.Len() != 0 {
		t.Fatalf("len after reset %d", tk.Len())
	}
}

func topkCount(snap []Item, key string) (uint64, bool) {
	for _, it := range snap {
		if it.Key == key {
			return it.Count, true
		}
	}
	return 0, false
}

// TestClaimInheritsAndAdds verifies the Space-Saving claim accounting: when a
// full table evicts its minimum slot to admit a new key, the new key's counter
// must be the evicted minimum PLUS the weight of the current observation, and
// its inherited baseline must equal the old minimum so LowerBound is exact.
func TestClaimInheritsAndAdds(t *testing.T) {
	tk := New(2)
	tk.ObserveN("x", 5) // x=5
	tk.ObserveN("y", 3) // x=5, y=3 (table full)
	tk.ObserveN("z", 2) // evicts y (min=3); z must be 3+2=5, inherit=3
	snap := tk.Snapshot()
	zc, ok := topkCount(snap, "z")
	if !ok {
		t.Fatal("z should be resident after evicting the minimum slot")
	}
	if zc != 5 {
		t.Fatalf("z count = %d, want 5 (evicted min 3 + observation weight 2)", zc)
	}
	for _, it := range snap {
		if it.Key == "z" && it.LowerBound() != 2 {
			t.Fatalf("z LowerBound = %d, want 2", it.LowerBound())
		}
	}
}

// TestClaimAccumulatesOverStream checks the n=1 eviction path accumulates
// correctly so a late heavy hitter's count keeps growing instead of resetting
// to the bare inherited value on each claim.
func TestClaimAccumulatesOverStream(t *testing.T) {
	tk := New(2)
	for _, c := range "aabbcdcd" {
		tk.Observe(string(c))
	}
	snap := tk.Snapshot()
	if snap[0].Count < 3 {
		t.Fatalf("top count = %d, want >= 3 (slot claims must add the observation, not reset)", snap[0].Count)
	}
}
