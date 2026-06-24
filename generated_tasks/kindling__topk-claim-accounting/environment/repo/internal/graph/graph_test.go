package graph

import (
	"strings"
	"testing"
)

func TestNodesEdges(t *testing.T) {
	g := New()
	g.AddEdge("a", "b")
	g.AddEdge("b", "c")
	if !g.HasEdge("a", "b") || g.HasEdge("c", "a") {
		t.Fatal("edges")
	}
	if len(g.Nodes()) != 3 {
		t.Fatalf("nodes %v", g.Nodes())
	}
}

func TestReachable(t *testing.T) {
	g := New()
	g.AddEdge("a", "b")
	g.AddEdge("b", "c")
	g.AddEdge("d", "e")
	r := g.Reachable("a")
	if len(r) != 3 {
		t.Fatalf("reachable %v", r)
	}
}

func TestTopoSort(t *testing.T) {
	g := New()
	g.AddEdge("a", "b")
	g.AddEdge("a", "c")
	g.AddEdge("b", "d")
	g.AddEdge("c", "d")
	order, err := g.TopoSort()
	if err != nil {
		t.Fatal(err)
	}
	idx := map[string]int{}
	for i, n := range order {
		idx[n] = i
	}
	if idx["a"] >= idx["b"] || idx["b"] >= idx["d"] || idx["c"] >= idx["d"] {
		t.Fatalf("bad order %v", order)
	}
}

func TestCycleDetected(t *testing.T) {
	g := New()
	g.AddEdge("a", "b")
	g.AddEdge("b", "c")
	g.AddEdge("c", "a")
	if _, err := g.TopoSort(); err != ErrCycle {
		t.Fatal("expected cycle")
	}
	cycle := g.FindCycle()
	if len(cycle) < 3 {
		t.Fatalf("cycle %v", cycle)
	}
}

func TestRender(t *testing.T) {
	g := New()
	g.AddEdge("a", "b")
	g.AddEdge("b", "c")
	out := g.Render()
	if !strings.Contains(out, "a -> b") {
		t.Fatalf("got %s", out)
	}
}

func TestPredecessors(t *testing.T) {
	g := New()
	g.AddEdge("a", "c")
	g.AddEdge("b", "c")
	pred := g.Predecessors("c")
	if len(pred) != 2 {
		t.Fatalf("got %v", pred)
	}
}
