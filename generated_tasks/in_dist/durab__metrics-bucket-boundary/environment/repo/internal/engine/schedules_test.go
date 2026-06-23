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

func TestCreateScheduleInvalidSpec(t *testing.T) {
	fc := clock.NewFake(time.Date(2025, 8, 15, 0, 0, 0, 0, time.UTC))
	e := New(storage.NewMemoryWithClock(fc), fc, log.Default)
	err := e.CreateSchedule(context.Background(), CreateScheduleRequest{
		ID:           "s1",
		Spec:         "bad expr",
		WorkflowType: "X",
	})
	if !errors.Is(err, errs.Invalid) {
		t.Fatalf("want Invalid, got %v", err)
	}
}

func TestRunSchedulesFiresOnlyDue(t *testing.T) {
	fc := clock.NewFake(time.Date(2025, 8, 15, 12, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()

	if err := e.CreateSchedule(ctx, CreateScheduleRequest{
		ID:           "s1",
		Spec:         "*/5 * * * *",
		WorkflowType: "Greet",
		WorkflowID:   "wf-x",
	}); err != nil {
		t.Fatal(err)
	}

	n, err := e.RunSchedules(ctx, 0)
	if err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Fatalf("expected 0 fired, got %d", n)
	}
	fc.Advance(6 * time.Minute)
	n, err = e.RunSchedules(ctx, 0)
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Fatalf("expected 1 fired, got %d", n)
	}
	sc, err := store.GetSchedule(ctx, types.DefaultNamespace, "s1")
	if err != nil {
		t.Fatal(err)
	}
	if sc.NextRun.Before(fc.Now()) {
		t.Fatalf("next run not advanced: %v vs now %v", sc.NextRun, fc.Now())
	}
}

func TestPauseSkipsFiring(t *testing.T) {
	fc := clock.NewFake(time.Date(2025, 8, 15, 12, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()
	_ = e.CreateSchedule(ctx, CreateScheduleRequest{
		ID: "s1", Spec: "*/5 * * * *", WorkflowType: "Greet", WorkflowID: "wf-x",
	})
	_ = e.PauseSchedule(ctx, types.DefaultNamespace, "s1", true)
	fc.Advance(time.Hour)
	n, _ := e.RunSchedules(ctx, 0)
	if n != 0 {
		t.Fatalf("paused schedule fired: %d", n)
	}
}
