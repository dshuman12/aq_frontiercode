package shipper

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"
)

func TestSubmitBatch(t *testing.T) {
	var calls int32
	sink := func(ctx context.Context, batch [][]byte) error {
		atomic.AddInt32(&calls, 1)
		return nil
	}
	s := New(Config{BatchSize: 3}, sink)
	for i := 0; i < 7; i++ {
		_ = s.Submit(context.Background(), []byte{byte(i)})
	}
	_ = s.Flush(context.Background())
	if calls < 2 {
		t.Fatalf("calls %d", calls)
	}
	if s.Pending() != 0 {
		t.Fatalf("pending %d", s.Pending())
	}
}

func TestRetryThenDrop(t *testing.T) {
	dropped := false
	sink := func(ctx context.Context, batch [][]byte) error { return errors.New("nope") }
	s := New(Config{
		BatchSize:   1,
		MaxAttempts: 2,
		Backoff:     time.Millisecond,
		OnDrop:      func(b [][]byte, err error) { dropped = true },
	}, sink)
	_ = s.Submit(context.Background(), []byte("x"))
	_ = s.Flush(context.Background())
	if !dropped {
		t.Fatal("expected drop")
	}
}

func TestSubmitAfterClose(t *testing.T) {
	s := New(Config{BatchSize: 10}, func(context.Context, [][]byte) error { return nil })
	_ = s.Close(context.Background())
	if err := s.Submit(context.Background(), []byte{1}); err == nil {
		t.Fatal("expected err")
	}
}
