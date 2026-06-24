package replicationv2

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

func TestAppendCatchUp(t *testing.T) {
	var (
		mu       sync.Mutex
		received []Entry
	)
	transport := func(ctx context.Context, follower string, entries []Entry) error {
		mu.Lock()
		defer mu.Unlock()
		received = append(received, entries...)
		return nil
	}
	l := NewLeader(transport, 10)
	for i := 0; i < 5; i++ {
		_ = l.Append([]byte{byte(i)})
	}
	_ = l.AddFollower("f1", 0)
	if err := l.CatchUp(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(received) != 5 {
		t.Fatalf("got %d", len(received))
	}
}

func TestBatching(t *testing.T) {
	calls := 0
	transport := func(ctx context.Context, follower string, entries []Entry) error {
		calls++
		return nil
	}
	l := NewLeader(transport, 2)
	for i := 0; i < 5; i++ {
		_ = l.Append(nil)
	}
	_ = l.AddFollower("f", 0)
	for i := 0; i < 3; i++ {
		_ = l.CatchUp(context.Background())
	}
	if calls != 3 {
		t.Fatalf("calls %d", calls)
	}
}

func TestRemoveFollower(t *testing.T) {
	l := NewLeader(func(context.Context, string, []Entry) error { return nil }, 10)
	_ = l.AddFollower("f", 0)
	l.RemoveFollower("f")
	if len(l.Followers()) != 0 {
		t.Fatal("expected empty")
	}
}

func TestCatchUpError(t *testing.T) {
	l := NewLeader(func(context.Context, string, []Entry) error { return errors.New("boom") }, 10)
	_ = l.Append(nil)
	_ = l.AddFollower("f", 0)
	if err := l.CatchUp(context.Background()); err == nil {
		t.Fatal("expected err")
	}
	if l.Followers()[0].Failures != 1 {
		t.Fatal("expected failure")
	}
}

func TestTruncateBlockedByLag(t *testing.T) {
	l := NewLeader(func(context.Context, string, []Entry) error { return nil }, 10)
	_ = l.Append(nil)
	_ = l.AddFollower("f", 0)
	if err := l.Truncate(1); err == nil {
		t.Fatal("expected err")
	}
}

func TestTruncateOK(t *testing.T) {
	l := NewLeader(func(context.Context, string, []Entry) error { return nil }, 10)
	for i := 0; i < 3; i++ {
		_ = l.Append(nil)
	}
	_ = l.AddFollower("f", 3)
	if err := l.Truncate(2); err != nil {
		t.Fatal(err)
	}
	if l.LogLen() != 1 {
		t.Fatalf("len %d", l.LogLen())
	}
}

func TestStatsLag(t *testing.T) {
	l := NewLeader(func(context.Context, string, []Entry) error { return nil }, 10)
	for i := 0; i < 5; i++ {
		_ = l.Append(nil)
	}
	_ = l.AddFollower("f", 2)
	if l.Followers()[0].Lag != 3 {
		t.Fatalf("got %d", l.Followers()[0].Lag)
	}
}

func TestSetClock(t *testing.T) {
	l := NewLeader(func(context.Context, string, []Entry) error { return nil }, 10)
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	l.SetClock(func() time.Time { return now })
	_ = l.Append(nil)
	if l.LogLen() != 1 {
		t.Fatal("log not appended")
	}
}

func TestRequiresName(t *testing.T) {
	l := NewLeader(func(context.Context, string, []Entry) error { return nil }, 10)
	if err := l.AddFollower("", 0); err == nil {
		t.Fatal("expected err")
	}
}
