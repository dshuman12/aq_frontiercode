package ratelimit_test

import (
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/ratelimit"
)

func TestStartsFull(t *testing.T) {
	b := ratelimit.New(10, 1)
	if got := b.Tokens(); got != 10 {
		t.Errorf("got %v", got)
	}
}

func TestAllowConsumes(t *testing.T) {
	b := ratelimit.New(5, 1)
	if !b.Allow(3) {
		t.Error("should allow")
	}
	if b.Allow(10) {
		t.Error("should not allow")
	}
}

func TestRefillCappedAtCapacity(t *testing.T) {
	b := ratelimit.New(2, 1000000)
	b.Allow(2)
	now := time.Now()
	b.SetNow(func() time.Time { return now.Add(time.Hour) })
	if b.Tokens() != 2 {
		t.Errorf("got %v", b.Tokens())
	}
}

func TestRefillOverTime(t *testing.T) {
	b := ratelimit.New(10, 100)
	b.Allow(10)
	now := time.Now()
	b.SetNow(func() time.Time { return now.Add(50 * time.Millisecond) })
	tokens := b.Tokens()
	if tokens < 4 || tokens > 6 {
		t.Errorf("got %v, want ~5", tokens)
	}
}
