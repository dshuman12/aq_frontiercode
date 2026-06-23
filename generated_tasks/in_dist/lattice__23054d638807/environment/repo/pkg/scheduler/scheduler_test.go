package scheduler

import (
	"context"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/manojgowda/lattice/pkg/cache"
	"github.com/manojgowda/lattice/pkg/exec"
	"github.com/manojgowda/lattice/pkg/types"
)

// makeProject builds a project with the given task definitions. Each
// task runs `echo <name>` so we can run a real subprocess.
func makeProject(t *testing.T, tasks map[string][]string) *types.Project {
	t.Helper()
	root := t.TempDir()
	taskMap := make(map[string]*types.Task, len(tasks))
	for name, deps := range tasks {
		taskMap[name] = &types.Task{
			Name:    name,
			Command: "echo " + name,
			Deps:    append([]string(nil), deps...),
		}
	}
	return &types.Project{
		Name:     "sched-test",
		Version:  "1",
		Root:     root,
		Tasks:    taskMap,
		CacheDir: filepath.Join(root, ".lattice-cache"),
	}
}

func newTestScheduler(t *testing.T, project *types.Project) *Concurrent {
	t.Helper()
	c, err := cache.New(project.CacheDir)
	if err != nil {
		t.Fatalf("cache.New: %v", err)
	}
	r := exec.New("", filepath.Join(project.CacheDir, "exec-logs"))
	return New(project, c, r)
}

// makeGraph runs the dag.Build pipeline manually for tests in this
// package (we can't import dag here without an import cycle in tests
// across packages — but for the integration tests below we use the real
// dag package via package alias).
func makeGraph(project *types.Project) *types.Graph {
	g := &types.Graph{
		Nodes: make(map[string]*types.Task, len(project.Tasks)),
		Edges: make(map[string][]string, len(project.Tasks)),
	}
	for name, task := range project.Tasks {
		g.Nodes[name] = task
		if len(task.Deps) > 0 {
			g.Edges[name] = task.Deps
		}
	}
	return g
}

func TestRun_LinearChain(t *testing.T) {
	project := makeProject(t, map[string][]string{
		"a": nil,
		"b": {"a"},
		"c": {"b"},
	})
	graph := makeGraph(project)
	sched := newTestScheduler(t, project)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	results, err := sched.Run(ctx, graph, []string{"c"}, types.RunOptions{
		MaxParallel: 1,
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if len(results) != 3 {
		t.Errorf("expected 3 results, got %d: %+v", len(results), results)
	}
	for _, r := range results {
		if r.Err != nil {
			t.Errorf("task %s failed: %v", r.Task, r.Err)
		}
	}
}

func TestRun_NoTargets_NoOp(t *testing.T) {
	project := makeProject(t, map[string][]string{"a": nil})
	graph := makeGraph(project)
	sched := newTestScheduler(t, project)

	results, err := sched.Run(context.Background(), graph, nil, types.RunOptions{})
	if err != nil {
		t.Errorf("expected nil err for no targets, got %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected no results, got %+v", results)
	}
}

func TestRun_UnknownTarget(t *testing.T) {
	project := makeProject(t, map[string][]string{"a": nil})
	graph := makeGraph(project)
	sched := newTestScheduler(t, project)

	_, err := sched.Run(context.Background(), graph, []string{"ghost"}, types.RunOptions{})
	if err == nil {
		t.Fatal("expected error for unknown target")
	}
	if !strings.Contains(err.Error(), "ghost") {
		t.Errorf("error should mention the missing task; got %v", err)
	}
}

func TestRun_DryRun(t *testing.T) {
	project := makeProject(t, map[string][]string{
		"a": nil,
		"b": {"a"},
	})
	// Make the commands fail if actually executed, so a dry-run that
	// truly skips them passes.
	for _, task := range project.Tasks {
		task.Command = "exit 1"
	}
	graph := makeGraph(project)
	sched := newTestScheduler(t, project)

	results, err := sched.Run(context.Background(), graph, []string{"b"}, types.RunOptions{
		DryRun: true,
	})
	if err != nil {
		t.Fatalf("Run dry: %v", err)
	}
	for _, r := range results {
		if r.Err != nil {
			t.Errorf("dry-run task %s should not error: %v", r.Task, r.Err)
		}
	}
}

func TestSummarizeResults(t *testing.T) {
	results := []types.Result{
		{Task: "a", Cached: false, Duration: 100 * time.Millisecond},
		{Task: "b", Cached: true, Duration: 1 * time.Millisecond},
		{Task: "c", Err: errExpectedFailure(), Duration: 50 * time.Millisecond},
	}
	out := SummarizeResults(results)
	if !strings.Contains(out, "1 ran") || !strings.Contains(out, "1 cached") || !strings.Contains(out, "1 failed") {
		t.Errorf("unexpected summary: %q", out)
	}
}

func TestAggregateError(t *testing.T) {
	results := []types.Result{
		{Task: "ok", Err: nil},
		{Task: "bad", Err: errExpectedFailure()},
	}
	err := AggregateError(results)
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "bad") {
		t.Errorf("error should mention failed task: %v", err)
	}
}

// errExpectedFailure is a sentinel error used in tests above. Defined
// once here to avoid littering tests with anonymous errors.
type expectedErr struct{}

func (expectedErr) Error() string { return "expected failure" }

func errExpectedFailure() error { return expectedErr{} }
