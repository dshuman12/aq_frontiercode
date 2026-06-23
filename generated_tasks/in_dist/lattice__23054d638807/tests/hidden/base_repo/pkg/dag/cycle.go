package dag

import (
	"github.com/manojgowda/lattice/pkg/types"
)

// nodeColor is the classic three-color marking used by DFS-based cycle
// detection. White means unvisited, grey means on the current DFS stack
// (a back-edge to a grey node is a cycle), black means fully processed.
type nodeColor uint8

const (
	colorWhite nodeColor = iota
	colorGrey
	colorBlack
)

// DetectCycle walks the graph with a DFS three-color marker. On the first
// back-edge it encounters it reconstructs the cycle path and returns a
// *types.CycleError. The returned cycle is in traversal order and repeats
// the start node at the end so callers can render it directly.
//
// A self-loop (task A depends on A) is treated as a one-element cycle
// "A -> A" — caught explicitly in the inner loop so we don't lose it.
func DetectCycle(graph *types.Graph) error {
	if graph == nil || len(graph.Nodes) == 0 {
		return nil
	}

	color := make(map[string]nodeColor, len(graph.Nodes))
	parent := make(map[string]string, len(graph.Nodes))

	var visit func(node string) []string
	visit = func(node string) []string {
		color[node] = colorGrey
		for _, dep := range graph.Edges[node] {
			// Self-loop: a task that lists itself as a dependency. The
			// generic back-edge logic below would also catch this if we
			// didn't pre-mark, but reporting it explicitly gives a much
			// clearer error message ("a depends on itself" beats
			// "cycle: a -> a -> a").
			if dep == node {
				return []string{node, node}
			}
			switch color[dep] {
			case colorWhite:
				parent[dep] = node
				if cycle := visit(dep); cycle != nil {
					return cycle
				}
			case colorGrey:
				// Back-edge: dep is on the current DFS stack. Reconstruct
				// the cycle by walking parents from `node` until we hit
				// `dep`, then append `dep` to close the loop.
				return reconstructCycle(parent, node, dep)
			case colorBlack:
				// Forward/cross edge — not a cycle, just skip.
			}
		}
		color[node] = colorBlack
		return nil
	}

	// Iterate node names in deterministic order so error messages are
	// stable across runs (helpful for tests and for users debugging
	// cycles in CI output).
	for _, name := range SortedTaskNames(graph) {
		if color[name] != colorWhite {
			continue
		}
		if cycle := visit(name); cycle != nil {
			return &types.CycleError{Path: cycle}
		}
	}
	return nil
}

// reconstructCycle walks the parent chain from `from` back to `to`, then
// appends `to` so the resulting path renders as "to -> ... -> from -> to".
// Caller must guarantee `to` is an ancestor of `from` in the DFS tree.
func reconstructCycle(parent map[string]string, from, to string) []string {
	// Walk parents back to `to`.
	stack := []string{from}
	cur := from
	for cur != to {
		p, ok := parent[cur]
		if !ok {
			// Shouldn't happen if `to` truly was an ancestor — but
			// defensive: if the chain breaks we still return what we
			// have rather than infinite-loop.
			break
		}
		stack = append(stack, p)
		cur = p
	}
	// Reverse to get traversal order (to -> ... -> from), then append
	// the closing `to`.
	for i, j := 0, len(stack)-1; i < j; i, j = i+1, j-1 {
		stack[i], stack[j] = stack[j], stack[i]
	}
	return append(stack, to)
}
