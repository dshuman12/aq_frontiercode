package jobqueue

import (
	"errors"
	"testing"
	"time"
)

func TestEnqueueTakeComplete(t *testing.T) {
	q := New()
	id := q.Enqueue("scan", []byte("p"), 3)
	j, err := q.Take("scan", time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if j.ID != id || j.State != StateRunning {
		t.Fatalf("got %+v", j)
	}
	_ = q.Complete(id)
	got, _ := q.Get(id)
	if got.State != StateDone {
		t.Fatalf("got %s", got.State)
	}
}

func TestRetryOnFail(t *testing.T) {
	q := New()
	id := q.Enqueue("scan", nil, 3)
	now := time.Now()
	q.SetClock(func() time.Time { return now })
	_, _ = q.Take("scan", time.Minute)
	_ = q.Fail(id, errors.New("boom"), time.Second)
	now = now.Add(2 * time.Second)
	j, err := q.Take("scan", time.Minute)
	if err != nil {
		t.Fatalf("expected requeue: %v", err)
	}
	if j.Attempts != 2 {
		t.Fatalf("attempts %d", j.Attempts)
	}
}

func TestExhaustsAttempts(t *testing.T) {
	q := New()
	id := q.Enqueue("scan", nil, 1)
	now := time.Now()
	q.SetClock(func() time.Time { return now })
	_, _ = q.Take("scan", time.Minute)
	_ = q.Fail(id, errors.New("boom"), 0)
	got, _ := q.Get(id)
	if got.State != StateFailed {
		t.Fatalf("got %s", got.State)
	}
}

func TestVisibilityReclaim(t *testing.T) {
	q := New()
	id := q.Enqueue("scan", nil, 5)
	now := time.Now()
	q.SetClock(func() time.Time { return now })
	_, _ = q.Take("scan", time.Second)
	now = now.Add(2 * time.Second)
	j, err := q.Take("scan", time.Second)
	if err != nil || j.ID != id {
		t.Fatalf("expected reclaim, got %v %v", j, err)
	}
}

func TestStats(t *testing.T) {
	q := New()
	for i := 0; i < 3; i++ {
		_ = q.Enqueue("scan", nil, 3)
	}
	s := q.Stats()
	if s.Enqueued != 3 {
		t.Fatalf("got %+v", s)
	}
}

func TestEmpty(t *testing.T) {
	q := New()
	if _, err := q.Take("nope", time.Minute); err != ErrEmpty {
		t.Fatalf("got %v", err)
	}
}
