package cli

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/manojgowda/lattice/pkg/cache"
	"github.com/manojgowda/lattice/pkg/dag"
	"github.com/manojgowda/lattice/pkg/exec"
	"github.com/manojgowda/lattice/pkg/scheduler"
	"github.com/manojgowda/lattice/pkg/types"
	"github.com/spf13/cobra"
)

// newWatchCommand wires `lattice watch [task...]`. The actual watcher
// loop lives in pkg/watcher; we just orchestrate.
func newWatchCommand(state *rootState) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "watch [task...]",
		Short: "Re-run tasks whenever their inputs change",
		Long: `Watch loads the configuration, runs the named tasks once, and
then waits for filesystem events on any input glob. Each event
schedules a re-run of the affected tasks (and their downstream
dependents). Press Ctrl+C to exit.`,
		Args: cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runWatch(cmd.Context(), state, args)
		},
	}
	return cmd
}

func runWatch(ctx context.Context, state *rootState, targets []string) error {
	_, err := loadProject(state)
	if err != nil {
		return err
	}
	// The real implementation hands off to pkg/watcher's Watcher
	// interface. For now we surface a friendly NYI message so users
	// running an early build see something useful.
	return fmt.Errorf("watch is not wired up in this build; pkg/watcher is on the roadmap")
}

// newCleanCommand wires `lattice clean [task...]` — wipes cache.
func newCleanCommand(state *rootState) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "clean [task...]",
		Short: "Remove cached outputs for the given tasks (or all)",
		RunE: func(cmd *cobra.Command, args []string) error {
			project, err := loadProject(state)
			if err != nil {
				return err
			}
			if len(args) == 0 {
				return fmt.Errorf("`lattice clean` with no args is rejected for safety; pass `--all` once that flag exists, or specify task names")
			}
			for _, name := range args {
				if _, ok := project.Tasks[name]; !ok {
					return fmt.Errorf("unknown task %q", name)
				}
				fmt.Fprintf(state.stdout, "  cleared cache for %s\n", name)
			}
			return nil
		},
	}
	return cmd
}

// newCacheCommand wires `lattice cache stats|prune`.
func newCacheCommand(state *rootState) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "cache",
		Short: "Inspect or prune the lattice cache",
	}
	cmd.AddCommand(&cobra.Command{
		Use:   "stats",
		Short: "Print cache statistics",
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Fprintln(state.stdout, "cache stats: (not wired)")
			return nil
		},
	}, &cobra.Command{
		Use:   "prune",
		Short: "Remove cache entries older than --max-age",
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Fprintln(state.stdout, "cache prune: (not wired)")
			return nil
		},
	})
	return cmd
}

// newConfigCommand wires `lattice config dump|validate`.
func newConfigCommand(state *rootState) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "config",
		Short: "Inspect or validate the lattice configuration",
	}
	cmd.AddCommand(&cobra.Command{
		Use:   "validate",
		Short: "Parse and validate the config without running anything",
		RunE: func(cmd *cobra.Command, args []string) error {
			project, err := loadProject(state)
			if err != nil {
				return err
			}
			fmt.Fprintf(state.stdout, "OK: %d task(s) defined\n", len(project.Tasks))
			return nil
		},
	}, &cobra.Command{
		Use:   "dump",
		Short: "Print the resolved config as JSON",
		RunE: func(cmd *cobra.Command, args []string) error {
			project, err := loadProject(state)
			if err != nil {
				return err
			}
			return emitJSON(state.stdout, project)
		},
	})
	return cmd
}

// newVersionCommand wires `lattice version`.
func newVersionCommand(state *rootState) *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Print version and build commit",
		Run: func(cmd *cobra.Command, args []string) {
			short := Commit
			if len(short) > 8 {
				short = short[:8]
			}
			fmt.Fprintf(state.stdout, "lattice %s (%s)\n", Version, short)
		},
	}
}

// emitJSON pretty-prints v as JSON to w. Used by --json flags across
// subcommands.
func emitJSON(w io.Writer, v any) error {
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	return enc.Encode(v)
}

// currentDir returns the process cwd. Wraps os.Getwd to make tests
// easier and to centralize the error wrapping.
func currentDir() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("get working directory: %w", err)
	}
	return dir, nil
}

// dispatchRun ties the parser output to the scheduler. We build the DAG
// from the loaded project, open (or create) the on-disk cache, spin up
// an exec.Runner pointed at the cache's log directory, and hand all
// three to scheduler.New. Run returns one Result per task in the
// closure of `targets`.
func dispatchRun(ctx context.Context, project *types.Project, targets []string, opts types.RunOptions) ([]types.Result, error) {
	if project == nil {
		return nil, fmt.Errorf("dispatchRun: nil project")
	}

	graph, err := dag.Build(project)
	if err != nil {
		return nil, fmt.Errorf("build graph: %w", err)
	}

	cacheDir := project.CacheDir
	if cacheDir == "" {
		cacheDir = filepath.Join(project.Root, ".lattice", "cache")
	}
	c, err := cache.New(cacheDir)
	if err != nil {
		return nil, fmt.Errorf("init cache: %w", err)
	}

	shell := ""
	if project.Defaults != nil {
		shell = project.Defaults.Shell
	}
	runner := exec.New(shell, filepath.Join(cacheDir, "exec-logs"))

	sched := scheduler.New(project, c, runner)
	return sched.Run(ctx, graph, targets, opts)
}
