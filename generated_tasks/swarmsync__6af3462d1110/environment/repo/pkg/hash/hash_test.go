package hash

import (
	"fmt"
	"math"
	"testing"
)

func TestRing_Empty(t *testing.T) {
	r := NewRing(10)
	if r.Size() != 0 {
		t.Fatal("expected empty ring")
	}
	if r.Lookup("key") != "" {
		t.Fatal("empty ring should return empty string")
	}
}

func TestRing_AddSingle(t *testing.T) {
	r := NewRing(10)
	r.Add("node-1")
	if r.Size() != 1 {
		t.Fatal("expected 1 node")
	}
	if r.Lookup("any-key") != "node-1" {
		t.Fatal("single node should own all keys")
	}
}

func TestRing_AddMultiple(t *testing.T) {
	r := NewRing(100)
	r.Add("n1")
	r.Add("n2")
	r.Add("n3")
	if r.Size() != 3 {
		t.Fatalf("expected 3 nodes, got %d", r.Size())
	}
}

func TestRing_AddDuplicate(t *testing.T) {
	r := NewRing(10)
	r.Add("n1")
	r.Add("n1")
	if r.Size() != 1 {
		t.Fatal("duplicate add should be idempotent")
	}
}

func TestRing_Remove(t *testing.T) {
	r := NewRing(10)
	r.Add("n1")
	r.Add("n2")
	r.Remove("n1")
	if r.Size() != 1 {
		t.Fatalf("expected 1 after remove, got %d", r.Size())
	}
	if r.Lookup("any-key") != "n2" {
		t.Fatal("remaining node should own all keys")
	}
}

func TestRing_RemoveMissing(t *testing.T) {
	r := NewRing(10)
	r.Remove("ghost") // should not panic
	if r.Size() != 0 {
		t.Fatal("removing non-existent node should be no-op")
	}
}

func TestRing_ConsistentLookup(t *testing.T) {
	r := NewRing(100)
	r.Add("n1")
	r.Add("n2")
	r.Add("n3")
	// Same key should always map to same node
	first := r.Lookup("my-key")
	for i := 0; i < 100; i++ {
		if r.Lookup("my-key") != first {
			t.Fatal("lookup should be consistent")
		}
	}
}

func TestRing_LookupN(t *testing.T) {
	r := NewRing(50)
	r.Add("n1")
	r.Add("n2")
	r.Add("n3")
	nodes := r.LookupN("key", 2)
	if len(nodes) != 2 {
		t.Fatalf("expected 2 nodes, got %d", len(nodes))
	}
	if nodes[0] == nodes[1] {
		t.Fatal("LookupN should return distinct nodes")
	}
}

func TestRing_LookupN_MoreThanAvailable(t *testing.T) {
	r := NewRing(50)
	r.Add("n1")
	r.Add("n2")
	nodes := r.LookupN("key", 10)
	if len(nodes) != 2 {
		t.Fatalf("expected 2 (capped), got %d", len(nodes))
	}
}

func TestRing_LookupN_Zero(t *testing.T) {
	r := NewRing(50)
	r.Add("n1")
	nodes := r.LookupN("key", 0)
	if len(nodes) != 0 {
		t.Fatal("expected empty for n=0")
	}
}

func TestRing_Members(t *testing.T) {
	r := NewRing(10)
	r.Add("c")
	r.Add("a")
	r.Add("b")
	m := r.Members()
	if len(m) != 3 || m[0] != "a" || m[1] != "b" || m[2] != "c" {
		t.Fatalf("expected sorted [a,b,c], got %v", m)
	}
}

func TestRing_VirtualNodeCount(t *testing.T) {
	r := NewRing(50)
	r.Add("n1")
	r.Add("n2")
	if r.VirtualNodeCount() != 100 {
		t.Fatalf("expected 100 virtual nodes, got %d", r.VirtualNodeCount())
	}
}

func TestRing_MinimalDisruption(t *testing.T) {
	r := NewRing(150)
	r.Add("n1")
	r.Add("n2")
	r.Add("n3")

	// Record assignments for 1000 keys
	keys := make([]string, 1000)
	before := make(map[string]string)
	for i := 0; i < 1000; i++ {
		k := fmt.Sprintf("key-%04d", i)
		keys[i] = k
		before[k] = r.Lookup(k)
	}

	// Add a 4th node
	r.Add("n4")

	// Count how many keys moved
	moved := 0
	for _, k := range keys {
		if r.Lookup(k) != before[k] {
			moved++
		}
	}

	// With 4 nodes, ideal redistribution moves ~25% of keys
	maxAcceptable := 400 // allow generous margin
	if moved > maxAcceptable {
		t.Fatalf("too many keys moved: %d (expected < %d)", moved, maxAcceptable)
	}
}

func TestRing_Distribution(t *testing.T) {
	r := NewRing(150)
	r.Add("n1")
	r.Add("n2")
	r.Add("n3")

	keys := make([]string, 3000)
	for i := range keys {
		keys[i] = fmt.Sprintf("key-%05d", i)
	}

	dist := r.Distribution(keys)
	if len(dist) != 3 {
		t.Fatalf("expected 3 nodes in distribution, got %d", len(dist))
	}

	// Each node should have roughly 1000 keys (±40%)
	for node, count := range dist {
		if count < 400 || count > 1600 {
			t.Fatalf("node %s has %d keys (expected ~1000)", node, count)
		}
	}
}

func TestRing_DistributionImproves(t *testing.T) {
	// More replicas → better distribution
	keys := make([]string, 10000)
	for i := range keys {
		keys[i] = fmt.Sprintf("k-%06d", i)
	}

	stddev := func(replicas int) float64 {
		r := NewRing(replicas)
		r.Add("a")
		r.Add("b")
		r.Add("c")
		dist := r.Distribution(keys)
		mean := float64(len(keys)) / 3.0
		var sumSq float64
		for _, c := range dist {
			diff := float64(c) - mean
			sumSq += diff * diff
		}
		return math.Sqrt(sumSq / 3.0)
	}

	low := stddev(10)
	high := stddev(500)
	if high >= low {
		t.Fatal("more replicas should improve distribution")
	}
}

func TestRing_KeysForNode(t *testing.T) {
	r := NewRing(50)
	r.Add("n1")
	r.Add("n2")

	keys := []string{"a", "b", "c", "d", "e"}
	n1Keys := r.KeysForNode("n1", keys)
	n2Keys := r.KeysForNode("n2", keys)

	if len(n1Keys)+len(n2Keys) != 5 {
		t.Fatal("all keys should be assigned to one of the two nodes")
	}
}

func TestRing_TransferKeys(t *testing.T) {
	r := NewRing(100)
	r.Add("n1")
	r.Add("n2")

	keys := make([]string, 100)
	for i := range keys {
		keys[i] = fmt.Sprintf("k%d", i)
	}

	transfers := r.TransferKeys("n3", keys)
	totalTransferred := 0
	for _, moved := range transfers {
		totalTransferred += len(moved)
	}
	if totalTransferred == 0 {
		t.Fatal("adding a node should transfer some keys")
	}
}

func TestRing_DefaultReplicas(t *testing.T) {
	r := NewRing(0) // should default to 1
	r.Add("n1")
	if r.VirtualNodeCount() != 1 {
		t.Fatalf("expected 1 virtual node with replicas=0, got %d", r.VirtualNodeCount())
	}
}