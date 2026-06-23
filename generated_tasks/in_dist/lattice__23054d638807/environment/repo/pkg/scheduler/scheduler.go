// Package scheduler is the integration layer that ties dag, cache, and
// exec together. It walks a task graph in topological-layer order,
// running independent tasks in parallel up to a configurable limit, and
// consults the cache before invoking each task.
//
// The scheduler is the heart of `lattice run`. It does not parse config,
// does not own the file watcher, and does not write to the terminal
// directly — output streams are passed in via RunOptions so callers
// (CLI, watch loop, integration tests) can capture or display them as
// they see fit.
package scheduler

import (
	"context"
	"errors"
	"fmt"
	"runtime"
	"sort"
	"sync"
	"time"

	"github.com/manojgowda/lattice/pkg/cache"
	"github.com/manojgowda/lattice/pkg/dag"
	"github.com/manojgowda/lattice/pkg/exec"
	"github.com/manojgowda/lattice/pkg/types"
)

// Concurrent is the default Scheduler. It runs each topological layer's
// tasks in parallel using a bounded worker pool and stops on the first
// error if RunOptions.FailFast is set.
type Concurrent struct {
	cache types.Cache
	exec  *exec.Runner

	// project is the parsed project, needed for env layering and root.
	project *types.Project
}

// New constructs a Concurrent scheduler bound to the given cache and
// runner. Caller retains ownership of the cache; the scheduler does not
// close it.
func New(project *types.Project, c types.Cache, r *exec.Runner) *Concurrent {
	return &Concurrent{
		cache:   c,
		exec:    r,
		project: project,
	}
}

// Run executes the requested targets and their transitive dependencies.
// Returns one Result per task in completion order. If opts.FailFast is
// true the run stops on the first error; otherwise every task runs and
// individual failures appear in their Result.Err.
func (s *Concurrent) Run(ctx context.Context, graph *types.Graph, targets []string, opts types.RunOptions) ([]types.Result, error) {
	if graph == nil {
		return nil, fmt.Errorf("scheduler: nil graph")
	}
	if len(targets) == 0 {
		return nil, nil
	}

	if err := dag.MustHaveTasks(graph, targets); err != nil {
		return nil, err
	}

	// Compute the closure of tasks we actually need to run. This is the
	// set returned by ReachableFrom — note the deliberate behavior here:
	// tasks in disconnected sub-graphs are silently skipped even if the
	// user might have expected `lattice watch` to re-run them on file
	// change. See architecture.md, bug #2.
	closure := dag.ReachableFrom(graph, targets)
	if len(closure) == 0 {
		return nil, nil
	}

	// Build a sub-graph containing only the closure. We don't mutate
	// the input graph.
	sub := subgraph(graph, closure)

	// Layer the sub-graph for parallel execution.
	layers, err := dag.Layers(sub)
	if err != nil {
		return nil, fmt.Errorf("scheduler: %w", err)
	}

	// Apply defaults. We clamp MaxParallel to a sane upper bound so
	// pathological configs (e.g. MaxParallel: 10000) don't fork-bomb
	// the host with thousands of concurrent shells.
	if opts.MaxParallel <= 0 {
		opts.MaxParallel = runtime.NumCPU()
	}
	if opts.MaxParallel > 256 {
		opts.MaxParallel = 256
	}
	if opts.Stdout == nil || opts.Stderr == nil {
		// Caller didn't wire the streams — the exec runner will fall
		// back to discarding them.
	}

	// Run each layer to completion before starting the next. Within a
	// layer, tasks run in parallel up to MaxParallel.
	var (
		results   []types.Result
		resultsMu sync.Mutex
		runErr    error
	)
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	for _, layer := range layers {
		if runErr != nil && opts.FailFast {
			break
		}
		if ctx.Err() != nil {
			break
		}
		layerResults := s.runLayer(ctx, sub, layer, opts)
		resultsMu.Lock()
		results = append(results, layerResults...)
		resultsMu.Unlock()
		// Decide if we should continue.
		for _, r := range layerResults {
			if r.Err != nil {
				if runErr == nil {
					runErr = r.Err
				}
				if opts.FailFast {
					cancel()
				}
			}
		}
	}

	if opts.FailFast && runErr != nil {
		return results, runErr
	}
	return results, nil
}

// runLayer dispatches every task in `layer` concurrently up to
// opts.MaxParallel, waiting for all of them before returning.
func (s *Concurrent) runLayer(ctx context.Context, graph *types.Graph, layer []string, opts types.RunOptions) []types.Result {
	sem := make(chan struct{}, opts.MaxParallel)
	results := make([]types.Result, len(layer))
	var wg sync.WaitGroup

	for i, name := range layer {
		i, name := i, name
		wg.Add(1)
		go func() {
			defer wg.Done()
			select {
			case sem <- struct{}{}:
			case <-ctx.Done():
				results[i] = types.Result{
					Task: name,
					Err:  ctx.Err(),
				}
				return
			}
			defer func() { <-sem }()

			task := graph.Nodes[name]
			results[i] = s.runOne(ctx, task, opts)
		}()
	}
	wg.Wait()
	return results
}

