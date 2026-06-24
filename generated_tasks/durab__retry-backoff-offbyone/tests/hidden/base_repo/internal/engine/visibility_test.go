package engine

import (
	"context"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestHistoryPagedSlices(t *testing.T) {
	fc := clock.NewFake(time.Date(2025, 11, 15, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()

	exec, _ := e.StartWorkflow(ctx, StartRequest{
		WorkflowID:   "wf",
		WorkflowType: "T",
		TaskQueue:    "default",
	})

	page, err := e.GetHistoryPaged(ctx, exec, 1, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(page.Events) == 0 || page.Events[0].ID != 1 {
		t.Fatalf("page: %+v", page)
	}
	if page.HasMore {
		t.Fatal("only one event; HasMore should be false")
	}
	if page.NextFromID != 2 {
		t.Fatalf("nextFrom = %d", page.NextFromID)
	}
}

func TestCountRunningTracksTransitions(t *testing.T) {
	fc := clock.NewFake(time.Date(2025, 11, 15, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		_, _ = e.StartWorkflow(ctx, StartRequest{
			WorkflowID:   types.WorkflowID("wf-" + string(rune('a'+i))),
			WorkflowType: "T",
			TaskQueue:    "default",
		})
	}
	n, _ := e.CountRunning(ctx, types.DefaultNamespace)
	if n != 3 {
		t.Fatalf("running = %d", n)
	}
}
