package dag

import "testing"

func TestDAG_AddNode(t *testing.T) {
	d := New()
	d.AddNode("a", nil)
	if !d.HasNode("a") {
		t.Fatal("should have a")
	}
	if d.NodeCount() != 1 {
		t.Fatal("wrong count")
	}
}

func TestDAG_AddEdge(t *testing.T) {
	d := New()
	d.AddNode("a", nil)
	d.AddNode("b", nil)
	if err := d.AddEdge("a", "b"); err != nil {
		t.Fatal(err)
	}
	if !d.HasEdge("a", "b") {
		t.Fatal("should have edge")
	}
}

func TestDAG_CycleDetection(t *testing.T) {
	d := New()
	d.AddNode("a", nil)
	d.AddNode("b", nil)
	d.AddNode("c", nil)
	d.AddEdge("a", "b")
	d.AddEdge("b", "c")
	err := d.AddEdge("c", "a")
	if err != ErrCycle {
		t.Fatal("should detect cycle")
	}
}

func TestDAG_SelfLoop(t *testing.T) {
	d := New()
	d.AddNode("a", nil)
	err := d.AddEdge("a", "a")
	if err != ErrCycle {
		t.Fatal("self-loop is a cycle")
	}
}

func TestDAG_TopologicalSort(t *testing.T) {
	d := New()
	d.AddNode("a", nil)
	d.AddNode("b", nil)
	d.AddNode("c", nil)
	d.AddEdge("a", "b")
	d.AddEdge("b", "c")
	order, err := d.TopologicalSort()
	if err != nil {
		t.Fatal(err)
	}
	if order[0] != "a" || order[1] != "b" || order[2] != "c" {
		t.Fatalf("wrong order: %v", order)
	}
}

func TestDAG_Roots(t *testing.T) {
	d := New()
	d.AddNode("a", nil)
	d.AddNode("b", nil)
	d.AddNode("c", nil)
	d.AddEdge("a", "c")
	d.AddEdge("b", "c")
	roots := d.Roots()
	if len(roots) != 2 {
		t.Fatalf("expected 2 roots, got %v", roots)
	}
}

func TestDAG_Leaves(t *testing.T) {
	d := New()
	d.AddNode("a", nil)
	d.AddNode("b", nil)
	d.AddEdge("a", "b")
	leaves := d.Leaves()
	if len(leaves) != 1 || leaves[0] != "b" {
		t.Fatal("b should be leaf")
	}
}

func TestDAG_Ancestors(t *testing.T) {
	d := New()
	d.AddNode("a", nil)
	d.AddNode("b", nil)
	d.AddNode("c", nil)
	d.AddEdge("a", "b")
	d.AddEdge("b", "c")
	anc := d.Ancestors("c")
	if len(anc) != 2 {
		t.Fatalf("expected 2 ancestors, got %v", anc)
	}
}

func TestDAG_Descendants(t *testing.T) {
	d := New()
	d.AddNode("a", nil)
	d.AddNode("b", nil)
	d.AddNode("c", nil)
	d.AddEdge("a", "b")
	d.AddEdge("a", "c")
	desc := d.Descendants("a")
	if len(desc) != 2 {
		t.Fatalf("expected 2 descendants, got %v", desc)
	}
}

func TestDAG_RemoveNode(t *testing.T) {
	d := New()
	d.AddNode("a", nil)
	d.AddNode("b", nil)
	d.AddEdge("a", "b")
	d.RemoveNode("a")
	if d.HasNode("a") {
		t.Fatal("should be removed")
	}
	if d.EdgeCount() != 0 {
		t.Fatal("edges should be cleaned")
	}
}

func TestDAG_Successors(t *testing.T) {
	d := New()
	d.AddNode("a", nil)
	d.AddNode("b", nil)
	d.AddNode("c", nil)
	d.AddEdge("a", "b")
	d.AddEdge("a", "c")
	s := d.Successors("a")
	if len(s) != 2 {
		t.Fatalf("expected 2, got %v", s)
	}
}

func TestDAG_Predecessors(t *testing.T) {
	d := New()
	d.AddNode("a", nil)
	d.AddNode("b", nil)
	d.AddNode("c", nil)
	d.AddEdge("a", "c")
	d.AddEdge("b", "c")
	p := d.Predecessors("c")
	if len(p) != 2 {
		t.Fatalf("expected 2, got %v", p)
	}
}

func TestDAG_MissingNode(t *testing.T) {
	d := New()
	d.AddNode("a", nil)
	err := d.AddEdge("a", "z")
	if err != ErrMissing {
		t.Fatal("should fail for missing")
	}
}
