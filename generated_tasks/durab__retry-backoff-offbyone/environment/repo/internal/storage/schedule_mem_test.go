package storage

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestMemoryScheduleCRUD(t *testing.T) {
	m := newMem(t)
	ctx := context.Background()
	sc := Schedule{
		ID:           "s1",
		Spec:         "* * * * *",
		WorkflowID:   "wf",
		WorkflowType: "T",
		TaskQueue:    "default",
	}
	if err := m.CreateSchedule(ctx, sc); err != nil {
		t.Fatal(err)
	}
	if err := m.CreateSchedule(ctx, sc); !errors.Is(err, errs.AlreadyExists) {
		t.Fatalf("dup: %v", err)
	}
	got, err := m.GetSchedule(ctx, "", "s1")
	if err != nil {
		t.Fatal(err)
	}
	if got.ID != "s1" {
		t.Fatalf("got %+v", got)
	}
	if err := m.UpdateScheduleRun(ctx, "", "s1", epoch, epoch.Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	if err := m.PauseSchedule(ctx, "", "s1", true); err != nil {
		t.Fatal(err)
	}
	list, _ := m.ListSchedules(ctx, types.DefaultNamespace)
	if len(list) != 1 {
		t.Fatalf("list: %d", len(list))
	}
	due, _ := m.DueSchedules(ctx, epoch.Add(2*time.Hour), 10)
	if len(due) != 0 {
		t.Fatalf("paused should not be due: %d", len(due))
	}
	if err := m.PauseSchedule(ctx, "", "s1", false); err != nil {
		t.Fatal(err)
	}
	due, _ = m.DueSchedules(ctx, epoch.Add(2*time.Hour), 10)
	if len(due) != 1 {
		t.Fatalf("unpaused should be due: %d", len(due))
	}
	if err := m.DeleteSchedule(ctx, "", "s1"); err != nil {
		t.Fatal(err)
	}
	if _, err := m.GetSchedule(ctx, "", "s1"); !errors.Is(err, errs.NotFound) {
		t.Fatalf("get after delete: %v", err)
	}
}

func TestMemoryScheduleUnknown(t *testing.T) {
	m := newMem(t)
	ctx := context.Background()
	if err := m.PauseSchedule(ctx, "", "missing", true); !errors.Is(err, errs.NotFound) {
		t.Fatalf("err = %v", err)
	}
	if err := m.UpdateScheduleRun(ctx, "", "missing", epoch, epoch); !errors.Is(err, errs.NotFound) {
		t.Fatalf("err = %v", err)
	}
	if err := m.DeleteSchedule(ctx, "", "missing"); !errors.Is(err, errs.NotFound) {
		t.Fatalf("err = %v", err)
	}
}
