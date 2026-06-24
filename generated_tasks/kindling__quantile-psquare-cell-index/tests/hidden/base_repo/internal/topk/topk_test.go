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
		t.Fatalf("snap %+v", snap)
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
	tk := New(3)
	tk.Observe("a")
	tk.Reset()
	if tk.Len() != 0 {
		t.Fatal("expected reset")
	}
}
