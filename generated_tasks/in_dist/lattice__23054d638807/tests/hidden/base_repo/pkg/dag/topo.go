package dag

import (
	"fmt"
	"sort"

	"github.com/manojgowda/lattice/pkg/types"
)

// TopoSort returns the graph's tasks in topological order using Kahn's
// algorithm. The order is "deps first": a task always appears after all
// of its transitive dependencies.
//
// Within a single layer (a set of tasks with all dependencies already
// satisfied) the output is sorted alphabetically so callers see stable
// output across runs. The scheduler runs each layer in parallel, so the
// intra-layer order doesn't affect execution time, only error messages
// and dry-run prints.
//
// TopoSort assumes Build has already been called, so the graph is
// cycle-free. If a cycle is somehow present, TopoSort returns an error
// rather than looping forever.
func TopoSort(graph *types.Graph) ([]string, error) {
	if graph == nil {
		return nil, fmt.Errorf("dag.TopoSort: graph is nil")
	}
	if len(graph.Nodes) == 0 {
		return nil, nil
	}

	// In-degree = number of dependencies of each node. We invert
	// graph.Edges (which maps node -> deps) into a "consumed by" map
	// so we can decrement in-degrees efficiently as we process.
	inDegree := make(map[string]int, len(graph.Nodes))
	consumedBy := make(map[string][]string, len(graph.Nodes))

	for name := range graph.Nodes {
		inDegree[name] = 0
	}
	for name, deps := range graph.Edges {
		inDegree[name] += len(deps)
		for _, dep := range deps {
			consumedBy[dep] = append(consumedBy[dep], name)
		}
	}

	// Seed the queue with every zero-in-degree node, sorted for
	// determinism.
	var ready []string
	for name, deg := range inDegree {
		if deg == 0 {
			ready = append(ready, name)
		}
	}
	sort.Strings(ready)

	out := make([]string, 0, len(graph.Nodes))
	for len(ready) > 0 {
		// Pop the alphabetically first ready node.
		next := ready[0]
		ready = ready[1:]
		out = append(out, next)

		// Decrement in-degree of every consumer of `next`. Newly-zero
		// consumers join the ready set in sorted order.
		newReady := make([]string, 0)
		for _, consumer := range consumedBy[next] {
			inDegree[consumer]--
			if inDegree[consumer] == 0 {
				newReady = append(newReady, consumer)
			}
		}
		if len(newReady) > 0 {
			ready = append(ready, newReady...)
			sort.Strings(ready)
		}
	}

	if len(out) != len(graph.Nodes) {
		// We didn't process every node, which means there's a cycle
		// Build missed (or the graph was mutated post-Build). Construct
		// a partial-cycle hint from the unprocessed nodes.
		var stuck []string
		for name, deg := range inDegree {
			if deg > 0 {
				stuck = append(stuck, name)
			}
		}
		sort.Strings(stuck)
		return nil, fmt.Errorf("dag.TopoSort: %d task(s) not reachable in topological order, likely cycle: %v", len(stuck), stuck)
	}

	return out, nil
}

// Layers groups TopoSort's output into parallel-execution layers. Layer N
// can run concurrently because every dependency of every task in layer N
// has finished in layers 0..N-1.
//
// Returned layers are alphabetically sorted within each layer.
func Layers(graph *types.Graph) ([][]string, error) {
	if graph == nil {
		return nil, fmt.Errorf("dag.Layers: graph is nil")
	}
	if len(graph.Nodes) == 0 {
		return nil, nil
	}

	// Layer assignment: a task's layer = max(layer of its deps) + 1.
	// Tasks with no deps are layer 0.
	layer := make(map[string]int, len(graph.Nodes))

	order, err := TopoSort(graph)
	if err != nil {
		return nil, err
	}
	for _, name := range order {
		max := -1
		for _, dep := range graph.Edges[name] {
			if layer[dep] > max {
				max = layer[dep]
			}
		}
		layer[name] = max + 1
	}

	// Find max layer index and bucket.
	maxLayer := -1
	for _, l := range layer {
		if l > maxLayer {
			maxLayer = l
		}
	}
	if maxLayer < 0 {
		return nil, nil
	}
	out := make([][]string, maxLayer+1)
	for name, l := range layer {
		out[l] = append(out[l], name)
	}
	for i := range out {
		sort.Strings(out[i])
	}
	return out, nil
}
