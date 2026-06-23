package clock

import (
	"testing"
	"time"
)

var epoch = time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

func TestFakeNowDeterministic(t *testing.T) {
	f := NewFake(epoch)
	if got := f.Now(); !got.Equal(epoch) {
		t.Fatalf("now: want %v got %v", epoch, got)
	}
	f.Advance(2 * time.Second)
	if got := f.Now(); !got.Equal(epoch.Add(2*time.Second)) {
		t.Fatalf("after advance: got %v", got)
	}
}

func TestFakeTimerFires(t *testing.T) {
	f := NewFake(epoch)
	tm := f.NewTimer(50 * time.Millisecond)
	f.Advance(49 * time.Millisecond)
	select {
	case <-tm.C():
		t.Fatal("fired early")
	default:
	}
	f.Advance(1 * time.Millisecond)
	select {
	case at := <-tm.C():
		if !at.Equal(epoch.Add(50 * time.Millisecond)) {
			t.Fatalf("fire time %v", at)
		}
	default:
		t.Fatal("did not fire on deadline")
	}
}

func TestFakeTimerStop(t *testing.T) {
	f := NewFake(epoch)
	tm := f.NewTimer(time.Second)
	if !tm.Stop() {
		t.Fatal("Stop returned false on active timer")
	}
	f.Advance(2 * time.Second)
	select {
	case <-tm.C():
		t.Fatal("stopped timer fired")
	default:
	}
}

func TestFakeMultiTimerOrder(t *testing.T) {
	f := NewFake(epoch)
	t1 := f.NewTimer(30 * time.Millisecond)
	t2 := f.NewTimer(10 * time.Millisecond)
	t3 := f.NewTimer(20 * time.Millisecond)
	f.Advance(40 * time.Millisecond)
	for _, tm := range []Timer{t2, t3, t1} {
		select {
		case <-tm.C():
		default:
			t.Fatal("timer did not fire after window")
		}
	}
}
