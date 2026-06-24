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

func TestHeartbeatConcurrentWrites(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC))
	e := New(storage.NewMemoryWithClock(fc), fc, log.Default)
	exec := types.Execution{WorkflowID: "wf", RunID: "r"}
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				e.RecordHeartbeat(context.Background(), exec, types.ActivityID(1), []byte("x"))
			}
		}(i)
	}
	wg.Wait()
	if _, _, ok := e.LastHeartbeat(exec, types.ActivityID(1)); !ok {
		t.Fatal("expected heartbeat")
	}
}
