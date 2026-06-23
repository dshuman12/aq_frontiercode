// Package cli wires the cobra command tree for the lattice binary.
// Each subcommand lives in its own file; this file owns the root
// command, persistent flags, and the global state that subcommands
// share (logger, parser options, working directory).
package cli

import (
	"fmt"
	"io"
	"os"
	"runtime"

	"github.com/manojgowda/lattice/pkg/types"
	"github.com/spf13/cobra"
)

// Version is set at build time via -ldflags. The default is "dev"
// when developers run `go run ./cmd/lattice`.
var Version = "dev"

// Commit is set at build time. Truncated to 8 chars when displayed.
var Commit = "unknown"

// rootState holds the values configured by persistent flags. Each
// subcommand's RunE pulls from here.
type rootState struct {
	configPath  string
	cwd         string
	maxParallel int
	verbose     int // -v / -vv / -vvv
	quiet       bool
	noColor     bool
	jsonOutput  bool
	stdout      io.Writer
	stderr      io.Writer
	logger      types.Logger
}

// New returns the root cobra.Command. cmd/lattice/main.go calls
// Execute on whatever this returns. Tests can construct a fresh
// command tree with custom stdout/stderr.
func New() *cobra.Command {
	state := &rootState{
		stdout: os.Stdout,
		stderr: os.Stderr,
	}

	root := &cobra.Command{
		Use:   "lattice",
		Short: "A content-hashed parallel task runner",
		Long: `Lattice runs your tasks the smart way.

Define tasks in lattice.yaml; lattice resolves dependencies, runs them
in parallel up to N workers, and skips work whose inputs haven't
changed. Watch mode re-runs only what's affected when files mutate.

Quickstart:

  lattice init             # create a starter lattice.yaml
  lattice list             # show the task graph
  lattice run build        # run "build" and its dependencies
  lattice watch test       # re-run "test" on every file change`,
		SilenceUsage:  true, // we print usage manually for some errors
		SilenceErrors: true, // top-level Execute prints errors
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			return resolveCwd(state)
		},
	}

	pf := root.PersistentFlags()
	pf.StringVarP(&state.configPath, "config", "c", "", "path to lattice.yaml (defaults to walking up from cwd)")
	pf.StringVarP(&state.cwd, "dir", "C", "", "change to this directory before running (like make -C)")
	pf.IntVarP(&state.maxParallel, "parallel", "p", 0, "max concurrent tasks (0 = NumCPU)")
	pf.CountVarP(&state.verbose, "verbose", "v", "increase log level (-v, -vv, -vvv)")
	pf.BoolVarP(&state.quiet, "quiet", "q", false, "silence info messages")
	pf.BoolVar(&state.noColor, "no-color", false, "disable ANSI color in output")
	pf.BoolVar(&state.jsonOutput, "json", false, "emit machine-readable JSON instead of pretty output")

	root.AddCommand(
		newRunCommand(state),
		newListCommand(state),
		newGraphCommand(state),
		newWatchCommand(state),
		newCleanCommand(state),
		newInitCommand(state),
		newCacheCommand(state),
		newConfigCommand(state),
		newVersionCommand(state),
	)

	root.SetOut(state.stdout)
	root.SetErr(state.stderr)
	return root
}

// resolveCwd applies the -C flag (if any) by chdir'ing the process.
// Cobra runs PersistentPreRunE before each subcommand, so this fires
// once per invocation. We resolve relative to the cwd at command
// invocation, matching `make -C` semantics.
func resolveCwd(state *rootState) error {
	if state.cwd == "" {
		return nil
	}
	if err := os.Chdir(state.cwd); err != nil {
		return fmt.Errorf("change directory to %q: %w", state.cwd, err)
	}
	return nil
}

// effectiveParallel returns the parallelism the scheduler should use.
// 0 means "auto", which we resolve to runtime.NumCPU(). Negative
// values are clamped to 1 to avoid surprising users.
func effectiveParallel(state *rootState) int {
	if state.maxParallel > 0 {
		return state.maxParallel
	}
	return runtime.NumCPU()
}

// Execute is the convenience entry point used by main.go. Mostly here
// so tests don't have to wire up cobra themselves.
func Execute() {
	root := New()
	if err := root.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}
