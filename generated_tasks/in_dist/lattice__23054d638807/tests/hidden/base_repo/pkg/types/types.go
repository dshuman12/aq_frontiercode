// Package lattice defines the cross-module types and interfaces for the
// Lattice task runner. Drafted jointly by CLAUDE-A and CLAUDE-B before
// either side writes implementation code, so the parser, scheduler,
// cache, and watcher all compose against a stable contract.
//
package types

import (
	"context"
	"io"
	"time"
)

// =============================================================================
// Task — the unit of work
// =============================================================================

// Task is one node in the build graph. The user defines tasks in a
// lattice.yaml (or .toml) file; the parser produces []Task.
type Task struct {
	// Name is the unique identifier ("build", "test", "lint:go", etc.).
	// Colons are allowed and convey namespace, not hierarchy.
	Name string `yaml:"name" toml:"name"`

	// Description is shown in `lattice list`. Optional.
	Description string `yaml:"desc,omitempty" toml:"desc,omitempty"`

	// Deps is the list of task names this task depends on. The DAG
	// resolver turns this into edges. Order in the file is preserved
	// for stable scheduling (helpful when commands have side effects
	// that aren't captured by Inputs/Outputs).
	Deps []string `yaml:"deps,omitempty" toml:"deps,omitempty"`

	// Inputs are file globs. Hashing all input file contents (plus
	// the resolved Command and Env) produces the cache key.
	Inputs []string `yaml:"inputs,omitempty" toml:"inputs,omitempty"`

	// Outputs are file globs. Used by the cache to know what to
	// restore on cache hit and by `lattice clean` to know what to
	// delete.
	Outputs []string `yaml:"outputs,omitempty" toml:"outputs,omitempty"`

	// Command is the shell command to execute. Single string; the
	// runner shells out via /bin/sh -c (or cmd /c on Windows). Multi-
	// line strings are supported.
	Command string `yaml:"cmd" toml:"cmd"`

	// Env is task-level environment variable overrides. Layered on top
	// of the project Env, which is layered on top of the OS env.
	// See pkg/env for the full precedence rules.
	Env map[string]string `yaml:"env,omitempty" toml:"env,omitempty"`

	// Dir is the working directory for the command. Relative to the
	// project root (the directory containing lattice.yaml). Defaults
	// to the project root.
	Dir string `yaml:"dir,omitempty" toml:"dir,omitempty"`

	// Timeout is the per-task wall-clock budget. Zero means no timeout.
	Timeout time.Duration `yaml:"timeout,omitempty" toml:"timeout,omitempty"`

	// Cache toggles whether the cache subsystem is consulted for this
	// task. Defaults to true. Tasks that produce non-deterministic
	// output (e.g. "deploy") set this to false.
	Cache *bool `yaml:"cache,omitempty" toml:"cache,omitempty"`

	// Sources captures where the task was defined for error messages.
	// Populated by the parser, not the user.
	Source SourceLocation `yaml:"-" toml:"-"`
}

// SourceLocation is a file:line reference. Used in parser errors and
// in `lattice graph` output to link nodes back to their definitions.
type SourceLocation struct {
	File string
	Line int
}

// =============================================================================
// Project — the parsed configuration
// =============================================================================

// Project is the parsed root configuration. It corresponds 1:1 with the
// lattice.yaml/lattice.toml file at the project root. Loaded by the parser.
type Project struct {
	// Name is the project name. Used in cache namespacing and in
	// lattice list headings.
	Name string `yaml:"name" toml:"name"`

	// Version is the lattice config schema version. Currently always
	// "1". Bumped when we make breaking changes to this struct.
	Version string `yaml:"version" toml:"version"`

	// Env is the project-level environment. Layered between OS env and
	// task Env. See pkg/env.
	Env map[string]string `yaml:"env,omitempty" toml:"env,omitempty"`

	// EnvFiles is a list of .env files to load. Resolved relative to
	// project root. Order matters: later files override earlier.
	EnvFiles []string `yaml:"env_files,omitempty" toml:"env_files,omitempty"`

	// Tasks is the parsed task list, indexed by Name.
	Tasks map[string]*Task `yaml:"tasks" toml:"tasks"`

	// CacheDir is where the on-disk cache lives. Defaults to
	// .lattice/cache under the project root.
	CacheDir string `yaml:"cache_dir,omitempty" toml:"cache_dir,omitempty"`

	// Defaults holds shared defaults applied to every task that doesn't
	// override the field. Lets users write `defaults: {shell: bash,
	// timeout: 5m}` once instead of repeating per task.
	Defaults *TaskDefaults `yaml:"defaults,omitempty" toml:"defaults,omitempty"`

	// Root is the project root directory (absolute, set by the
	// parser based on where the config file was found).
	Root string `yaml:"-" toml:"-"`
}

