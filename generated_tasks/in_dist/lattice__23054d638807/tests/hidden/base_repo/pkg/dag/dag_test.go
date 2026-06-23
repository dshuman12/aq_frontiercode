package dag

import (
	"errors"
	"reflect"
	"testing"

	"github.com/manojgowda/lattice/pkg/types"
)

// makeProject builds a *types.Project from a name -> deps map. Inputs and
// commands are stubbed out — we only care about the graph structure here.
func makeProject(t *testing.T, deps map[string][]string) *types.Project {
	t.Helper()
	tasks := make(map[string]*types.Task, len(deps))
	for name, d := range deps {
		tasks[name] = &types.Task{
			Name:    name,
			Deps:    append([]string(nil), d...),
			Command: "echo " + name,
		}
	}
	return &types.Project{
		Name:    "test",
		Version: "1",
		Tasks:   tasks,
		Root:    t.TempDir(),
	}
}

func TestBuild_Empty(t *testing.T) {
	graph, err := Build(&types.Project{Tasks: map[string]*types.Task{}})
	if err != nil {
		t.Fatalf("Build empty: unexpected err: %v", err)
	}
	if len(graph.Nodes) != 0 {
		t.Errorf("Build empty: expected 0 nodes, got %d", len(graph.Nodes))
	}
}

func TestBuild_Nil(t *testing.T) {
	if _, err := Build(nil); err == nil {
		t.Error("Build(nil) should error")
	}
}

func TestBuild_LinearChain(t *testing.T) {
	project := makeProject(t, map[string][]string{
		"a": nil,
		"b": {"a"},
		"c": {"b"},
	})
	graph, err := Build(project)
	if err != nil {
		t.Fatalf("Build: %v", err)
	}
	if len(graph.Nodes) != 3 {
		t.Errorf("expected 3 nodes, got %d", len(graph.Nodes))
	}
	if !reflect.DeepEqual(graph.Edges["b"], []string{"a"}) {
		t.Errorf("b deps = %v, want [a]", graph.Edges["b"])
	}
	if !reflect.DeepEqual(graph.Edges["c"], []string{"b"}) {
		t.Errorf("c deps = %v, want [b]", graph.Edges["c"])
	}
}

func TestBuild_UnknownDep(t *testing.T) {
	project := makeProject(t, map[string][]string{
		"a": {"ghost"},
	})
	_, err := Build(project)
	if err == nil {
		t.Fatal("Build with unknown dep: expected error")
	}
}

func TestBuild_DuplicateDeps_Tolerated(t *testing.T) {
	project := makeProject(t, map[string][]string{
		"a": nil,
		"b": {"a", "a", "a"},
	})
	graph, err := Build(project)
	if err != nil {
		t.Fatalf("Build duplicate deps: %v", err)
	}
	if len(graph.Edges["b"]) != 1 {
		t.Errorf("b deps after dedup = %v, want [a]", graph.Edges["b"])
	}
}

func TestDetectCycle_SelfLoop(t *testing.T) {
	project := makeProject(t, map[string][]string{
		"a": {"a"},
	})
	_, err := Build(project)
	var ce *types.CycleError
	if !errors.As(err, &ce) {
		t.Fatalf("expected *CycleError, got %T: %v", err, err)
	}
	if len(ce.Path) < 2 || ce.Path[0] != "a" || ce.Path[len(ce.Path)-1] != "a" {
		t.Errorf("self-loop cycle path = %v, want [a a]", ce.Path)
	}
}

func TestDetectCycle_Triangle(t *testing.T) {
	project := makeProject(t, map[string][]string{
		"a": {"b"},
		"b": {"c"},
		"c": {"a"},
	})
	_, err := Build(project)
	var ce *types.CycleError
	if !errors.As(err, &ce) {
		t.Fatalf("expected *CycleError, got %T: %v", err, err)
	}
	// The path should close on itself: first == last.
	if len(ce.Path) < 4 {
		t.Fatalf("cycle path too short: %v", ce.Path)
	}
	if ce.Path[0] != ce.Path[len(ce.Path)-1] {
		t.Errorf("cycle path doesn't close: %v", ce.Path)
	}
}

