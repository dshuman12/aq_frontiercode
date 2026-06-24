package backoff_test

import (
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/backoff"
)

func TestConstant(t *testing.T) {
	s := backoff.NewConstant(50 * time.Millisecond)
	for i := 0; i < 5; i++ {
		if s.Next() != 50*time.Millisecond {
			t.Errorf("got %v", s.Next())
		}
	}
}

func TestExponentialGrows(t *testing.T) {
	s := backoff.NewExponential(time.Millisecond, 2, time.Hour, 0)
	first := s.Next()
	second := s.Next()
	if second <= first {
		t.Errorf("got first=%v second=%v", first, second)
	}
}

func TestExponentialCap(t *testing.T) {
	s := backoff.NewExponential(time.Millisecond, 100, 5*time.Millisecond, 0)
	s.Next()
	for i := 0; i < 10; i++ {
		s.Next()
	}
	got := s.Next()
	if got > 5*time.Millisecond+1*time.Millisecond {
		t.Errorf("got %v", got)
	}
}

func TestExponentialReset(t *testing.T) {
	s := backoff.NewExponential(time.Millisecond, 2, time.Hour, 0)
	s.Next()
	s.Next()
	s.Reset()
	if s.Next() != time.Millisecond {
		t.Errorf("got %v", s.Next())
	}
}

func TestFibonacciFn(t *testing.T) {
	cases := map[int]int{0: 0, 1: 1, 2: 1, 3: 2, 4: 3, 5: 5, 6: 8}
	for n, want := range cases {
		if got := backoff.FibonacciFn(n); got != want {
			t.Errorf("Fib(%d)=%d want %d", n, got, want)
		}
	}
}

func TestFibBackoff(t *testing.T) {
	s := backoff.NewFib(time.Millisecond, 0)
	wants := []int{1, 1, 2, 3, 5}
	for _, w := range wants {
		if got := s.Next(); got != time.Duration(w)*time.Millisecond {
			t.Errorf("got %v want %dms", got, w)
		}
	}
}

func TestFibBackoffCap(t *testing.T) {
	s := backoff.NewFib(time.Millisecond, 3*time.Millisecond)
	s.Next() // 1
	s.Next() // 1
	s.Next() // 2
	if got := s.Next(); got != 3*time.Millisecond {
		t.Errorf("got %v", got)
	}
}

func TestFibReset(t *testing.T) {
	s := backoff.NewFib(time.Millisecond, 0)
	s.Next()
	s.Reset()
	if got := s.Next(); got != time.Millisecond {
		t.Errorf("got %v", got)
	}
}

func TestClamp(t *testing.T) {
	if backoff.Clamp(-time.Second, time.Hour) != 0 {
		t.Error("negative")
	}
	if backoff.Clamp(2*time.Hour, time.Hour) != time.Hour {
		t.Error("over cap")
	}
	if backoff.Clamp(0, 0) != 0 {
		t.Error("zero cap")
	}
}

func TestAverage(t *testing.T) {
	s := backoff.NewConstant(10 * time.Millisecond)
	if got := backoff.Average(s, 5); got != 10*time.Millisecond {
		t.Errorf("got %v", got)
	}
}
