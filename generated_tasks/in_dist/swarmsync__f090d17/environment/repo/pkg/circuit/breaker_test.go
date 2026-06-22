package circuit

import (
	"errors"
	"testing"
	"time"
)

var errFail = errors.New("fail")

func TestBreaker_InitClosed(t *testing.T) {
	b := NewBreaker()
	if b.CurrentState() != StateClosed {
		t.Fatal("should start closed")
	}
}

func TestBreaker_OpensAfterFailures(t *testing.T) {
	b := NewBreaker(WithFailThreshold(3))
	for i := 0; i < 3; i++ {
		b.Execute(func() error { return errFail })
	}
	if b.CurrentState() != StateOpen {
		t.Fatal("should be open after 3 failures")
	}
}

func TestBreaker_RejectsWhenOpen(t *testing.T) {
	b := NewBreaker(WithFailThreshold(1), WithTimeout(time.Hour))
	b.Execute(func() error { return errFail })
	err := b.Execute(func() error { return nil })
	if !errors.Is(err, ErrOpen) {
		t.Fatalf("expected ErrOpen, got %v", err)
	}
}

func TestBreaker_HalfOpenAfterTimeout(t *testing.T) {
	b := NewBreaker(WithFailThreshold(1), WithTimeout(10*time.Millisecond))
	b.Execute(func() error { return errFail })
	time.Sleep(20 * time.Millisecond)
	if b.CurrentState() != StateHalfOpen {
		t.Fatal("should be half-open after timeout")
	}
}

func TestBreaker_ClosesOnHalfOpenSuccess(t *testing.T) {
	b := NewBreaker(WithFailThreshold(1), WithTimeout(10*time.Millisecond), WithSuccessThreshold(2), WithHalfOpenMax(5))
	b.Execute(func() error { return errFail })
	time.Sleep(20 * time.Millisecond)
	b.Execute(func() error { return nil })
	b.Execute(func() error { return nil })
	if b.CurrentState() != StateClosed {
		t.Fatalf("should be closed, got %s", b.CurrentState())
	}
}

func TestBreaker_HalfOpenReopensOnFail(t *testing.T) {
	b := NewBreaker(WithFailThreshold(1), WithTimeout(10*time.Millisecond))
	b.Execute(func() error { return errFail })
	time.Sleep(20 * time.Millisecond)
	b.Execute(func() error { return errFail })
	if b.CurrentState() != StateOpen {
		t.Fatal("should reopen on half-open failure")
	}
}

func TestBreaker_Reset(t *testing.T) {
	b := NewBreaker(WithFailThreshold(1))
	b.Execute(func() error { return errFail })
	b.Reset()
	if b.CurrentState() != StateClosed {
		t.Fatal("should be closed after reset")
	}
}

func TestBreaker_Counts(t *testing.T) {
	b := NewBreaker(WithFailThreshold(10))
	b.Execute(func() error { return nil })
	b.Execute(func() error { return errFail })
	c := b.CurrentCounts()
	if c.Successes != 1 || c.Failures != 1 {
		t.Fatalf("expected 1/1, got %d/%d", c.Successes, c.Failures)
	}
}

func TestBreaker_StateString(t *testing.T) {
	if StateClosed.String() != "closed" { t.Fatal("wrong") }
	if StateOpen.String() != "open" { t.Fatal("wrong") }
	if StateHalfOpen.String() != "half-open" { t.Fatal("wrong") }
}

func TestBreaker_OnStateChange(t *testing.T) {
	transitions := 0
	b := NewBreaker(WithFailThreshold(1), WithOnStateChange(func(from, to State) { transitions++ }))
	b.Execute(func() error { return errFail })
	if transitions != 1 { t.Fatalf("expected 1 transition, got %d", transitions) }
}

func TestBreaker_SuccessInClosed(t *testing.T) {
	b := NewBreaker()
	err := b.Execute(func() error { return nil })
	if err != nil { t.Fatal("should succeed") }
	c := b.CurrentCounts()
	if c.ConsecutiveOK != 1 { t.Fatal("should track consecutive ok") }
}
