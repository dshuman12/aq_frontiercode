package sema_test

import (
	"sync"
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/sema"
)

func TestStartsWithPermits(t *testing.T) {
	s := sema.New(3)
	if s.Available() != 3 {
		t.Errorf("got %d", s.Available())
	}
}

func TestAcquireConsumes(t *testing.T) {
	s := sema.New(2)
	s.Acquire()
	s.Acquire()
	if s.Available() != 0 {
		t.Errorf("got %d", s.Available())
	}
}

func TestTryAcquireReturnsFalseWhenEmpty(t *testing.T) {
	s := sema.New(1)
	if !s.TryAcquire() {
		t.Error("first should succeed")
	}
	if s.TryAcquire() {
		t.Error("second should fail")
	}
}

func TestReleaseAddsPermit(t *testing.T) {
	s := sema.New(1)
	s.Acquire()
	s.Release()
	if s.Available() != 1 {
		t.Errorf("got %d", s.Available())
	}
}

func TestCrossThreadHandshake(t *testing.T) {
	s := sema.New(0)
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		time.Sleep(2 * time.Millisecond)
		s.Release()
	}()
	s.Acquire()
	wg.Wait()
}
