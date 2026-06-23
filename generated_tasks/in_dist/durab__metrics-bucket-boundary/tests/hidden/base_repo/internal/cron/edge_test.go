package cron

import (
	"testing"
	"time"
)

func TestParseFebruaryHandlesShortMonth(t *testing.T) {

	s, _ := Parse("0 0 30 2 *")
	from := time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC)
	next := s.Next(from)
	if !next.IsZero() {
		t.Fatalf("expected zero for impossible spec, got %v", next)
	}
}

func TestParseStepZeroRejected(t *testing.T) {
	if _, err := Parse("*/0 * * * *"); err == nil {
		t.Fatal("step 0 should be rejected")
	}
}

func TestParseRangeReversedRejected(t *testing.T) {
	if _, err := Parse("5-3 * * * *"); err == nil {
		t.Fatal("reversed range should be rejected")
	}
}
