package store_test

import (
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/record"
	"github.com/dleblanc/kindling/internal/store"
)

func sample(level string, ts time.Time) *record.Record {
	return &record.Record{
		Timestamp: ts,
		Level:     level,
		Service:   "auth",
		Message:   level + " event",
	}
}

func TestEmpty(t *testing.T) {
	s := store.New()
	if s.Len() != 0 {
		t.Errorf("expected 0")
	}
	if s.Get(0) != nil {
		t.Errorf("expected nil")
	}
}

func TestAppendAssignsIDs(t *testing.T) {
	s := store.New()
	now := time.Now()
	for i := 0; i < 5; i++ {
		got := s.Append(sample("info", now))
		if got != uint64(i) {
			t.Errorf("got %d want %d", got, i)
		}
	}
	if s.Len() != 5 {
		t.Errorf("len=%d", s.Len())
	}
}

func TestGetByID(t *testing.T) {
	s := store.New()
	r := sample("warn", time.Now())
	id := s.Append(r)
	if s.Get(id) != r {
		t.Errorf("got different record")
	}
}

func TestGetOutOfRange(t *testing.T) {
	s := store.New()
	if s.Get(99) != nil {
		t.Errorf("expected nil")
	}
}

func TestAll(t *testing.T) {
	s := store.New()
	for i := 0; i < 3; i++ {
		s.Append(sample("info", time.Now()))
	}
	all := s.All()
	if len(all) != 3 {
		t.Errorf("got %d", len(all))
	}
}

func TestFilter(t *testing.T) {
	s := store.New()
	now := time.Now()
	s.Append(sample("info", now))
	s.Append(sample("warn", now))
	s.Append(sample("error", now))
	got := s.Filter(func(r *record.Record) bool { return r.Level == "warn" })
	if len(got) != 1 {
		t.Errorf("got %d", len(got))
	}
}

func TestReset(t *testing.T) {
	s := store.New()
	s.Append(sample("info", time.Now()))
	s.Reset()
	if s.Len() != 0 {
		t.Errorf("got %d", s.Len())
	}
}

func TestSortByTimestamp(t *testing.T) {
	s := store.New()
	t0 := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	s.Append(sample("info", t0.Add(2*time.Hour)))
	s.Append(sample("warn", t0))
	s.Append(sample("error", t0.Add(time.Hour)))
	s.SortByTimestamp()
	all := s.All()
	if !all[0].Timestamp.Equal(t0) {
		t.Errorf("first wrong: %v", all[0].Timestamp)
	}
	if !all[2].Timestamp.Equal(t0.Add(2 * time.Hour)) {
		t.Errorf("last wrong: %v", all[2].Timestamp)
	}
}
