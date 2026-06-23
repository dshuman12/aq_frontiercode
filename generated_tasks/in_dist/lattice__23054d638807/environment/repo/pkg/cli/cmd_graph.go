package cli

import (
	"fmt"
	"sort"
	"strings"

	"github.com/manojgowda/lattice/pkg/types"
	"github.com/spf13/cobra"
)

// graphFlags configures `lattice graph`.
type graphFlags struct {
	format string // ascii or dot
	target string // optional task name to focus on
}

func newGraphCommand(state *rootState) *cobra.Command {
	flags := &graphFlags{format: "ascii"}

	cmd := &cobra.Command{
		Use:   "graph",
		Short: "Render the task dependency graph",
		Long: `Graph prints the project's task DAG. The default format is
"ascii" (a tree with branches); "dot" emits a Graphviz DOT document
that you can pipe into "dot -Tsvg" or similar.

Examples:

  lattice graph
  lattice graph --format dot > tasks.dot
  lattice graph --target release  # show only "release" and its closure`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runGraph(state, flags)
		},
	}
	cmd.Flags().StringVar(&flags.format, "format", "ascii", "output format: ascii | dot")
	cmd.Flags().StringVar(&flags.target, "target", "", "focus on this task and its dependency closure")
	return cmd
}

func runGraph(state *rootState, flags *graphFlags) error {
	project, err := loadProject(state)
	if err != nil {
		return err
	}

	switch flags.format {
	case "ascii":
		return renderASCII(state, project, flags.target)
	case "dot":
		return renderDOT(state, project, flags.target)
	default:
		return fmt.Errorf("unknown format %q (use ascii or dot)", flags.format)
	}
}

// renderASCII prints the graph as nested bullet trees, one root per
// top-level task (i.e. tasks that nothing depends on).
func renderASCII(state *rootState, project *types.Project, target string) error {
	// Build adjacency: parent -> children (we want to walk DOWN the
	// graph from roots). Edges in pkg/types are deps (a -> a's deps),
	// so for a "root" view we invert.
	children := map[string][]string{}
	for _, t := range project.Tasks {
		for _, dep := range t.Deps {
			children[dep] = append(children[dep], t.Name)
		}
	}

	roots := []string{}
	if target != "" {
		if _, ok := project.Tasks[target]; !ok {
			return fmt.Errorf("task %q not found", target)
		}
		roots = []string{target}
	} else {
		incoming := map[string]bool{}
		for _, t := range project.Tasks {
			for _, d := range t.Deps {
				incoming[d] = true
			}
		}
		for name := range project.Tasks {
			if !incoming[name] {
				roots = append(roots, name)
			}
		}
	}
	sort.Strings(roots)

	visited := map[string]bool{}
	var walk func(name string, depth int)
	walk = func(name string, depth int) {
		fmt.Fprintf(state.stdout, "%s%s\n", strings.Repeat("  ", depth), name)
		if visited[name] {
			return
		}
		visited[name] = true
		ch := append([]string{}, children[name]...)
		sort.Strings(ch)
		for _, c := range ch {
			walk(c, depth+1)
		}
	}
	for _, r := range roots {
		walk(r, 0)
	}
	return nil
}

// renderDOT emits Graphviz DOT. Edges go from a task to each of its deps.
func renderDOT(state *rootState, project *types.Project, target string) error {
	fmt.Fprintln(state.stdout, "digraph lattice {")
	fmt.Fprintln(state.stdout, `  rankdir=LR;`)
	fmt.Fprintln(state.stdout, `  node [shape=box, style=rounded];`)

	for _, t := range project.Tasks {
		if target != "" && !inClosure(project, target, t.Name) {
			continue
		}
		fmt.Fprintf(state.stdout, "  %q [label=%q];\n", t.Name, t.Name)
		for _, d := range t.Deps {
			fmt.Fprintf(state.stdout, "  %q -> %q;\n", t.Name, d)
		}
	}
	fmt.Fprintln(state.stdout, "}")
	return nil
}

// inClosure reports whether `node` is in the dependency closure of
// `target` (target itself or any transitive dep).
func inClosure(project *types.Project, target, node string) bool {
	if target == node {
		return true
	}
	visited := map[string]bool{}
	var walk func(string) bool
	walk = func(n string) bool {
		if n == node {
			return true
		}
		if visited[n] {
			return false
		}
		visited[n] = true
		t := project.Tasks[n]
		if t == nil {
			return false
		}
		for _, dep := range t.Deps {
			if walk(dep) {
				return true
			}
		}
		return false
	}
	return walk(target)
}
