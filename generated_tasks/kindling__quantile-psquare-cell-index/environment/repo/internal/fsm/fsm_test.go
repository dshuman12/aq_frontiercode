package fsm

import (
	"sync/atomic"
	"testing"
)

func TestBasicTransition(t *testing.T) {
	m := New("pending", []Transition{
		{"pending", "start", "running"},
		{"running", "finish", "done"},
		{"running", "fail", "failed"},
	})
	if !m.Can("start") {
		t.Fatal("start should be allowed")
	}
	if err := m.Fire("start"); err != nil {
		t.Fatal(err)
	}
	if m.State() != "running" {
		t.Fatalf("got %s", m.State())
	}
}

func TestRejectInvalid(t *testing.T) {
	m := New("idle", []Transition{{"idle", "go", "busy"}})
	if err := m.Fire("nope"); err == nil {
		t.Fatal("expected err")
	}
}

func TestHook(t *testing.T) {
	var calls int32
	m := New("a", []Transition{{"a", "x", "b"}})
	m.AddHook(func(from, event, to string) {
		atomic.AddInt32(&calls, 1)
	})
	_ = m.Fire("x")
	if calls != 1 {
		t.Fatalf("got %d", calls)
	}
}

func TestHistoryReset(t *testing.T) {
	m := New("a", []Transition{{"a", "x", "b"}})
	_ = m.Fire("x")
	if len(m.History()) != 1 {
		t.Fatal("expected 1 entry")
	}
	m.Reset()
	if len(m.History()) != 0 || m.State() != "a" {
		t.Fatal("reset failed")
	}
}

func TestForceUnknown(t *testing.T) {
	m := New("a", []Transition{{"a", "x", "b"}})
	if err := m.Force("zzz"); err != ErrUnknownState {
		t.Fatalf("got %v", err)
	}
	if err := m.Force("b"); err != nil {
		t.Fatalf("got %v", err)
	}
}
