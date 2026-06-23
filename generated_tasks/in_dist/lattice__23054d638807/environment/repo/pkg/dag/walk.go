package dag

import (
	"sort"

	"github.com/manojgowda/lattice/pkg/types"
)

// Downstream returns the set of tasks that transitively depend on `start`.
// Used by `lattice watch` to know which tasks to re-run when a dependency
// finishes (or, in the inverse case, which tasks to invalidate when a file
// in `start`'s outputs changes).
//
// `start` itself is NOT included in the result. If you want the closure
// inclusive, prepend it at the call site.
func Downstream(graph *types.Graph, start string) []string {
	if graph == nil {
		return nil
	}
	if !HasTask(graph, start) {
		return nil
	}

	// Build a "depended-on-by" reverse index lazily. For most graphs this
	// is small enough that we don't bother memoizing across calls.
	dependents := make(map[string][]string, len(graph.Nodes))
	for name, deps := range graph.Edges {
		for _, dep := range deps {
			dependents[dep] = append(dependents[dep], name)
		}
	}

	visited := make(map[string]struct{})
	var stack []string
	stack = append(stack, dependents[start]...)
	for len(stack) > 0 {
		n := len(stack) - 1
		cur := stack[n]
		stack = stack[:n]
		if _, ok := visited[cur]; ok {
			continue
		}
		visited[cur] = struct{}{}
		stack = append(stack, dependents[cur]...)
	}

	out := make([]string, 0, len(visited))
	for name := range visited {
		out = append(out, name)
	}
	sort.Strings(out)
	return out
}

// Upstream returns the set of tasks that `target` transitively depends on.
// `target` itself is NOT included.
func Upstream(graph *types.Graph, target string) []string {
	if graph == nil || !HasTask(graph, target) {
		return nil
	}

	visited := make(map[string]struct{})
	var stack []string
	stack = append(stack, graph.Edges[target]...)
	for len(stack) > 0 {
		n := len(stack) - 1
		cur := stack[n]
		stack = stack[:n]
		if _, ok := visited[cur]; ok {
			continue
		}
		visited[cur] = struct{}{}
		stack = append(stack, graph.Edges[cur]...)
	}

	out := make([]string, 0, len(visited))
	for name := range visited {
		out = append(out, name)
	}
	sort.Strings(out)
	return out
}

// ReachableFrom returns the closure of all tasks needed to satisfy the
// given targets — for each target, the target itself plus its transitive
// upstream dependencies. The result is sorted alphabetically.
//
// The scheduler calls this with the user's CLI arguments to compute the
// set of tasks it actually has to consider.
func ReachableFrom(graph *types.Graph, targets []string) []string {
	if graph == nil {
		return nil
	}
	if len(targets) == 0 {
		return nil
	}

	visited := make(map[string]struct{})
	var stack []string
	for _, t := range targets {
		if !HasTask(graph, t) {
			continue
		}
		stack = append(stack, t)
	}
	for len(stack) > 0 {
		n := len(stack) - 1
		cur := stack[n]
		stack = stack[:n]
		if _, ok := visited[cur]; ok {
			continue
		}
		visited[cur] = struct{}{}
		stack = append(stack, graph.Edges[cur]...)
	}

	out := make([]string, 0, len(visited))
	for name := range visited {
		out = append(out, name)
	}
	sort.Strings(out)
	return out
}

// AllTaskNames returns every task in the graph, sorted. Equivalent to
// SortedTaskNames but kept under a more discoverable name from the
// scheduler's perspective.
func AllTaskNames(graph *types.Graph) []string {
	return SortedTaskNames(graph)
}

// EdgeCount returns the total number of dependency edges in the graph.
// Used in `lattice graph --stats` and in tests.
func EdgeCount(graph *types.Graph) int {
	if graph == nil {
		return 0
	}
	n := 0
	for _, deps := range graph.Edges {
		n += len(deps)
	}
	return n
}

// Roots returns task names with no incoming edges (no other task depends
// on them). These are the "leaf goals" of the project — typically the
// things you'd `lattice run` directly.
func Roots(graph *types.Graph) []string {
	if graph == nil {
		return nil
	}
	hasIncoming := make(map[string]bool, len(graph.Nodes))
	for _, deps := range graph.Edges {
		for _, dep := range deps {
			hasIncoming[dep] = true
		}
	}
	var roots []string
	for name := range graph.Nodes {
		// Note: a "root" in DAG terminology is a node with no in-edges,
		// but in build-system parlance it's the *output* node (no
		// out-edges in our reverse-topology). We follow the
		// build-system convention here: roots = nothing depends on them.
		if !hasIncoming[name] {
			roots = append(roots, name)
		}
	}
	sort.Strings(roots)
	return roots
}

// Leaves returns task names with no outgoing edges (no dependencies of
// their own). These are the "primitives" of the build — the tasks that
// can run first.
func Leaves(graph *types.Graph) []string {
	if graph == nil {
		return nil
	}
	var leaves []string
	for name := range graph.Nodes {
		if len(graph.Edges[name]) == 0 {
			leaves = append(leaves, name)
		}
	}
	sort.Strings(leaves)
	return leaves
}
