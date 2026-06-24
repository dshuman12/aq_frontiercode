// Package graph implements a small directed graph with reachability and
// topological-sort helpers used to model the dependency relationships
// between kindling pipeline stages.
package graph

import (
	"errors"
	"fmt"
	"sort"
)

// Graph is a directed graph whose nodes are identified by string ids.
type Graph struct {
	nodes  map[string]struct{}
	out    map[string]map[string]struct{}
	in     map[string]map[string]struct{}
}

// New constructs an empty Graph.
func New() *Graph {
	return &Graph{
		nodes: map[string]struct{}{},
		out:   map[string]map[string]struct{}{},
		in:    map[string]map[string]struct{}{},
	}
}

// AddNode registers id (idempotent).
func (g *Graph) AddNode(id string) {
	if _, ok := g.nodes[id]; ok {
		return
	}
	g.nodes[id] = struct{}{}
	g.out[id] = map[string]struct{}{}
	g.in[id] = map[string]struct{}{}
}

// AddEdge registers a directed edge from -> to. AddNode is implied.
func (g *Graph) AddEdge(from, to string) {
	g.AddNode(from)
	g.AddNode(to)
	g.out[from][to] = struct{}{}
	g.in[to][from] = struct{}{}
}

// Nodes returns sorted node ids.
func (g *Graph) Nodes() []string {
	out := make([]string, 0, len(g.nodes))
	for n := range g.nodes {
		out = append(out, n)
	}
	sort.Strings(out)
	return out
}

// Successors returns the sorted out-neighbours of n.
func (g *Graph) Successors(n string) []string {
	return sortedKeys(g.out[n])
}

// Predecessors returns the sorted in-neighbours of n.
func (g *Graph) Predecessors(n string) []string {
	return sortedKeys(g.in[n])
}

// HasEdge reports whether from -> to exists.
func (g *Graph) HasEdge(from, to string) bool {
	_, ok := g.out[from][to]
	return ok
}

// Reachable returns all nodes reachable from start in BFS order.
func (g *Graph) Reachable(start string) []string {
	seen := map[string]struct{}{start: {}}
	queue := []string{start}
	var out []string
	for len(queue) > 0 {
		n := queue[0]
		queue = queue[1:]
		out = append(out, n)
		for _, succ := range g.Successors(n) {
			if _, ok := seen[succ]; ok {
				continue
			}
			seen[succ] = struct{}{}
			queue = append(queue, succ)
		}
	}
	return out
}

// TopoSort returns a topological order; ErrCycle is returned when the
// graph is not a DAG.
func (g *Graph) TopoSort() ([]string, error) {
	indeg := map[string]int{}
	for n := range g.nodes {
		indeg[n] = len(g.in[n])
	}
	var queue []string
	for n, d := range indeg {
		if d == 0 {
			queue = append(queue, n)
		}
	}
	sort.Strings(queue)
	var out []string
	for len(queue) > 0 {
		n := queue[0]
		queue = queue[1:]
		out = append(out, n)
		for _, succ := range g.Successors(n) {
			indeg[succ]--
			if indeg[succ] == 0 {
				queue = append(queue, succ)
				sort.Strings(queue)
			}
		}
	}
	if len(out) != len(g.nodes) {
		return nil, ErrCycle
	}
	return out, nil
}

// ErrCycle is returned by TopoSort when a cycle prevents ordering.
var ErrCycle = errors.New("graph: cycle detected")

// FindCycle returns one cycle when present, otherwise nil.
func (g *Graph) FindCycle() []string {
	colour := map[string]int{} // 0 white, 1 grey, 2 black
	var path []string
	var dfs func(n string) []string
	dfs = func(n string) []string {
		colour[n] = 1
		path = append(path, n)
		for _, succ := range g.Successors(n) {
			switch colour[succ] {
			case 1:
				start := 0
				for i, x := range path {
					if x == succ {
						start = i
						break
					}
				}
				return append(append([]string(nil), path[start:]...), succ)
			case 0:
				if c := dfs(succ); c != nil {
					return c
				}
			}
		}
		colour[n] = 2
		path = path[:len(path)-1]
		return nil
	}
	for _, n := range g.Nodes() {
		if colour[n] == 0 {
			if c := dfs(n); c != nil {
				return c
			}
		}
	}
	return nil
}

// Render returns a stable string of the graph in `from -> to` form.
func (g *Graph) Render() string {
	var lines []string
	for _, from := range g.Nodes() {
		for _, to := range g.Successors(from) {
			lines = append(lines, fmt.Sprintf("%s -> %s", from, to))
		}
	}
	return joinLines(lines)
}

func sortedKeys(m map[string]struct{}) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func joinLines(lines []string) string {
	out := ""
	for i, l := range lines {
		if i > 0 {
			out += "\n"
		}
		out += l
	}
	return out
}
