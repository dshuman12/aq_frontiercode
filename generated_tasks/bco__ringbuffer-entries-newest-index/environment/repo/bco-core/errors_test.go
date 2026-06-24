package main

import (
	"fmt"
	"sync"
	"testing"
)

// engine IDs in this file are in a high range to avoid colliding with other tests' engine handles.
const errTestBase = 9014000

func TestPeekTakeEngineError_unsetReturnsEmpty(t *testing.T) {
	id := errTestBase + 1
	t.Cleanup(func() { TakeEngineError(id) })

	if got := PeekEngineError(id); got != "" {
		t.Fatalf("PeekEngineError unset: got %q want empty", got)
	}
	if got := TakeEngineError(id); got != "" {
		t.Fatalf("TakeEngineError unset: got %q want empty", got)
	}
}

func TestPeekEngineError_peekDoesNotClear(t *testing.T) {
	id := errTestBase + 2
	t.Cleanup(func() { TakeEngineError(id) })

	setEngineError(id, "stored")
	if got := PeekEngineError(id); got != "stored" {
		t.Fatalf("first peek: got %q want stored", got)
	}
	if got := PeekEngineError(id); got != "stored" {
		t.Fatalf("second peek: got %q want stored", got)
	}
}

func TestTakeEngineError_clearsEntry(t *testing.T) {
	id := errTestBase + 3
	t.Cleanup(func() { TakeEngineError(id) })

	setEngineError(id, "take-me")
	if got := TakeEngineError(id); got != "take-me" {
		t.Fatalf("take: got %q want take-me", got)
	}
	if got := PeekEngineError(id); got != "" {
		t.Fatalf("peek after take: got %q want empty", got)
	}
	if got := TakeEngineError(id); got != "" {
		t.Fatalf("second take: got %q want empty", got)
	}
}

func TestSetEngineError_overwrite(t *testing.T) {
	id := errTestBase + 4
	t.Cleanup(func() { TakeEngineError(id) })

	setEngineError(id, "first")
	setEngineError(id, "second")
	if got := PeekEngineError(id); got != "second" {
		t.Fatalf("peek: got %q want second", got)
	}
	if got := TakeEngineError(id); got != "second" {
		t.Fatalf("take: got %q want second", got)
	}
}

func TestEngineError_engineIDZeroAndNegative(t *testing.T) {
	// C API uses -1 for errors without a valid engine handle; 0 is a valid map key like any int.
	for _, id := range []int{0, -1} {
		t.Run(fmt.Sprintf("id=%d", id), func(t *testing.T) {
			t.Cleanup(func() { TakeEngineError(id) })

			if got := PeekEngineError(id); got != "" {
				t.Fatalf("unset peek: got %q", got)
			}
			setEngineError(id, "msg")
			if got := TakeEngineError(id); got != "msg" {
				t.Fatalf("take: got %q want msg", got)
			}
		})
	}
}

func TestEngineError_perEngineIsolation(t *testing.T) {
	id1, id2 := errTestBase+5, errTestBase+6
	t.Cleanup(func() {
		TakeEngineError(id1)
		TakeEngineError(id2)
	})
	setEngineError(id1, "a")
	setEngineError(id2, "b")
	if PeekEngineError(id1) != "a" || PeekEngineError(id2) != "b" {
		t.Fatalf("PeekEngineError: id1=%q id2=%q", PeekEngineError(id1), PeekEngineError(id2))
	}
}

func TestEngineError_concurrentAccess(t *testing.T) {
	id := errTestBase + 7
	t.Cleanup(func() { TakeEngineError(id) })

	const goroutines = 64
	var wg sync.WaitGroup
	wg.Add(goroutines)
	for g := 0; g < goroutines; g++ {
		go func() {
			defer wg.Done()
			setEngineError(id, "x")
			_ = PeekEngineError(id)
			_ = TakeEngineError(id)
		}()
	}
	wg.Wait()
}
