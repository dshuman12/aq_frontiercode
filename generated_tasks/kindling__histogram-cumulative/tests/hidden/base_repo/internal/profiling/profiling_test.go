package profiling_test

import (
	"sync"
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/profiling"
)

func TestCounterInc(t *testing.T) {
	var c profiling.Counter
	for i := 0; i < 5; i++ {
		c.Inc()
	}
	if c.Get() != 5 {
		t.Errorf("got %d", c.Get())
	}
}

func TestCounterAdd(t *testing.T) {
	var c profiling.Counter
	c.Add(10)
	c.Add(7)
	if c.Get() != 17 {
		t.Errorf("got %d", c.Get())
	}
}

func TestCounterReset(t *testing.T) {
	var c profiling.Counter
	c.Add(99)
	c.Reset()
	if c.Get() != 0 {
		t.Errorf("got %d", c.Get())
	}
}

func TestCounterConcurrent(t *testing.T) {
	var c profiling.Counter
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				c.Inc()
			}
		}()
	}
	wg.Wait()
	if c.Get() != 800 {
		t.Errorf("got %d", c.Get())
	}
}

func TestMeasure(t *testing.T) {
	v, span := profiling.Measure("noop", func() int { return 42 })
	if v != 42 {
		t.Errorf("got %d", v)
	}
	if span.Name != "noop" {
		t.Errorf("got %q", span.Name)
	}
}

func TestSpanMillis(t *testing.T) {
	s := profiling.Span{Duration: 7 * time.Millisecond}
	if s.Millis() != 7 {
		t.Errorf("got %d", s.Millis())
	}
}

func TestTimer(t *testing.T) {
	var captured profiling.Span
	timer := profiling.NewTimer("body", func(s profiling.Span) {
		captured = s
	})
	time.Sleep(2 * time.Millisecond)
	timer.Stop()
	if captured.Name != "body" {
		t.Errorf("got %q", captured.Name)
	}
}
