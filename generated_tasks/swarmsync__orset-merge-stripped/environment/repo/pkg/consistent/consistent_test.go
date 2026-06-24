package consistent

import (
	"fmt"
	"testing"
)

func TestBoundedLoad_Basic(t *testing.T) {
	h := NewBoundedLoadHash(100, 1.25)
	h.Add("n1")
	h.Add("n2")
	h.Add("n3")
	node := h.Get("mykey")
	if node == "" {
		t.Fatal("should return a node")
	}
}

func TestBoundedLoad_LoadBalancing(t *testing.T) {
	h := NewBoundedLoadHash(100, 1.5)
	h.Add("n1")
	h.Add("n2")
	h.Add("n3")
	for i := 0; i < 30; i++ {
		h.Get(fmt.Sprintf("key-%d", i))
	}
	for _, n := range []string{"n1", "n2", "n3"} {
		load := h.Load(n)
		if load == 0 {
			t.Fatalf("node %s has 0 load", n)
		}
		if load > 20 {
			t.Fatalf("node %s has too much load: %d", n, load)
		}
	}
}

func TestBoundedLoad_Release(t *testing.T) {
	h := NewBoundedLoadHash(100, 1.25)
	h.Add("n1")
	h.Get("k1")
	h.Release("n1")
	if h.Load("n1") != 0 {
		t.Fatal("load should be 0 after release")
	}
}

func TestBoundedLoad_Remove(t *testing.T) {
	h := NewBoundedLoadHash(100, 1.25)
	h.Add("n1")
	h.Add("n2")
	h.Remove("n1")
	if h.Size() != 1 {
		t.Fatal("should have 1 node")
	}
}

func TestBoundedLoad_TotalLoad(t *testing.T) {
	h := NewBoundedLoadHash(100, 1.25)
	h.Add("n1")
	h.Get("k1")
	h.Get("k2")
	if h.TotalLoad() != 2 {
		t.Fatalf("expected 2, got %d", h.TotalLoad())
	}
}

func TestBoundedLoad_Empty(t *testing.T) {
	h := NewBoundedLoadHash(100, 1.25)
	if h.Get("key") != "" {
		t.Fatal("empty should return empty")
	}
}
