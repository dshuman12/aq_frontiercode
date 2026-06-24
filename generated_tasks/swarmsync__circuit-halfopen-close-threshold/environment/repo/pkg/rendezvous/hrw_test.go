package rendezvous

import (
	"fmt"
	"testing"
)

func TestHRW_Lookup(t *testing.T) {
	h := New()
	h.Add("n1")
	h.Add("n2")
	h.Add("n3")
	node := h.Lookup("mykey")
	if node == "" {
		t.Fatal("should return a node")
	}
}

func TestHRW_Consistency(t *testing.T) {
	h := New()
	h.Add("n1")
	h.Add("n2")
	h.Add("n3")
	first := h.Lookup("key")
	for i := 0; i < 100; i++ {
		if h.Lookup("key") != first {
			t.Fatal("inconsistent")
		}
	}
}

func TestHRW_MinimalDisruption(t *testing.T) {
	h := New()
	h.Add("n1")
	h.Add("n2")
	before := make(map[string]string)
	keys := make([]string, 100)
	for i := range keys {
		keys[i] = fmt.Sprintf("k%d", i)
		before[keys[i]] = h.Lookup(keys[i])
	}
	h.Add("n3")
	moved := 0
	for _, k := range keys {
		if h.Lookup(k) != before[k] {
			moved++
		}
	}
	if moved == 0 {
		t.Fatal("some keys should move")
	}
	if moved > 60 {
		t.Fatalf("too many moved: %d", moved)
	}
}

func TestHRW_LookupN(t *testing.T) {
	h := New()
	h.Add("a")
	h.Add("b")
	h.Add("c")
	result := h.LookupN("key", 2)
	if len(result) != 2 {
		t.Fatal("should return 2")
	}
}

func TestHRW_Remove(t *testing.T) {
	h := New()
	h.Add("n1")
	h.Add("n2")
	h.Remove("n1")
	if h.Size() != 1 {
		t.Fatal("should have 1")
	}
	if h.Lookup("key") != "n2" {
		t.Fatal("should route to n2")
	}
}

func TestHRW_Distribution(t *testing.T) {
	h := New()
	h.Add("n1")
	h.Add("n2")
	h.Add("n3")
	keys := make([]string, 1000)
	for i := range keys {
		keys[i] = fmt.Sprintf("k%d", i)
	}
	dist := h.Distribution(keys)
	for _, count := range dist {
		if count < 200 || count > 500 {
			t.Fatalf("skewed: %v", dist)
		}
	}
}

func TestHRW_Empty(t *testing.T) {
	h := New()
	if h.Lookup("key") != "" {
		t.Fatal("empty should return empty")
	}
}

func TestHRW_DuplicateAdd(t *testing.T) {
	h := New()
	h.Add("n1")
	h.Add("n1")
	if h.Size() != 1 {
		t.Fatal("should deduplicate")
	}
}
