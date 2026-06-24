package ratelimit

import (
	"sync"
	"testing"
	"time"
)

func TestTokenBucket_Basic(t *testing.T) {
	tb := NewTokenBucket(10, 10)
	for i := 0; i < 10; i++ {
		if !tb.Allow() {
			t.Fatalf("should allow request %d", i)
		}
	}
	if tb.Allow() {
		t.Fatal("should deny after burst exhausted")
	}
}

func TestTokenBucket_Refill(t *testing.T) {
	tb := NewTokenBucket(1000, 5)
	for i := 0; i < 5; i++ {
		tb.Allow()
	}
	time.Sleep(10 * time.Millisecond)
	if !tb.Allow() {
		t.Fatal("should have refilled at least 1 token")
	}
}

func TestTokenBucket_AllowN(t *testing.T) {
	tb := NewTokenBucket(100, 10)
	if !tb.AllowN(5) {
		t.Fatal("should allow 5")
	}
	if !tb.AllowN(5) {
		t.Fatal("should allow another 5")
	}
	if tb.AllowN(1) {
		t.Fatal("should deny — no tokens left")
	}
}

func TestTokenBucket_WaitDuration(t *testing.T) {
	tb := NewTokenBucket(10, 1)
	tb.Allow()
	d := tb.WaitDuration(1)
	if d <= 0 {
		t.Fatal("should need to wait")
	}
	if d > 200*time.Millisecond {
		t.Fatalf("wait too long: %v", d)
	}
}

func TestTokenBucket_SetRate(t *testing.T) {
	tb := NewTokenBucket(1, 10)
	tb.SetRate(1000)
	if tb.Rate() != 1000 {
		t.Fatal("rate should be updated")
	}
}

func TestTokenBucket_Reset(t *testing.T) {
	tb := NewTokenBucket(10, 10)
	for i := 0; i < 10; i++ {
		tb.Allow()
	}
	tb.Reset()
	if !tb.Allow() {
		t.Fatal("should allow after reset")
	}
}

func TestTokenBucket_Concurrent(t *testing.T) {
	tb := NewTokenBucket(10000, 100)
	var wg sync.WaitGroup
	allowed := make([]int, 10)
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			for j := 0; j < 20; j++ {
				if tb.Allow() {
					allowed[idx]++
				}
			}
		}(i)
	}
	wg.Wait()
	total := 0
	for _, a := range allowed {
		total += a
	}
	if total > 105 {
		t.Fatalf("allowed too many: %d", total)
	}
}

func TestSlidingWindow_Basic(t *testing.T) {
	sw := NewSlidingWindow(5, 100*time.Millisecond)
	for i := 0; i < 5; i++ {
		if !sw.Allow() {
			t.Fatalf("should allow request %d", i)
		}
	}
	if sw.Allow() {
		t.Fatal("should deny after limit")
	}
}

func TestSlidingWindow_Reset(t *testing.T) {
	sw := NewSlidingWindow(2, time.Second)
	sw.Allow()
	sw.Allow()
	sw.Reset()
	if !sw.Allow() {
		t.Fatal("should allow after reset")
	}
}

func TestSlidingWindow_WindowRotation(t *testing.T) {
	sw := NewSlidingWindow(5, 50*time.Millisecond)
	for i := 0; i < 5; i++ {
		sw.Allow()
	}
	time.Sleep(60 * time.Millisecond)
	if !sw.Allow() {
		t.Fatal("should allow after window rotation")
	}
}

func TestFixedWindow_Basic(t *testing.T) {
	fw := NewFixedWindow(3, time.Second)
	for i := 0; i < 3; i++ {
		if !fw.Allow() {
			t.Fatalf("should allow %d", i)
		}
	}
	if fw.Allow() {
		t.Fatal("should deny")
	}
}

func TestFixedWindow_Reset(t *testing.T) {
	fw := NewFixedWindow(1, time.Second)
	fw.Allow()
	fw.Reset()
	if !fw.Allow() {
		t.Fatal("should allow after reset")
	}
}

func TestSlidingWindow_Limit(t *testing.T) {
	sw := NewSlidingWindow(10, time.Second)
	if sw.Limit() != 10 {
		t.Fatalf("expected 10, got %d", sw.Limit())
	}
}

func TestTokenBucket_Burst(t *testing.T) {
	tb := NewTokenBucket(10, 20)
	if tb.Burst() != 20 {
		t.Fatalf("expected burst=20, got %d", tb.Burst())
	}
}