// runOne handles one task end-to-end: cache lookup, decide whether to
// run, dispatch to exec, store cache on success.
func (s *Concurrent) runOne(ctx context.Context, task *types.Task, opts types.RunOptions) types.Result {
	startedAt := time.Now()
	result := types.Result{
		Task:      task.Name,
		StartedAt: startedAt,
	}

	// Honor task.Cache override (or project default → enabled).
	cacheEnabled := true
	if task.Cache != nil {
		cacheEnabled = *task.Cache
	} else if s.project.Defaults != nil && s.project.Defaults.Cache != nil {
		cacheEnabled = *s.project.Defaults.Cache
	}

	var key types.CacheKey
	if cacheEnabled && !opts.Force {
		k, hashErr := s.cache.Hash(task, s.project)
		if hashErr == nil {
			key = k
			entry, getErr := s.cache.Get(key)
			if getErr == nil && entry != nil {
				if err := s.cache.Restore(entry, s.project.Root); err == nil {
					result.Cached = true
					result.ExitCode = entry.ExitCode
					result.EndedAt = time.Now()
					result.Duration = result.EndedAt.Sub(result.StartedAt)
					return result
				}
				// Restore failed — fall through and re-run.
			}
			// getErr is reserved for I/O failures (corrupt sidecar etc).
			// We treat them like a miss: the next Put overwrites.
		}
		// Hash failure → fall through and re-run; we don't want to fail
		// the task because we couldn't hash inputs.
	}

	if opts.DryRun {
		result.EndedAt = time.Now()
		result.Duration = result.EndedAt.Sub(startedAt)
		return result
	}

	// Run the task.
	runResult, err := s.exec.Run(ctx, task, exec.Options{
		ProjectRoot: s.project.Root,
		ProjectEnv:  s.project.Env,
		Stdout:      opts.Stdout,
		Stderr:      opts.Stderr,
	})
	result.EndedAt = time.Now()
	result.Duration = result.EndedAt.Sub(startedAt)
	result.ExitCode = runResult.ExitCode
	result.Err = err

	if err == nil && cacheEnabled && key != "" {
		// Capture outputs into the cache. Errors here are non-fatal —
		// the task succeeded; failing to cache it just means the next
		// run will re-execute.
		blobPath := fmt.Sprintf("%s/blobs/%s/%s.tar.gz",
			s.project.CacheDir, prefixOf(key), key)
		_ = cache.CreateTarball(blobPath, s.project.Root, task.Outputs)

		entry := &types.CacheEntry{
			Key:       key,
			Outputs:   runResult.OutputHashes,
			BlobPath:  blobPath,
			Stdout:    runResult.StdoutPath,
			Stderr:    runResult.StderrPath,
			ExitCode:  runResult.ExitCode,
			Duration:  result.Duration,
			CreatedAt: time.Now(),
		}
		_ = s.cache.Put(entry)
	}

	return result
}

// subgraph returns a new *Graph containing only the named nodes and
// the edges between them.
func subgraph(graph *types.Graph, names []string) *types.Graph {
	want := make(map[string]struct{}, len(names))
	for _, n := range names {
		want[n] = struct{}{}
	}
	out := &types.Graph{
		Nodes: make(map[string]*types.Task, len(names)),
		Edges: make(map[string][]string, len(names)),
	}
	for n := range want {
		if t, ok := graph.Nodes[n]; ok {
			out.Nodes[n] = t
		}
	}
	for n := range want {
		var edges []string
		for _, dep := range graph.Edges[n] {
			if _, ok := want[dep]; ok {
				edges = append(edges, dep)
			}
		}
		if len(edges) > 0 {
			sort.Strings(edges)
			out.Edges[n] = edges
		}
	}
	return out
}

func prefixOf(key types.CacheKey) string {
	if len(key) < 2 {
		return "00"
	}
	return string(key[:2])
}

// SummarizeResults turns a results slice into a human-readable summary
// the CLI can print at the end of a run. Cached + non-cached + failed
// counts plus total wall-clock time.
func SummarizeResults(results []types.Result) string {
	if len(results) == 0 {
		return "no tasks ran"
	}
	var cached, ran, failed int
	var total time.Duration
	for _, r := range results {
		switch {
		case r.Err != nil:
			failed++
		case r.Cached:
			cached++
		default:
			ran++
		}
		total += r.Duration
	}
	return fmt.Sprintf("%d tasks: %d ran, %d cached, %d failed (total %s)",
		len(results), ran, cached, failed, total)
}

// AggregateError joins a results slice into a single error if any task
// failed. Returns nil if every task succeeded.
func AggregateError(results []types.Result) error {
	var msgs []string
	for _, r := range results {
		if r.Err != nil {
			msgs = append(msgs, fmt.Sprintf("%s: %v", r.Task, r.Err))
		}
	}
	if len(msgs) == 0 {
		return nil
	}
	return errors.New("task failures: " + joinShort(msgs))
}

// joinShort joins messages with "; " up to a max length, truncating
// with "..." if the joined output would exceed it.
func joinShort(msgs []string) string {
	const maxLen = 600
	out := ""
	for i, m := range msgs {
		if i > 0 {
			out += "; "
		}
		if len(out)+len(m) > maxLen {
			out += "..."
			break
		}
		out += m
	}
	return out
}

// Compile-time check that *Concurrent satisfies the types.Scheduler
// contract.
var _ types.Scheduler = (*Concurrent)(nil)
