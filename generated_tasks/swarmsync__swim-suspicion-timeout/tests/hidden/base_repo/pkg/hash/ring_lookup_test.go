package hash

import (
	"testing"
)

func TestRing_LookupDeterministicAfterAddRemove(t *testing.T) {
	r := NewRing(10) // 10 virtual nodes per physical node
	r.Add("node-a")
	r.Add("node-b")
	r.Add("node-c")

	// Every key should map to one of our nodes
	keys := []string{"key1", "key2", "key3", "alpha", "beta", "gamma", "delta", "epsilon"}
	for _, k := range keys {
		node := r.Lookup(k)
		if node == "" {
			t.Errorf("Lookup(%q) returned empty string", k)
		}
		if node != "node-a" && node != "node-b" && node != "node-c" {
			t.Errorf("Lookup(%q) returned unknown node %q", k, node)
		}
	}
}

func TestRing_LookupNReturnsDistinctNodes(t *testing.T) {
	r := NewRing(50)
	r.Add("alpha")
	r.Add("beta")
	r.Add("gamma")

	nodes := r.LookupN("any-key", 3)
	if len(nodes) != 3 {
		t.Fatalf("LookupN(3) should return 3 nodes, got %d: %v", len(nodes), nodes)
	}
	seen := map[string]bool{}
	for _, n := range nodes {
		if seen[n] {
			t.Errorf("duplicate node %q in LookupN result", n)
		}
		seen[n] = true
	}
}

func TestRing_LookupConsistentMapping(t *testing.T) {
	r := NewRing(100)
	r.Add("n1")
	r.Add("n2")

	// Same key should always map to same node
	first := r.Lookup("stable-key")
	for i := 0; i < 10; i++ {
		got := r.Lookup("stable-key")
		if got != first {
			t.Errorf("Lookup should be deterministic, got %q then %q", first, got)
		}
	}
}
