package worker

import (
	"context"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/internal/engine"
	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/internal/wasm"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestWorkerRunsActivityToResult(t *testing.T) {
	ctx := context.Background()
	fc := clock.NewFake(time.Date(2026, 5, 7, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	eng := engine.New(store, fc, log.Default)
	rt := wasm.NewRuntime(ctx, log.Default)
	defer rt.Close(ctx)
	w := New(eng, rt, Options{ID: "w-act", Clock: fc, Log: log.Default})

	if err := w.RegisterWorkflow(ctx, "Driver", wasm.NewTestModule([]byte(
		`[{"kind":"schedule_activity","schedule_activity":{"activity_type":"Echo","task_queue":"default"}}]`))); err != nil {
		t.Fatal(err)
	}
	if err := w.RegisterActivity(ctx, "Echo", wasm.NewTestActivityModule([]byte(`42`))); err != nil {
		t.Fatal(err)
	}

	exec, err := eng.StartWorkflow(ctx, engine.StartRequest{
		WorkflowID:   "wf-act",
		WorkflowType: "Driver",
		TaskQueue:    "default",
	})
	if err != nil {
		t.Fatal(err)
	}

	if did, err := w.RunOne(ctx, "default"); err != nil || !did {
		t.Fatalf("decision tick: did=%v err=%v", did, err)
	}
	if did, err := w.RunOne(ctx, "default"); err != nil || !did {
		t.Fatalf("activity tick: did=%v err=%v", did, err)
	}

	hist, _ := store.GetHistory(ctx, exec, 0, 0)
	var sawCompleted bool
	for _, ev := range hist {
		if ev.Kind == history.ActivityCompletedKind {
			a := &history.ActivityCompletedAttrs{}
			_ = ev.DecodeInto(a)
			if string(a.Result.Data) != "42" {
				t.Fatalf("activity result %q", a.Result.Data)
			}
			sawCompleted = true
		}
	}
	if !sawCompleted {
		t.Fatal("activity did not complete")
	}
}

func TestWorkerActivityUnknownTypeFails(t *testing.T) {
	ctx := context.Background()
	fc := clock.NewFake(time.Date(2026, 5, 7, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	eng := engine.New(store, fc, log.Default)
	rt := wasm.NewRuntime(ctx, log.Default)
	defer rt.Close(ctx)
	w := New(eng, rt, Options{ID: "w-act", Clock: fc, Log: log.Default})

	if err := w.RegisterWorkflow(ctx, "Driver", wasm.NewTestModule([]byte(
		`[{"kind":"schedule_activity","schedule_activity":{"activity_type":"Missing","task_queue":"default"}}]`))); err != nil {
		t.Fatal(err)
	}
	exec, _ := eng.StartWorkflow(ctx, engine.StartRequest{
		WorkflowID:   "wf",
		WorkflowType: "Driver",
		TaskQueue:    "default",
	})
	_, _ = w.RunOne(ctx, "default")
	_, _ = w.RunOne(ctx, "default")

	hist, _ := store.GetHistory(ctx, exec, 0, 0)
	var sawFailed bool
	for _, ev := range hist {
		if ev.Kind == history.ActivityFailedKind {
			sawFailed = true
		}
	}
	if !sawFailed {
		t.Fatal("expected ActivityFailed for unknown activity type")
	}
	_ = decision.KindScheduleActivity
	_ = types.DefaultNamespace
}

func TestWorkerDescribeAccessors(t *testing.T) {
	ctx := context.Background()
	fc := clock.NewFake(time.Date(2026, 5, 7, 0, 0, 0, 0, time.UTC))
	eng := engine.New(storage.NewMemoryWithClock(fc), fc, log.Default)
	rt := wasm.NewRuntime(ctx, log.Default)
	defer rt.Close(ctx)
	w := New(eng, rt, Options{ID: "w-1", Clock: fc, Log: log.Default})

	if w.DescribeID() != "w-1" {
		t.Fatalf("id = %s", w.DescribeID())
	}
	wfs, acts := w.DescribeRegistered()
	if len(wfs) != 0 || len(acts) != 0 {
		t.Fatalf("expected empty: %v %v", wfs, acts)
	}
	_ = w.RegisterWorkflow(ctx, "X", wasm.NewTestModule([]byte("[]")))
	_ = w.RegisterActivity(ctx, "Y", wasm.NewTestActivityModule([]byte(`null`)))
	wfs, acts = w.DescribeRegistered()
	if len(wfs) != 1 || wfs[0] != "X" {
		t.Fatalf("wfs = %v", wfs)
	}
	if len(acts) != 1 || acts[0] != "Y" {
		t.Fatalf("acts = %v", acts)
	}
}
