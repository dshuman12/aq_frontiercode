package clock_test

import (
	"sync"
	"testing"

	"github.com/dleblanc/kindling/internal/clock"
)

func TestStartsAtZero(t *testing.T) {
	var c clock.Lamport
	if c.Now() != 0 {
		t.Errorf("got %d", c.Now())
	}
}

func TestTickIncrements(t *testing.T) {
	var c clock.Lamport
	if c.Tick() != 1 {
		t.Error("first")
	}
	if c.Tick() != 2 {
		t.Error("second")
	}
}

func TestObserveAdvances(t *testing.T) {
	var c clock.Lamport
	c.Tick()
	v := c.Observe(99)
	if v != 100 {
		t.Errorf("got %d", v)
	}
}

func TestObserveStaleIgnored(t *testing.T) {
	var c clock.Lamport
	c.Tick()
	c.Tick()
	v := c.Observe(0)
	if v != 3 {
		t.Errorf("got %d", v)
	}
}

func TestReset(t *testing.T) {
	var c clock.Lamport
	c.Tick()
	c.Reset()
	if c.Now() != 0 {
		t.Errorf("got %d", c.Now())
	}
}

func TestConcurrentTicks(t *testing.T) {
	var c clock.Lamport
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				c.Tick()
			}
		}()
	}
	wg.Wait()
	if c.Now() != 800 {
		t.Errorf("got %d", c.Now())
	}
}
