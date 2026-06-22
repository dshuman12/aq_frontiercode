package retry

import (
	"errors"
	"testing"
	"time"
)

var errTemp = errors.New("temporary")

func TestExponentialBackoff_Delays(t *testing.T) {
	p := NewExponentialBackoff(5, 10*time.Millisecond, time.Second)
	p.WithJitter(0)
	d0 := p.Delay(0)
	d1 := p.Delay(1)
	d2 := p.Delay(2)
	if d1 <= d0 { t.Fatal("d1 should be > d0") }
	if d2 <= d1 { t.Fatal("d2 should be > d1") }
}

func TestExponentialBackoff_MaxWait(t *testing.T) {
	p := NewExponentialBackoff(10, 100*time.Millisecond, 500*time.Millisecond)
	p.WithJitter(0)
	d := p.Delay(20)
	if d > 500*time.Millisecond {
		t.Fatalf("should cap at maxWait, got %v", d)
	}
}

func TestConstantBackoff(t *testing.T) {
	p := NewConstantBackoff(3, 50*time.Millisecond)
	d0 := p.Delay(0)
	d1 := p.Delay(1)
	if d0 != d1 { t.Fatal("constant backoff should be equal") }
}

func TestPolicy_ShouldRetry(t *testing.T) {
	p := NewExponentialBackoff(3, time.Millisecond, time.Second)
	if !p.ShouldRetry(0) { t.Fatal("should retry at 0") }
	if !p.ShouldRetry(1) { t.Fatal("should retry at 1") }
	if p.ShouldRetry(2) { t.Fatal("should not retry at 2") }
}

func TestPolicy_Do_Success(t *testing.T) {
	p := NewConstantBackoff(3, time.Millisecond)
	attempt := 0
	r := p.Do(func() error {
		attempt++
		if attempt < 2 { return errTemp }
		return nil
	})
	if r.Err != nil { t.Fatalf("expected success, got %v", r.Err) }
	if r.Attempts != 2 { t.Fatalf("expected 2 attempts, got %d", r.Attempts) }
}

func TestPolicy_Do_Exhausted(t *testing.T) {
	p := NewConstantBackoff(3, time.Millisecond)
	r := p.Do(func() error { return errTemp })
	if r.Err == nil { t.Fatal("expected error") }
	if r.Attempts != 3 { t.Fatalf("expected 3, got %d", r.Attempts) }
}

func TestPolicy_DoWithValue(t *testing.T) {
	p := NewConstantBackoff(3, time.Millisecond)
	r := p.DoWithValue(func() (interface{}, error) {
		return 42, nil
	})
	if r.Err != nil { t.Fatal("expected success") }
	if r.Value.(int) != 42 { t.Fatal("expected 42") }
}

func TestPolicy_Schedule(t *testing.T) {
	p := NewExponentialBackoff(4, 10*time.Millisecond, time.Second)
	p.WithJitter(0)
	s := p.Schedule()
	if len(s) != 3 { t.Fatalf("expected 3 delays, got %d", len(s)) }
}

func TestPolicy_WithJitter(t *testing.T) {
	p := NewExponentialBackoff(3, 100*time.Millisecond, time.Second)
	p.WithJitter(0.5)
	d1 := p.Delay(0)
	d2 := p.Delay(0)
	_ = d1
	_ = d2
}

func TestPolicy_WithMultiplier(t *testing.T) {
	p := NewExponentialBackoff(3, 10*time.Millisecond, time.Second)
	p.WithMultiplier(3)
	p.WithJitter(0)
	d0 := p.Delay(0)
	d1 := p.Delay(1)
	if d1 != d0*3 { t.Fatalf("expected 3x, got d0=%v d1=%v", d0, d1) }
}

func TestLinearBackoff(t *testing.T) {
	p := NewLinearBackoff(5, 10*time.Millisecond, 10*time.Millisecond)
	if p.MaxAttempts != 5 { t.Fatal("wrong max attempts") }
}
