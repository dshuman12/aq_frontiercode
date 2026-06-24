package engine

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestCancelAndTerminate(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 10, 0, 0, 0, 0, time.UTC))
	e := New(storage.NewMemoryWithClock(fc), fc, log.Default)
	ctx := context.Background()
	exec, _ := e.StartWorkflow(ctx, StartRequest{
		WorkflowID:   "wf",
		WorkflowType: "T",
		TaskQueue:    "default",
	})
	if err := e.CancelWorkflow(ctx, types.DefaultNamespace, exec); err != nil {
		t.Fatal(err)
	}
	if err := e.TerminateWorkflow(ctx, types.DefaultNamespace, exec, "ops"); err != nil {
		t.Fatal(err)
	}
	if err := e.TerminateWorkflow(ctx, types.DefaultNamespace, exec, "again"); err != nil {
		t.Fatal(err)
	}
}

func TestTerminateUnknownReturnsNotFound(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 10, 0, 0, 0, 0, time.UTC))
	e := New(storage.NewMemoryWithClock(fc), fc, log.Default)
	err := e.TerminateWorkflow(context.Background(), types.DefaultNamespace,
		types.Execution{WorkflowID: "x", RunID: "y"}, "")
	if !errors.Is(err, errs.NotFound) {
		t.Fatalf("err = %v", err)
	}
}

func TestListWorkflows(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 10, 0, 0, 0, 0, time.UTC))
	e := New(storage.NewMemoryWithClock(fc), fc, log.Default)
	ctx := context.Background()
	for i := 0; i < 3; i++ {
		_, _ = e.StartWorkflow(ctx, StartRequest{
			WorkflowID:   types.WorkflowID("wf-" + string(rune('a'+i))),
			WorkflowType: "T",
			TaskQueue:    "default",
		})
	}
	out, err := e.ListWorkflows(ctx, storage.WorkflowFilter{Namespace: types.DefaultNamespace})
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 3 {
		t.Fatalf("got %d", len(out))
	}
}

func TestSettersInstallHooks(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 10, 0, 0, 0, 0, time.UTC))
	e := New(storage.NewMemoryWithClock(fc), fc, log.Default)
	e.SetMetrics(MetricsHooks{})
	e.SetIdempotencyCache(NewIdempotencyCache(time.Minute))
	if e.idemCache == nil {
		t.Fatal("idem cache not installed")
	}
}

func TestDeleteAndListSchedule(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 10, 12, 0, 0, 0, time.UTC))
	e := New(storage.NewMemoryWithClock(fc), fc, log.Default)
	ctx := context.Background()
	_ = e.CreateSchedule(ctx, CreateScheduleRequest{
		ID: "s1", Spec: "*/5 * * * *", WorkflowID: "wf", WorkflowType: "T",
	})
	scs, err := e.ListSchedules(ctx, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(scs) != 1 {
		t.Fatalf("got %d", len(scs))
	}
	if err := e.DeleteSchedule(ctx, types.DefaultNamespace, "s1"); err != nil {
		t.Fatal(err)
	}
}
