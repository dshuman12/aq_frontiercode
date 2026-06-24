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

// TestBackoffGrowsPerAttempt verifies that the requeue delay after a failure
// scales with the job's own attempt count (exponential backoff anchored at the
// base delay), rather than being a fixed/oversized delay. With a generous
// max-attempts budget, the first retry must wait base, the second 2*base, the
// third 4*base.
func TestBackoffGrowsPerAttempt(t *testing.T) {
	q := New()
	id := q.Enqueue("scan", nil, 8) // large max-attempts budget
	now := time.Now()
	q.SetClock(func() time.Time { return now })
	base := time.Second
	want := []time.Duration{base, 2 * base, 4 * base} // attempts 1, 2, 3

	for attempt := 1; attempt <= 3; attempt++ {
		j, err := q.Take("scan", time.Hour)
		if err != nil {
			t.Fatalf("attempt %d: take: %v", attempt, err)
		}
		if j.Attempts != attempt {
			t.Fatalf("attempt %d: got attempts %d", attempt, j.Attempts)
		}
		if err := q.Fail(id, errors.New("boom"), base); err != nil {
			t.Fatalf("attempt %d: fail: %v", attempt, err)
		}
		got, _ := q.Get(id)
		delay := got.NextAfter.Sub(now)
		if delay != want[attempt-1] {
			t.Fatalf("attempt %d backoff = %v, want %v (delay must grow per attempt)", attempt, delay, want[attempt-1])
		}
		now = now.Add(delay) // advance past the backoff so the next Take reclaims it
	}
}
