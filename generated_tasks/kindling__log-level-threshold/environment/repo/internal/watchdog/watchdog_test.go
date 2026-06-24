package watchdog

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

func TestHealthy(t *testing.T) {
	w := New(time.Hour, nil)
	if !w.Healthy() {
		t.Fatal("expected healthy")
	}
}

func TestStallTriggers(t *testing.T) {
	var fired int32
	w := New(10*time.Millisecond, func() { atomic.AddInt32(&fired, 1) })
	ctx, cancel := context.WithTimeout(context.Background(), 80*time.Millisecond)
	defer cancel()
	w.Heartbeat()
	w.Run(ctx, 5*time.Millisecond)
	if fired == 0 {
		t.Fatal("expected fire")
	}
}

func TestStop(t *testing.T) {
	w := New(time.Hour, nil)
	w.Stop()
	w.Run(context.Background(), 5*time.Millisecond)
}