// TaskDefaults supplies shared defaults inherited by every Task that doesn't
// override the field. Applied by the parser after task definitions are read.
type TaskDefaults struct {
	Shell   string        `yaml:"shell,omitempty" toml:"shell,omitempty"`
	Timeout time.Duration `yaml:"timeout,omitempty" toml:"timeout,omitempty"`
	Cache   *bool         `yaml:"cache,omitempty" toml:"cache,omitempty"`
	Dir     string        `yaml:"dir,omitempty" toml:"dir,omitempty"`
}

// =============================================================================
// DAG — the dependency graph
// =============================================================================

// Graph is the resolved task dependency graph. The DAG resolver builds
// this from a Project. It preserves the original task pointers so
// downstream code can read Inputs/Outputs/Command without re-lookup.
type Graph struct {
	// Nodes is the map of task name to task pointer.
	Nodes map[string]*Task

	// Edges[a] is the set of task names that a depends on (a's
	// predecessors). For the reverse direction (a's dependents) the
	// scheduler builds an inverted index on demand.
	Edges map[string][]string
}

// CycleError is returned by the DAG builder when a cycle is detected.
// The Path slice is the cycle, in order, with the start node repeated
// at the end so callers can render it as "a -> b -> c -> a".
type CycleError struct {
	Path []string
}

func (e *CycleError) Error() string {
	if len(e.Path) == 0 {
		return "task dependency cycle"
	}
	out := "task dependency cycle: "
	for i, n := range e.Path {
		if i > 0 {
			out += " -> "
		}
		out += n
	}
	return out
}

// =============================================================================
// Cache — content-hashed cache contract
// =============================================================================

// CacheKey is the stable hash of a task's inputs + command + env. The
// cache subsystem produces these; consumers treat them as opaque.
type CacheKey string

// CacheEntry records what a successful task run produced. Outputs are
// captured as content-hashes (so we can detect when the cache and the
// filesystem diverge) plus the path to the cached blob.
type CacheEntry struct {
	Key       CacheKey
	Outputs   map[string]string // filepath -> content hash
	BlobPath  string            // tarball of outputs in the cache dir
	Stdout    string            // path to captured stdout
	Stderr    string            // path to captured stderr
	ExitCode  int
	Duration  time.Duration
	CreatedAt time.Time
}

// Cache is the cache subsystem contract. Both in-memory and on-disk
// implementations satisfy it.
type Cache interface {
	// Hash computes the cache key for a task at its current state.
	// Returns an error if any input file is unreadable.
	Hash(task *Task, project *Project) (CacheKey, error)

	// Get retrieves a cache entry. Returns (nil, nil) on miss. Returns
	// an error only on I/O issues, not on miss.
	Get(key CacheKey) (*CacheEntry, error)

	// Put stores a cache entry. The runner calls this after a successful
	// task completion.
	Put(entry *CacheEntry) error

	// Restore writes the cached outputs back to the filesystem. Used on
	// cache hit when the user wants the output files materialized.
	Restore(entry *CacheEntry, projectRoot string) error

	// Invalidate removes an entry. Used by `lattice clean <task>`.
	Invalidate(key CacheKey) error

	// Stats returns hit/miss counters. Used by `lattice stats`.
	Stats() CacheStats
}

// CacheStats is the in-memory counter set Cache.Stats returns.
type CacheStats struct {
	Hits        uint64
	Misses      uint64
	Stores      uint64
	Bytes       uint64
	OldestEntry time.Time
}

