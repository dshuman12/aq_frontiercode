// Package dag builds, validates, and walks the task dependency graph for a
// Lattice project. The high-level flow is:
//
//	project, _ := parser.Load("lattice.yaml")
//	graph, err := dag.Build(project)
//	if err != nil { ... }   // err may be *types.CycleError
//	order, _ := dag.TopoSort(graph)
//
// All exported functions are safe for concurrent reads on a built *Graph;
// mutation of the graph after Build is not supported.
package dag

import (
	"fmt"
	"sort"

	"github.com/manojgowda/lattice/pkg/types"
)

// Build constructs the dependency graph for a parsed project. It validates
// that every dependency reference resolves to a known task, then runs cycle
// detection. On a cycle it returns a *types.CycleError populated with the
// cycle path so the CLI can render "a -> b -> c -> a".
func Build(project *types.Project) (*types.Graph, error) {
	if project == nil {
		return nil, fmt.Errorf("dag.Build: project is nil")
	}
	if len(project.Tasks) == 0 {
		// An empty project is not an error — `lattice list` on a fresh
		// repo should still print "0 tasks" rather than blowing up.
		return &types.Graph{
			Nodes: map[string]*types.Task{},
			Edges: map[string][]string{},
		}, nil
	}

	graph := &types.Graph{
		Nodes: make(map[string]*types.Task, len(project.Tasks)),
		Edges: make(map[string][]string, len(project.Tasks)),
	}

	// First pass: register all node names so subsequent dep validation
	// can detect references to non-existent tasks.
	for name, task := range project.Tasks {
		if name == "" {
			return nil, fmt.Errorf("dag.Build: task with empty name in project %q", project.Name)
		}
		if task == nil {
			return nil, fmt.Errorf("dag.Build: task %q is nil", name)
		}
		// Ensure the task's own Name field matches the map key. Parsers
		// sometimes leave one or the other unset; normalize here.
		task.Name = name
		graph.Nodes[name] = task
	}

	// Second pass: build edges. Validate that every dep points at a real
	// task. We preserve the order the user wrote the deps in — the
	// scheduler uses this for stable execution within a topo layer when
	// task commands have unobserved side effects.
	for name, task := range graph.Nodes {
		if len(task.Deps) == 0 {
			continue
		}
		seen := make(map[string]struct{}, len(task.Deps))
		edges := make([]string, 0, len(task.Deps))
		for _, dep := range task.Deps {
			if dep == "" {
				return nil, fmt.Errorf("dag.Build: task %q has empty dependency", name)
			}
			if _, ok := graph.Nodes[dep]; !ok {
				return nil, fmt.Errorf("dag.Build: task %q depends on unknown task %q", name, dep)
			}
			if _, dup := seen[dep]; dup {
				// Tolerate duplicate deps. Real users do this by accident
				// when extending configs; deduping is friendlier than
				// erroring.
				continue
			}
			seen[dep] = struct{}{}
			edges = append(edges, dep)
		}
		graph.Edges[name] = edges
	}

	if err := DetectCycle(graph); err != nil {
		return nil, err
	}

	return graph, nil
}

// SortedTaskNames returns the graph's task names sorted alphabetically. Used
// by `lattice list` and by tests that need a deterministic iteration order
// (Go maps don't iterate stably).
func SortedTaskNames(graph *types.Graph) []string {
	if graph == nil {
		return nil
	}
	names := make([]string, 0, len(graph.Nodes))
	for name := range graph.Nodes {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

// HasTask reports whether the graph contains a task with the given name.
func HasTask(graph *types.Graph, name string) bool {
	if graph == nil {
		return false
	}
	_, ok := graph.Nodes[name]
	return ok
}

// MustHaveTasks returns an error if any of the given names is not in the
// graph. Used by the CLI to validate `lattice run a b c` arguments before
// the scheduler starts. Suggests near-matches in the error message so a
// typo like `lattice run buld` yields "unknown task: \"buld\". Did you
// mean: build?".
func MustHaveTasks(graph *types.Graph, names []string) error {
	if graph == nil {
		return fmt.Errorf("dag.MustHaveTasks: graph is nil")
	}
	var missing []string
	for _, n := range names {
		if !HasTask(graph, n) {
			missing = append(missing, n)
		}
	}
	if len(missing) == 0 {
		return nil
	}
	if len(missing) == 1 {
		hint := nearestName(graph, missing[0])
		if hint != "" {
			return fmt.Errorf("unknown task: %q. Did you mean %q?", missing[0], hint)
		}
		return fmt.Errorf("unknown task: %q", missing[0])
	}
	return fmt.Errorf("unknown tasks: %v", missing)
}

// nearestName returns the existing task name with the smallest edit
// distance to `query`, or empty string if no candidate is within a
// reasonable threshold (currently distance <= 3).
func nearestName(graph *types.Graph, query string) string {
	if graph == nil {
		return ""
	}
	best := ""
	bestDist := 4
	for name := range graph.Nodes {
		d := levenshtein(query, name)
		if d < bestDist {
			bestDist = d
			best = name
		}
	}
	return best
}

// levenshtein is the standard edit-distance algorithm. Two-row
// optimization keeps memory at O(min(len(a), len(b))).
func levenshtein(a, b string) int {
	if len(a) > len(b) {
		a, b = b, a
	}
	prev := make([]int, len(a)+1)
	curr := make([]int, len(a)+1)
	for i := 0; i <= len(a); i++ {
		prev[i] = i
	}
	for j := 1; j <= len(b); j++ {
		curr[0] = j
		for i := 1; i <= len(a); i++ {
			cost := 1
			if a[i-1] == b[j-1] {
				cost = 0
			}
			curr[i] = min3(curr[i-1]+1, prev[i]+1, prev[i-1]+cost)
		}
		copy(prev, curr)
	}
	return prev[len(a)]
}

func min3(a, b, c int) int {
	m := a
	if b < m {
		m = b
	}
	if c < m {
		m = c
	}
	return m
}
