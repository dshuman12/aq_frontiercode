package ids

import (
	"strings"
	"sync"
	"testing"
)

func TestNewRunIsStable(t *testing.T) {
	a := NewRun()
	if len(a) != 26 {
		t.Fatalf("want 26 chars, got %d (%q)", len(a), a)
	}
	if strings.ContainsAny(a, "ILOUilou") {
		t.Fatalf("alphabet leaked: %q", a)
	}
}

func TestNewRunUnique(t *testing.T) {
	seen := make(map[string]struct{}, 1024)
	for i := 0; i < 1024; i++ {
		id := NewRun()
		if _, ok := seen[id]; ok {
			t.Fatalf("duplicate id %q at i=%d", id, i)
		}
		seen[id] = struct{}{}
	}
}

func TestNewRunConcurrent(t *testing.T) {
	var wg sync.WaitGroup
	var mu sync.Mutex
	seen := make(map[string]struct{}, 4096)
	for w := 0; w < 8; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < 512; i++ {
				id := NewRun()
				mu.Lock()
				if _, ok := seen[id]; ok {
					mu.Unlock()
					t.Errorf("dup %q", id)
					return
				}
				seen[id] = struct{}{}
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
}
