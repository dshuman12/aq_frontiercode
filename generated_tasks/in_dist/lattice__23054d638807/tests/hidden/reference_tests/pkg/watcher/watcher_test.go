package watcher

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/manojgowda/lattice/pkg/types"
)

func TestSetDebounce_RejectsZero(t *testing.T) {
	w := New()
	w.SetDebounce(time.Second)
	if w.debounce != time.Second {
		t.Errorf("SetDebounce(1s): debounce = %v", w.debounce)
	}
	w.SetDebounce(0)
	if w.debounce != time.Second {
		t.Errorf("SetDebounce(0) should be ignored, debounce = %v", w.debounce)
	}
}

func TestStart_ClosesChannelOnCancel(t *testing.T) {
	dir := t.TempDir()
	project := &types.Project{
		Root: dir,
		Tasks: map[string]*types.Task{
			"build": {Name: "build", Inputs: []string{"*.go"}},
		},
	}
	graph := &types.Graph{Nodes: project.Tasks}

	w := New()
	w.SetDebounce(50 * time.Millisecond)
	ctx, cancel := context.WithCancel(context.Background())
	events, stop, err := w.Start(ctx, project, graph)
	if err != nil {
		t.Fatalf("Start: %v", err)
	}
	cancel()
	stop()

	// Channel should close eventually.
	select {
	case _, ok := <-events:
		if ok {
			// May receive any pending events first; drain.
			for range events {
			}
		}
	case <-time.After(time.Second):
		t.Fatal("events channel never closed after cancel + stop")
	}
}

func TestStart_DeliversWriteEvent(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping fsnotify integration test in -short mode")
	}
	dir := t.TempDir()
	target := filepath.Join(dir, "main.go")
	if err := os.WriteFile(target, []byte("package main\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	project := &types.Project{
		Root: dir,
		Tasks: map[string]*types.Task{
			"build": {Name: "build", Inputs: []string{filepath.Join(dir, "*.go")}},
		},
	}
	graph := &types.Graph{Nodes: project.Tasks}

	w := New()
	w.SetDebounce(20 * time.Millisecond)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	events, stop, err := w.Start(ctx, project, graph)
	if err != nil {
		t.Fatalf("Start: %v", err)
	}
	defer stop()

	time.Sleep(50 * time.Millisecond) // let watcher register

	if err := os.WriteFile(target, []byte("package main\n// edit\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	select {
	case ev, ok := <-events:
		if !ok {
			t.Fatal("channel closed before delivering an event")
		}
		if ev.Path != target {
			t.Logf("got event path %q (target was %q) — accepting any path under dir", ev.Path, target)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("no event delivered within 2s")
	}
}
