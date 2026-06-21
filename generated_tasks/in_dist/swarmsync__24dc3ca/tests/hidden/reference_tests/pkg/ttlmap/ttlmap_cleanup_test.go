package ttlmap

import (
	"testing"
	"time"
)

func TestTTLMap_CleanupRemovesExpiredNotLive(t *testing.T) {
	m := New(100 * time.Millisecond)
	m.Set("short", "gone")
	m.SetWithTTL("long", "alive", 10*time.Second)

	time.Sleep(200 * time.Millisecond)

	removed := m.Cleanup()
	if removed != 1 {
		t.Fatalf("expected 1 removed, got %d", removed)
	}

	if _, ok := m.Get("long"); !ok {
		t.Error("'long' should still be alive after Cleanup")
	}
	if _, ok := m.Get("short"); ok {
		t.Error("'short' should have been cleaned up")
	}
}

func TestTTLMap_CleanupDoesNotKillLiveEntries(t *testing.T) {
	m := New(10 * time.Second)
	m.Set("a", 1)
	m.Set("b", 2)

	removed := m.Cleanup()
	if removed != 0 {
		t.Fatalf("no entries should be removed when none expired, got %d", removed)
	}
	if _, ok := m.Get("a"); !ok {
		t.Error("live entry 'a' should not be removed by Cleanup")
	}
}
