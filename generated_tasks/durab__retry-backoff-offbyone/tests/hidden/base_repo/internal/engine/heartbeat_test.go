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

func TestHeartbeatRoundTrip(t *testing.T) {
	fc := clock.NewFake(time.Date(2025, 10, 28, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)

	exec := types.Execution{WorkflowID: "wf", RunID: "r1"}
	aid := types.ActivityID(7)
	e.RecordHeartbeat(context.Background(), exec, aid, []byte("progress=10%"))
	at, b, ok := e.LastHeartbeat(exec, aid)
	if !ok {
		t.Fatal("heartbeat missing")
	}
	if !at.Equal(fc.Now()) {
		t.Fatalf("at = %v", at)
	}
	if string(b) != "progress=10%" {
		t.Fatalf("details = %q", b)
	}
}

func TestHeartbeatAbsent(t *testing.T) {
	fc := clock.NewFake(time.Date(2025, 10, 28, 0, 0, 0, 0, time.UTC))
	e := New(storage.NewMemoryWithClock(fc), fc, log.Default)
	if _, _, ok := e.LastHeartbeat(types.Execution{WorkflowID: "x"}, 1); ok {
		t.Fatal("expected no heartbeat")
	}
}