// =============================================================================
// Scheduler — parallel executor
// =============================================================================

// Scheduler runs tasks in topological order with bounded parallelism.
// It consults the Cache before running each task and writes results back.
type Scheduler interface {
	// Run executes the given tasks (and their transitive dependencies)
	// in dependency order with up to MaxParallel concurrent tasks.
	// Returns a Result per task, ordered by completion time.
	//
	// The returned error is reserved for scheduler-level failures (cycle
	// detection, dispatcher panic, context cancellation). Per-task
	// failures appear in Result.Err and do not surface as the top-level
	// error unless RunOptions.FailFast is true.
	Run(ctx context.Context, graph *Graph, targets []string, opts RunOptions) ([]Result, error)
}

// RunOptions tunes a scheduler invocation.
type RunOptions struct {
	// MaxParallel is the worker pool size. <= 0 means runtime.NumCPU().
	MaxParallel int

	// DryRun prints what would run without running.
	DryRun bool

	// Force ignores cache hits — every task in the closure runs.
	Force bool

	// FailFast cancels remaining tasks on the first failure. When
	// false, the scheduler runs every task it can and reports all
	// failures at the end.
	FailFast bool

	// Stdout / Stderr are where the scheduler writes interleaved task
	// output. Defaults to os.Stdout / os.Stderr. Tests substitute
	// buffers here.
	Stdout io.Writer
	Stderr io.Writer
}

// Result is the per-task outcome. Cached=true means the task didn't
// actually run; the entry was restored from cache.
type Result struct {
	Task      string
	ExitCode  int
	Cached    bool
	Duration  time.Duration
	Err       error
	StartedAt time.Time
	EndedAt   time.Time
}

// =============================================================================
// Watcher — file system watcher
// =============================================================================

// WatchEvent is what the watcher delivers when a watched path changes.
type WatchEvent struct {
	Path     string
	Op       WatchOp
	Time     time.Time
	TaskHint string // populated when the watcher knows which task's input matched
}

// WatchOp is the kind of change observed.
type WatchOp uint8

const (
	WatchOpCreate WatchOp = iota
	WatchOpWrite
	WatchOpRemove
	WatchOpRename
	WatchOpChmod
)

func (op WatchOp) String() string {
	switch op {
	case WatchOpCreate:
		return "create"
	case WatchOpWrite:
		return "write"
	case WatchOpRemove:
		return "remove"
	case WatchOpRename:
		return "rename"
	case WatchOpChmod:
		return "chmod"
	default:
		return "unknown"
	}
}

// Watcher delivers debounced file system change events scoped to the
// inputs of a known task graph.
type Watcher interface {
	// Start begins watching. Returns a channel of WatchEvents and a
	// cancellation function. The events channel is closed when cancel
	// is called or when ctx is done.
	Start(ctx context.Context, project *Project, graph *Graph) (<-chan WatchEvent, func(), error)

	// SetDebounce changes the debounce window. Default is 250ms.
	// Implementations should treat this as set-once-before-Start; calling
	// it after Start has racy semantics.
	SetDebounce(d time.Duration)
}

// =============================================================================
// Env — environment layering
// =============================================================================

// EnvLayer is one level in the env precedence stack.
type EnvLayer struct {
	Source EnvSource
	Vars   map[string]string
}

// EnvSource identifies where an env layer came from. Used in
// `lattice env --explain` to show users what overrode what.
type EnvSource uint8

const (
	EnvSourceOS       EnvSource = iota // process environment
	EnvSourceProject                   // project Env in lattice.yaml
	EnvSourceEnvFile                   // .env files referenced by project
	EnvSourceTask                      // task-level Env
	EnvSourceOverride                  // -e flag on the CLI
)

// =============================================================================
// Logger — structured logging
// =============================================================================

// Level is the log severity.
type Level uint8

const (
	LevelDebug Level = iota
	LevelInfo
	LevelWarn
	LevelError
)

// Logger is the cross-package logging contract. Implementations live in
// pkg/log.
type Logger interface {
	Log(level Level, msg string, fields map[string]any)
	With(fields map[string]any) Logger
}
