package engine

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestEngineStartIsRaceFree(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()

	const n = 16
	var wg sync.WaitGroup
	var mu sync.Mutex
	seen := make(map[types.RunID]struct{}, n)

	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			exec, err := e.StartWorkflow(ctx, StartRequest{
				WorkflowID:   types.WorkflowID("wf-" + string(rune('a'+i))),
				WorkflowType: "T",
				TaskQueue:    "default",
			})
			if err != nil {
				t.Errorf("start: %v", err)
				return
			}
			mu.Lock()
			defer mu.Unlock()
			if _, dup := seen[exec.RunID]; dup {
				t.Errorf("duplicate run id %s", exec.RunID)
			}
			seen[exec.RunID] = struct{}{}
		}(i)
	}
	wg.Wait()
	if len(seen) != n {
		t.Fatalf("expected %d unique runs, got %d", n, len(seen))
	}
}
