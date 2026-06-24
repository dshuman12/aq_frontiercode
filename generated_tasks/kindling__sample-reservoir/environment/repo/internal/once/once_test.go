package once_test

import (
	"sync"
	"testing"

	"github.com/dleblanc/kindling/internal/once"
)

func TestCellInitOnce(t *testing.T) {
	var c once.Cell[int]
	calls := 0
	for i := 0; i < 5; i++ {
		v := c.Get(func() int {
			calls++
			return 42
		})
		if v != 42 {
			t.Errorf("got %d", v)
		}
	}
	if calls != 1 {
		t.Errorf("init called %d times", calls)
	}
}

func TestCellReset(t *testing.T) {
	var c once.Cell[int]
	c.Get(func() int { return 1 })
	c.Reset()
	if got := c.Get(func() int { return 2 }); got != 2 {
		t.Errorf("got %d", got)
	}
}

func TestCellConcurrent(t *testing.T) {
	var c once.Cell[int]
	calls := 0
	var mu sync.Mutex
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			c.Get(func() int {
				mu.Lock()
				calls++
				mu.Unlock()
				return 7
			})
		}()
	}
	wg.Wait()
	if calls != 1 {
		t.Errorf("got %d", calls)
	}
}

func TestCellStringType(t *testing.T) {
	var c once.Cell[string]
	if got := c.Get(func() string { return "hi" }); got != "hi" {
		t.Errorf("got %q", got)
	}
}
