package cache

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/manojgowda/lattice/pkg/types"
)

// helper: create a fresh DiskCache rooted in a temp dir.
func newTestCache(t *testing.T) *DiskCache {
	t.Helper()
	dir := t.TempDir()
	c, err := New(dir)
	if err != nil {
		t.Fatalf("cache.New: %v", err)
	}
	return c
}

// helper: create a project with a single task pointing at the given
// input files.
func newTestProject(t *testing.T, root string, inputs []string) (*types.Project, *types.Task) {
	t.Helper()
	task := &types.Task{
		Name:    "build",
		Command: "echo hello",
		Inputs:  inputs,
		Outputs: []string{"out.txt"},
		Env:     map[string]string{"FOO": "bar"},
	}
	project := &types.Project{
		Name:    "test",
		Version: "1",
		Root:    root,
		Tasks:   map[string]*types.Task{"build": task},
	}
	return project, task
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
}

func TestNew_CreatesSubdirs(t *testing.T) {
	dir := t.TempDir()
	if _, err := New(dir); err != nil {
		t.Fatalf("New: %v", err)
	}
	for _, sub := range []string{"entries", "blobs", "stdout", "stderr"} {
		path := filepath.Join(dir, sub)
		if _, err := os.Stat(path); err != nil {
			t.Errorf("expected subdir %s to exist: %v", sub, err)
		}
	}
}

func TestHash_DeterministicAcrossRuns(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, "a.go"), "package main\n")
	writeFile(t, filepath.Join(root, "b.go"), "package main\n")
	project, task := newTestProject(t, root, []string{"*.go"})

	c := newTestCache(t)
	h1, err := c.Hash(task, project)
	if err != nil {
		t.Fatalf("Hash 1: %v", err)
	}
	h2, err := c.Hash(task, project)
	if err != nil {
		t.Fatalf("Hash 2: %v", err)
	}
	if h1 != h2 {
		t.Errorf("Hash not deterministic: %s vs %s", h1, h2)
	}
}

func TestHash_ChangesOnInputContent(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, "a.go"), "package main\n")
	project, task := newTestProject(t, root, []string{"*.go"})

	c := newTestCache(t)
	h1, _ := c.Hash(task, project)

	// Modify the input file.
	writeFile(t, filepath.Join(root, "a.go"), "package main // edit\n")
	h2, _ := c.Hash(task, project)

	if h1 == h2 {
		t.Error("Hash should change when input content changes")
	}
}

func TestHash_StableAcrossEnvIteration(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, "a.go"), "package main\n")

	taskA := &types.Task{
		Name: "x", Command: "go build", Inputs: []string{"*.go"},
		Env: map[string]string{"A": "1", "B": "2", "C": "3"},
	}
	taskB := &types.Task{
		Name: "x", Command: "go build", Inputs: []string{"*.go"},
		Env: map[string]string{"C": "3", "B": "2", "A": "1"},
	}
	project := &types.Project{
		Name: "p", Version: "1", Root: root,
		Tasks: map[string]*types.Task{"x": taskA},
	}

	c := newTestCache(t)
	hA, _ := c.Hash(taskA, project)
	hB, _ := c.Hash(taskB, project)
	if hA != hB {
		t.Errorf("Hash should be stable across env map iteration order: %s vs %s", hA, hB)
	}
}

func TestPutGet_RoundTrip(t *testing.T) {
	c := newTestCache(t)
	entry := &types.CacheEntry{
		Key:      types.CacheKey("abc123"),
		Outputs:  map[string]string{"bin/x": "deadbeef"},
		ExitCode: 0,
	}
	if err := c.Put(entry); err != nil {
		t.Fatalf("Put: %v", err)
	}
	got, err := c.Get(entry.Key)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got == nil {
		t.Fatal("Get returned nil after Put")
	}
	if got.Key != entry.Key {
		t.Errorf("Get.Key = %s, want %s", got.Key, entry.Key)
	}
	if got.Outputs["bin/x"] != "deadbeef" {
		t.Errorf("Get.Outputs lost data: %v", got.Outputs)
	}
}

func TestGet_MissReturnsNilNil(t *testing.T) {
	c := newTestCache(t)
	got, err := c.Get(types.CacheKey("nonexistent"))
	if err != nil {
		t.Errorf("Get(miss): unexpected err: %v", err)
	}
	if got != nil {
		t.Errorf("Get(miss): expected nil entry, got %+v", got)
	}
}

func TestInvalidate_RemovesEntry(t *testing.T) {
	c := newTestCache(t)
	entry := &types.CacheEntry{Key: types.CacheKey("xyz"), ExitCode: 0}
	if err := c.Put(entry); err != nil {
		t.Fatalf("Put: %v", err)
	}
	if err := c.Invalidate(entry.Key); err != nil {
		t.Fatalf("Invalidate: %v", err)
	}
	got, err := c.Get(entry.Key)
	if err != nil {
		t.Fatalf("Get post-invalidate: %v", err)
	}
	if got != nil {
		t.Error("entry still present after Invalidate")
	}
}

func TestStats_TracksHitsMisses(t *testing.T) {
	c := newTestCache(t)
	entry := &types.CacheEntry{Key: types.CacheKey("k1"), ExitCode: 0}
	_ = c.Put(entry)

	_, _ = c.Get(types.CacheKey("k1"))         // hit
	_, _ = c.Get(types.CacheKey("k1"))         // hit
	_, _ = c.Get(types.CacheKey("missing"))    // miss
	_, _ = c.Get(types.CacheKey("alsomissed")) // miss

	stats := c.Stats()
	if stats.Hits != 2 {
		t.Errorf("Hits = %d, want 2", stats.Hits)
	}
	if stats.Misses != 2 {
		t.Errorf("Misses = %d, want 2", stats.Misses)
	}
	if stats.Stores != 1 {
		t.Errorf("Stores = %d, want 1", stats.Stores)
	}
}

func TestExpandGlobs_PlainPattern(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, "a.go"), "")
	writeFile(t, filepath.Join(root, "b.go"), "")
	writeFile(t, filepath.Join(root, "c.txt"), "")

	files, err := expandGlobs(root, []string{"*.go"})
	if err != nil {
		t.Fatalf("expandGlobs: %v", err)
	}
	if len(files) != 2 {
		t.Errorf("expected 2 .go files, got %d: %v", len(files), files)
	}
}

func TestExpandGlobs_DoubleStarRecursive(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, "pkg", "a.go"), "")
	writeFile(t, filepath.Join(root, "pkg", "sub", "b.go"), "")
	writeFile(t, filepath.Join(root, "pkg", "sub", "deeper", "c.go"), "")

	files, err := expandGlobs(root, []string{"pkg/**/*.go"})
	if err != nil {
		t.Fatalf("expandGlobs: %v", err)
	}
	if len(files) < 2 {
		t.Errorf("expected at least 2 .go files via **, got %d: %v", len(files), files)
	}
}

func TestExpandGlobs_Exclusions(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, "a.go"), "")
	writeFile(t, filepath.Join(root, "vendor", "ext.go"), "")

	files, err := expandGlobs(root, []string{"**/*.go", "!vendor/*"})
	if err != nil {
		t.Fatalf("expandGlobs: %v", err)
	}
	for _, f := range files {
		if filepath.Base(filepath.Dir(f)) == "vendor" {
			t.Errorf("exclusion failed: %s", f)
		}
	}
}
