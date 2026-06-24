package alerts

import (
	"testing"
	"time"
)

func TestFiringTransitions(t *testing.T) {
	e := NewEngine()
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	e.SetClock(func() time.Time { return now })
	if err := e.Register(&Rule{Name: "high_cpu", Op: ">", Threshold: 80, For: time.Minute}); err != nil {
		t.Fatal(err)
	}
	for _, dt := range []time.Duration{0, 30 * time.Second, time.Minute} {
		e.Observe("high_cpu", Sample{Time: now.Add(dt), Value: 90})
	}
	a := e.Snapshot()[0]
	if a.State != StateFiring {
		t.Fatalf("got %s", a.State)
	}
}

func TestPendingNeverFires(t *testing.T) {
	e := NewEngine()
	now := time.Now()
	_ = e.Register(&Rule{Name: "x", Op: ">", Threshold: 1, For: time.Hour})
	e.Observe("x", Sample{Time: now, Value: 5})
	a := e.Snapshot()[0]
	if a.State != StatePending {
		t.Fatalf("got %s", a.State)
	}
}

func TestResolved(t *testing.T) {
	e := NewEngine()
	now := time.Now()
	_ = e.Register(&Rule{Name: "x", Op: ">", Threshold: 1, For: time.Second})
	e.Observe("x", Sample{Time: now, Value: 5})
	e.Observe("x", Sample{Time: now.Add(2 * time.Second), Value: 5})
	e.Observe("x", Sample{Time: now.Add(3 * time.Second), Value: 0})
	if e.Snapshot()[0].State != StateResolved {
		t.Fatalf("got %s", e.Snapshot()[0].State)
	}
}

func TestActive(t *testing.T) {
	e := NewEngine()
	now := time.Now()
	_ = e.Register(&Rule{Name: "x", Op: ">", Threshold: 0, For: 0})
	e.Observe("x", Sample{Time: now, Value: 1})
	e.Observe("x", Sample{Time: now.Add(time.Second), Value: 1})
	if len(e.Active()) != 1 {
		t.Fatalf("active %v", e.Active())
	}
}

func TestRegisterRejectsBadOp(t *testing.T) {
	e := NewEngine()
	if err := e.Register(&Rule{Name: "x", Op: "??", Threshold: 1}); err == nil {
		t.Fatal("expected err")
	}
	if err := e.Register(&Rule{Op: ">", Threshold: 1}); err == nil {
		t.Fatal("expected name err")
	}
}
