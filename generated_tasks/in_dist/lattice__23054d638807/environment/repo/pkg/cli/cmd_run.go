package cli

import (
	"context"
	"fmt"

	"github.com/manojgowda/lattice/pkg/parser"
	"github.com/manojgowda/lattice/pkg/types"
	"github.com/spf13/cobra"
)

// runFlags are the per-invocation switches for `lattice run`.
type runFlags struct {
	dryRun    bool
	force     bool
	failFast  bool
	keepGoing bool
}

func newRunCommand(state *rootState) *cobra.Command {
	flags := &runFlags{failFast: true}

	cmd := &cobra.Command{
		Use:   "run [task...]",
		Short: "Run one or more tasks (with their dependencies)",
		Long: `Run resolves the dependency graph and executes the named tasks
along with their transitive dependencies. Tasks whose inputs haven't
changed since the last run are restored from cache instead of executed.

Examples:

  lattice run build
  lattice run test lint
  lattice run --force build         # ignore cache, re-run everything
  lattice run --dry-run release     # show what would run, don't execute`,
		Args: cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runRun(cmd.Context(), state, flags, args)
		},
	}

	cmd.Flags().BoolVar(&flags.dryRun, "dry-run", false, "print the execution plan without running tasks")
	cmd.Flags().BoolVarP(&flags.force, "force", "f", false, "ignore cache hits; re-run every task in the closure")
	cmd.Flags().BoolVar(&flags.failFast, "fail-fast", true, "cancel pending tasks after the first failure")
	cmd.Flags().BoolVar(&flags.keepGoing, "keep-going", false, "alias for --fail-fast=false")

	return cmd
}

func runRun(ctx context.Context, state *rootState, flags *runFlags, targets []string) error {
	project, err := loadProject(state)
	if err != nil {
		return err
	}

	if flags.keepGoing {
		flags.failFast = false
	}

	// In a production build this would call into pkg/dag and
	// pkg/scheduler. Wiring is intentional — types from pkg/types are
	// the contract. For now we plumb through to a runner shim that
	// the scheduler package replaces.
	opts := types.RunOptions{
		MaxParallel: effectiveParallel(state),
		DryRun:      flags.dryRun,
		Force:       flags.force,
		FailFast:    flags.failFast,
		Stdout:      state.stdout,
		Stderr:      state.stderr,
	}
	results, err := dispatchRun(ctx, project, targets, opts)
	if err != nil {
		return err
	}

	return summarizeResults(state, results)
}

// loadProject is the shared "find and parse" helper used by every
// subcommand that needs a Project.
func loadProject(state *rootState) (*types.Project, error) {
	popts := parser.LoadOptions{}
	if state.configPath != "" {
		return parser.Load(state.configPath, popts)
	}
	cwd := state.cwd
	if cwd == "" {
		var err error
		cwd, err = currentDir()
		if err != nil {
			return nil, err
		}
	}
	return parser.LoadFromDir(cwd, popts)
}

// summarizeResults prints a one-line-per-task summary, then a totals
// banner. JSON mode emits a single results array and skips the banner.
func summarizeResults(state *rootState, results []types.Result) error {
	if state.jsonOutput {
		return emitJSON(state.stdout, results)
	}

	var ran, cached, failed int
	for _, r := range results {
		switch {
		case r.Err != nil:
			failed++
			fmt.Fprintf(state.stderr, "  ✗  %-30s  %s\n", r.Task, r.Err)
		case r.Cached:
			cached++
			fmt.Fprintf(state.stdout, "  ●  %-30s  cached  (%s)\n", r.Task, r.Duration)
		default:
			ran++
			fmt.Fprintf(state.stdout, "  ✓  %-30s  %s\n", r.Task, r.Duration)
		}
	}

	fmt.Fprintf(state.stdout, "\n%d tasks: %d ran, %d cached", len(results), ran, cached)
	if failed > 0 {
		fmt.Fprintf(state.stdout, ", %d failed", failed)
	}
	fmt.Fprintln(state.stdout)

	if failed > 0 {
		return fmt.Errorf("%d task(s) failed", failed)
	}
	return nil
}
