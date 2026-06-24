package throttle

import (
	"testing"
	"time"
)

func TestAllow(t *testing.T) {
	b, _ := New(5, 1)
	now := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	b.SetClock(func() time.Time { return now })
	for i := 0; i < 5; i++ {
		if !b.Allow(1) {
			t.Fatalf("denied at %d", i)
		}
	}
	if b.Allow(1) {
		t.Fatal("should be empty")
	}
	now = now.Add(time.Second)
	if !b.Allow(1) {
		t.Fatal("should refill")
	}
}

func TestWaitSeconds(t *testing.T) {
	b, _ := New(2, 4) // 4 tokens/sec
	now := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	b.SetClock(func() time.Time { return now })
	_ = b.Allow(2)
	d := b.Wait(2)
	if d <= 0 || d > time.Second {
		t.Fatalf("wait %v", d)
	}
}

func TestBadConfig(t *testing.T) {
	if _, err := New(0, 1); err == nil {
		t.Fatal("expected err")
	}
	if _, err := New(1, 0); err == nil {
		t.Fatal("expected err")
	}
}