func TestDetectCycle_Diamond_NoCycle(t *testing.T) {
	// a depends on nothing; b and c both depend on a; d depends on both
	// b and c. Diamond shape, no cycle.
	project := makeProject(t, map[string][]string{
		"a": nil,
		"b": {"a"},
		"c": {"a"},
		"d": {"b", "c"},
	})
	if _, err := Build(project); err != nil {
		t.Fatalf("diamond unexpectedly reported cycle: %v", err)
	}
}

func TestTopoSort_LinearChain(t *testing.T) {
	graph := mustBuild(t, map[string][]string{
		"a": nil,
		"b": {"a"},
		"c": {"b"},
	})
	order, err := TopoSort(graph)
	if err != nil {
		t.Fatalf("TopoSort: %v", err)
	}
	want := []string{"a", "b", "c"}
	if !reflect.DeepEqual(order, want) {
		t.Errorf("topo order = %v, want %v", order, want)
	}
}

func TestTopoSort_DiamondAlphabetical(t *testing.T) {
	graph := mustBuild(t, map[string][]string{
		"a": nil,
		"b": {"a"},
		"c": {"a"},
		"d": {"b", "c"},
	})
	order, err := TopoSort(graph)
	if err != nil {
		t.Fatalf("TopoSort: %v", err)
	}
	// Within the b/c layer, alphabetical order is enforced.
	want := []string{"a", "b", "c", "d"}
	if !reflect.DeepEqual(order, want) {
		t.Errorf("topo order = %v, want %v", order, want)
	}
}

func TestLayers_Diamond(t *testing.T) {
	graph := mustBuild(t, map[string][]string{
		"a": nil,
		"b": {"a"},
		"c": {"a"},
		"d": {"b", "c"},
	})
	layers, err := Layers(graph)
	if err != nil {
		t.Fatalf("Layers: %v", err)
	}
	want := [][]string{
		{"a"},
		{"b", "c"},
		{"d"},
	}
	if !reflect.DeepEqual(layers, want) {
		t.Errorf("layers = %v, want %v", layers, want)
	}
}

func TestDownstream(t *testing.T) {
	graph := mustBuild(t, map[string][]string{
		"a": nil,
		"b": {"a"},
		"c": {"b"},
		"d": {"a"},
	})
	got := Downstream(graph, "a")
	want := []string{"b", "c", "d"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("downstream(a) = %v, want %v", got, want)
	}
}

func TestUpstream(t *testing.T) {
	graph := mustBuild(t, map[string][]string{
		"a": nil,
		"b": {"a"},
		"c": {"b"},
	})
	got := Upstream(graph, "c")
	want := []string{"a", "b"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("upstream(c) = %v, want %v", got, want)
	}
}

func TestReachableFrom_DisjointGraph(t *testing.T) {
	// Two disconnected subgraphs: (a -> b) and (x -> y).
	// ReachableFrom(b) should NOT include x or y.
	graph := mustBuild(t, map[string][]string{
		"a": nil,
		"b": {"a"},
		"x": nil,
		"y": {"x"},
	})
	got := ReachableFrom(graph, []string{"b"})
	want := []string{"a", "b"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("ReachableFrom(b) = %v, want %v (disjoint subgraph leaked?)", got, want)
	}
}

func TestRootsAndLeaves(t *testing.T) {
	graph := mustBuild(t, map[string][]string{
		"a": nil,
		"b": {"a"},
		"c": {"a"},
		"d": {"b", "c"},
	})
	if got := Roots(graph); !reflect.DeepEqual(got, []string{"d"}) {
		t.Errorf("Roots = %v, want [d]", got)
	}
	if got := Leaves(graph); !reflect.DeepEqual(got, []string{"a"}) {
		t.Errorf("Leaves = %v, want [a]", got)
	}
}

func TestEdgeCount(t *testing.T) {
	graph := mustBuild(t, map[string][]string{
		"a": nil,
		"b": {"a"},
		"c": {"a"},
		"d": {"b", "c"},
	})
	if EdgeCount(graph) != 4 {
		t.Errorf("EdgeCount = %d, want 4", EdgeCount(graph))
	}
}

func mustBuild(t *testing.T, deps map[string][]string) *types.Graph {
	t.Helper()
	graph, err := Build(makeProject(t, deps))
	if err != nil {
		t.Fatalf("mustBuild: %v", err)
	}
	return graph
}
