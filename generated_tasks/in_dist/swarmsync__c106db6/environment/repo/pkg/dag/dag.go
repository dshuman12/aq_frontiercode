package dag

import (
	"errors"
	"sort"
	"sync"
)

var (
	ErrCycle    = errors.New("dag: cycle detected")
	ErrMissing = errors.New("dag: node not found")
)

// DAG is a directed acyclic graph for dependency tracking and causal ordering.
type DAG struct {
	mu       sync.RWMutex
	nodes    map[string]interface{}
	edges    map[string]map[string]bool
	inEdges  map[string]map[string]bool
}

// New creates an empty DAG.
func New() *DAG {
	return &DAG{nodes: make(map[string]interface{}), edges: make(map[string]map[string]bool), inEdges: make(map[string]map[string]bool)}
}

// AddNode adds a node with optional data.
func (d *DAG) AddNode(id string, data interface{}) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.nodes[id] = data
	if d.edges[id] == nil { d.edges[id] = make(map[string]bool) }
	if d.inEdges[id] == nil { d.inEdges[id] = make(map[string]bool) }
}

// AddEdge adds a directed edge from → to.
func (d *DAG) AddEdge(from, to string) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if _, ok := d.nodes[from]; !ok { return ErrMissing }
	if _, ok := d.nodes[to]; !ok { return ErrMissing }
	if d.wouldCycle(from, to) { return ErrCycle }
	d.edges[from][to] = true
	d.inEdges[to][from] = true
	return nil
}

// RemoveNode removes a node and all its edges.
func (d *DAG) RemoveNode(id string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	for to := range d.edges[id] { delete(d.inEdges[to], id) }
	for from := range d.inEdges[id] { delete(d.edges[from], id) }
	delete(d.nodes, id); delete(d.edges, id); delete(d.inEdges, id)
}

// RemoveEdge removes a directed edge.
func (d *DAG) RemoveEdge(from, to string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	delete(d.edges[from], to)
	delete(d.inEdges[to], from)
}

// HasNode checks if a node exists.
func (d *DAG) HasNode(id string) bool {
	d.mu.RLock(); defer d.mu.RUnlock()
	_, ok := d.nodes[id]; return ok
}

// HasEdge checks if an edge exists.
func (d *DAG) HasEdge(from, to string) bool {
	d.mu.RLock(); defer d.mu.RUnlock()
	return d.edges[from][to]
}

// NodeCount returns the number of nodes.
func (d *DAG) NodeCount() int { d.mu.RLock(); defer d.mu.RUnlock(); return len(d.nodes) }

// EdgeCount returns the number of edges.
func (d *DAG) EdgeCount() int {
	d.mu.RLock(); defer d.mu.RUnlock()
	count := 0
	for _, m := range d.edges { count += len(m) }
	return count
}

// Successors returns direct successors of a node.
func (d *DAG) Successors(id string) []string {
	d.mu.RLock(); defer d.mu.RUnlock()
	var result []string
	for to := range d.edges[id] { result = append(result, to) }
	sort.Strings(result); return result
}

// Predecessors returns direct predecessors of a node.
func (d *DAG) Predecessors(id string) []string {
	d.mu.RLock(); defer d.mu.RUnlock()
	var result []string
	for from := range d.inEdges[id] { result = append(result, from) }
	sort.Strings(result); return result
}

// Roots returns all nodes with no incoming edges.
func (d *DAG) Roots() []string {
	d.mu.RLock(); defer d.mu.RUnlock()
	var roots []string
	for id := range d.nodes {
		if len(d.inEdges[id]) == 0 { roots = append(roots, id) }
	}
	sort.Strings(roots); return roots
}

// Leaves returns all nodes with no outgoing edges.
func (d *DAG) Leaves() []string {
	d.mu.RLock(); defer d.mu.RUnlock()
	var leaves []string
	for id := range d.nodes {
		if len(d.edges[id]) == 0 { leaves = append(leaves, id) }
	}
	sort.Strings(leaves); return leaves
}

// TopologicalSort returns nodes in dependency order.
func (d *DAG) TopologicalSort() ([]string, error) {
	d.mu.RLock(); defer d.mu.RUnlock()
	inDeg := make(map[string]int)
	for id := range d.nodes { inDeg[id] = len(d.inEdges[id]) }
	var queue []string
	for id, deg := range inDeg {
		if deg == 0 { queue = append(queue, id) }
	}
	sort.Strings(queue)
	var result []string
	for len(queue) > 0 {
		node := queue[0]; queue = queue[1:]
		result = append(result, node)
		for to := range d.edges[node] {
			inDeg[to]--
			if inDeg[to] == 0 { queue = append(queue, to); sort.Strings(queue) }
		}
	}
	if len(result) != len(d.nodes) { return nil, ErrCycle }
	return result, nil
}

// Ancestors returns all transitive predecessors of a node.
func (d *DAG) Ancestors(id string) []string {
	d.mu.RLock(); defer d.mu.RUnlock()
	visited := make(map[string]bool)
	d.walkBack(id, visited)
	delete(visited, id)
	var result []string
	for v := range visited { result = append(result, v) }
	sort.Strings(result); return result
}

// Descendants returns all transitive successors of a node.
func (d *DAG) Descendants(id string) []string {
	d.mu.RLock(); defer d.mu.RUnlock()
	visited := make(map[string]bool)
	d.walkForward(id, visited)
	delete(visited, id)
	var result []string
	for v := range visited { result = append(result, v) }
	sort.Strings(result); return result
}

func (d *DAG) walkBack(id string, visited map[string]bool) {
	if visited[id] { return }
	visited[id] = true
	for from := range d.inEdges[id] { d.walkBack(from, visited) }
}

func (d *DAG) walkForward(id string, visited map[string]bool) {
	if visited[id] { return }
	visited[id] = true
	for to := range d.edges[id] { d.walkForward(to, visited) }
}

func (d *DAG) wouldCycle(from, to string) bool {
	if from == to { return true }
	visited := make(map[string]bool)
	return d.reachable(to, from, visited)
}

func (d *DAG) reachable(start, target string, visited map[string]bool) bool {
	if start == target { return true }
	if visited[start] { return false }
	visited[start] = true
	for next := range d.edges[start] {
		if d.reachable(next, target, visited) { return true }
	}
	return false
}
