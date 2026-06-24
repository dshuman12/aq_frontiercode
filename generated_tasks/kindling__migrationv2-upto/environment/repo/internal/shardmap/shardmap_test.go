package shardmap

import (
	"sync"
	"sync/atomic"
	"testing"
)

func TestSetGet(t *testing.T) {
	m := New[int](16)
	m.Set("a", 1)
	m.Set("b", 2)
	if v, ok := m.Get("a"); !ok || v != 1 {
		t.Fatalf("got %v %v", v, ok)
	}
	if m.Len() != 2 {
		t.Fatalf("len %d", m.Len())
	}
}

func TestDelete(t *testing.T) {
	m := New[int](16)
	m.Set("a", 1)
	m.Delete("a")
	if _, ok := m.Get("a"); ok {
		t.Fatal("not deleted")
	}
}

func TestUpdate(t *testing.T) {
	m := New[int](16)
	m.Update("k", func(prev int, ok bool) int { return prev + 1 })
	m.Update("k", func(prev int, ok bool) int { return prev + 1 })
	v, _ := m.Get("k")
	if v != 2 {
		t.Fatalf("got %d", v)
	}
}

func TestConcurrentSafe(t *testing.T) {
	m := New[int](16)
	var wg sync.WaitGroup
	var ops int32
	for w := 0; w < 8; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < 1000; i++ {
				m.Set("k", i)
				_, _ = m.Get("k")
				atomic.AddInt32(&ops, 1)
			}
		}()
	}
	wg.Wait()
	if ops != 8000 {
		t.Fatalf("ops %d", ops)
	}
}

func TestEach(t *testing.T) {
	m := New[int](4)
	for _, k := range []string{"a", "b", "c"} {
		m.Set(k, 1)
	}
	count := 0
	m.Each(func(k string, v int) bool { count++; return true })
	if count != 3 {
		t.Fatalf("count %d", count)
	}
}
