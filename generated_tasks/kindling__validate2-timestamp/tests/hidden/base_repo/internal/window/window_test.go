package window_test

import (
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/window"
)

func TestEmpty(t *testing.T) {
	w := window.New(time.Hour)
	if w.Count() != 0 || w.Mean() != 0 || w.Sum() != 0 {
		t.Error("expected zeros")
	}
}

func TestObserveAndAggregate(t *testing.T) {
	w := window.New(time.Hour)
	for _, v := range []float64{1, 2, 3, 4, 5} {
		w.Observe(v)
	}
	if w.Count() != 5 {
		t.Errorf("got %d", w.Count())
	}
	if w.Sum() != 15 {
		t.Errorf("got %v", w.Sum())
	}
	if w.Mean() != 3 {
		t.Errorf("got %v", w.Mean())
	}
}

func TestEvictionAfterSpan(t *testing.T) {
	w := window.New(time.Minute)
	now := time.Now()
	w.SetNow(func() time.Time { return now })
	w.Observe(10)
	now = now.Add(2 * time.Minute)
	w.SetNow(func() time.Time { return now })
	if w.Count() != 0 {
		t.Errorf("got %d", w.Count())
	}
}

func TestSnapshotIsCopy(t *testing.T) {
	w := window.New(time.Hour)
	w.Observe(1)
	snap := w.Snapshot()
	snap[0].Value = 999
	if w.Sum() != 1 {
		t.Errorf("snapshot leaked: %v", w.Sum())
	}
}

func TestPartialEviction(t *testing.T) {
	w := window.New(time.Hour)
	now := time.Date(2026, 5, 4, 12, 0, 0, 0, time.UTC)
	w.SetNow(func() time.Time { return now })
	w.Observe(1)
	now = now.Add(30 * time.Minute)
	w.SetNow(func() time.Time { return now })
	w.Observe(2)
	now = now.Add(40 * time.Minute)
	w.SetNow(func() time.Time { return now })
	if w.Count() != 1 {
		t.Errorf("got %d", w.Count())
	}
	if w.Sum() != 2 {
		t.Errorf("got %v", w.Sum())
	}
}
