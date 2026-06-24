package slide_test

import (
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/record"
	"github.com/dleblanc/kindling/internal/slide"
)

func r(level string, ts time.Time) *record.Record {
	return &record.Record{Timestamp: ts, Level: level}
}

func TestEmptySnapshot(t *testing.T) {
	w := slide.New(time.Hour)
	if w.Count() != 0 {
		t.Errorf("got %d", w.Count())
	}
}

func TestPushAndCount(t *testing.T) {
	w := slide.New(time.Hour)
	for i := 0; i < 5; i++ {
		w.Push(r("info", time.Now()))
	}
	if w.Count() != 5 {
		t.Errorf("got %d", w.Count())
	}
}

func TestEviction(t *testing.T) {
	w := slide.New(time.Minute)
	w.Push(r("info", time.Now().Add(-2*time.Minute)))
	w.Push(r("info", time.Now()))
	if w.Count() != 1 {
		t.Errorf("got %d", w.Count())
	}
}

func TestCountByLevel(t *testing.T) {
	w := slide.New(time.Hour)
	w.Push(r("info", time.Now()))
	w.Push(r("info", time.Now()))
	w.Push(r("warn", time.Now()))
	got := w.CountByLevel()
	if got["info"] != 2 || got["warn"] != 1 {
		t.Errorf("got %v", got)
	}
}

func TestReset(t *testing.T) {
	w := slide.New(time.Hour)
	w.Push(r("info", time.Now()))
	w.Reset()
	if w.Count() != 0 {
		t.Errorf("got %d", w.Count())
	}
}
