package partitioner

import "testing"

func TestModuloDeterministic(t *testing.T) {
	m := NewModulo(8)
	a := m.Assign("user-1")
	b := m.Assign("user-1")
	if a != b {
		t.Fatal("not deterministic")
	}
	if a < 0 || a >= 8 {
		t.Fatalf("out of range %d", a)
	}
}

func TestConsistent(t *testing.T) {
	c := NewConsistent(64)
	c.AddNode("a")
	c.AddNode("b")
	c.AddNode("c")
	if c.Partitions() != 3 {
		t.Fatal("partitions")
	}
	if c.Assign("k") < 0 {
		t.Fatal("expected assignment")
	}
}

func TestConsistentRebalanceMostlyStable(t *testing.T) {
	c := NewConsistent(128)
	c.AddNode("a")
	c.AddNode("b")
	c.AddNode("c")
	before := map[string]int{}
	for i := 0; i < 200; i++ {
		key := "k" + itoa(i)
		before[key] = c.Assign(key)
	}
	c.AddNode("d")
	moved := 0
	for k, was := range before {
		if c.Assign(k) != was {
			moved++
		}
	}
	if moved >= 200 {
		t.Fatalf("too much movement: %d", moved)
	}
}

func TestEmptyConsistent(t *testing.T) {
	c := NewConsistent(8)
	if c.Assign("x") != -1 {
		t.Fatal("expected -1 for empty")
	}
}

func TestRemoveNode(t *testing.T) {
	c := NewConsistent(32)
	c.AddNode("a")
	c.AddNode("b")
	c.RemoveNode("a")
	if c.Partitions() != 1 {
		t.Fatalf("partitions %d", c.Partitions())
	}
}
