package clock

import (
	"testing"
	"time"
)

func TestSystemNowMonotonic(t *testing.T) {
	s := System{}
	a := s.Now()
	time.Sleep(time.Millisecond)
	b := s.Now()
	if !b.After(a) {
		t.Fatalf("b should be after a: %v vs %v", b, a)
	}
}

func TestSystemSinceAndSleep(t *testing.T) {
	s := System{}
	start := s.Now()
	s.Sleep(2 * time.Millisecond)
	d := s.Since(start)
	if d <= 0 {
		t.Fatalf("since = %v", d)
	}
}

func TestSystemTimerFiresAndResets(t *testing.T) {
	s := System{}
	tm := s.NewTimer(5 * time.Millisecond)
	select {
	case <-tm.C():
	case <-time.After(time.Second):
		t.Fatal("timer did not fire")
	}
	if !tm.Reset(5 * time.Millisecond) {
		t.Log("Reset on expired timer returns false, accepted")
	}
	if tm.Stop() {
		_ = tm
	}
}

func TestFakeSinceAndReset(t *testing.T) {
	f := NewFake(time.Date(2026, 5, 9, 0, 0, 0, 0, time.UTC))
	start := f.Now()
	f.Advance(2 * time.Minute)
	if d := f.Since(start); d != 2*time.Minute {
		t.Fatalf("since = %v", d)
	}
	tm := f.NewTimer(time.Minute)
	if !tm.Reset(30 * time.Second) {
		t.Fatal("Reset on active timer should return true")
	}
	f.Advance(30 * time.Second)
	select {
	case <-tm.C():
	default:
		t.Fatal("reset timer did not fire after new deadline")
	}
}
