package retry_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/retry"
)

func TestLinearSucceedsImmediately(t *testing.T) {
	called := 0
	err := retry.Linear{Attempts: 3, Delay: 0}.Run(context.Background(), func() error {
		called++
		return nil
	})
	if err != nil || called != 1 {
		t.Errorf("got err=%v called=%d", err, called)
	}
}

func TestLinearRetries(t *testing.T) {
	calls := 0
	err := retry.Linear{Attempts: 3, Delay: 0}.Run(context.Background(), func() error {
		calls++
		if calls < 2 {
			return errors.New("not yet")
		}
		return nil
	})
	if err != nil || calls != 2 {
		t.Errorf("got err=%v calls=%d", err, calls)
	}
}

func TestLinearReturnsLast(t *testing.T) {
	err := retry.Linear{Attempts: 2, Delay: 0}.Run(context.Background(), func() error {
		return errors.New("boom")
	})
	if err == nil || err.Error() != "boom" {
		t.Errorf("got %v", err)
	}
}

func TestLinearContextCancel(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	err := retry.Linear{Attempts: 5, Delay: time.Hour}.Run(ctx, func() error {
		return errors.New("fail")
	})
	if !errors.Is(err, context.Canceled) {
		t.Errorf("got %v", err)
	}
}

func TestExpDelayCapped(t *testing.T) {
	exp := retry.Exponential{Attempts: 5, Initial: 10 * time.Millisecond, Factor: 100, Cap: 50 * time.Millisecond}
	if exp.DelayFor(0) != 10*time.Millisecond {
		t.Errorf("got %v", exp.DelayFor(0))
	}
	if exp.DelayFor(1) != 50*time.Millisecond {
		t.Errorf("got %v", exp.DelayFor(1))
	}
	if exp.DelayFor(2) != 50*time.Millisecond {
		t.Errorf("got %v", exp.DelayFor(2))
	}
}

func TestExpDelayGrows(t *testing.T) {
	exp := retry.Exponential{Attempts: 5, Initial: time.Millisecond, Factor: 2, Cap: time.Second}
	if exp.DelayFor(0) != time.Millisecond {
		t.Errorf("got %v", exp.DelayFor(0))
	}
	if exp.DelayFor(2) != 4*time.Millisecond {
		t.Errorf("got %v", exp.DelayFor(2))
	}
}

func TestExpRunSuccess(t *testing.T) {
	err := retry.Exponential{Attempts: 3, Initial: 0, Factor: 2}.Run(context.Background(), func() error {
		return nil
	})
	if err != nil {
		t.Error(err)
	}
}

func TestDefault5x100ms(t *testing.T) {
	d := retry.Default5x100ms()
	if d.Attempts != 5 || d.Delay != 100*time.Millisecond {
		t.Errorf("got %+v", d)
	}
}
