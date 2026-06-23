package cron

import (
	"testing"
	"time"
)

func TestParseEveryMinute(t *testing.T) {
	s, err := Parse("* * * * *")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Date(2025, 8, 1, 12, 30, 12, 0, time.UTC)
	next := s.Next(now)
	want := time.Date(2025, 8, 1, 12, 31, 0, 0, time.UTC)
	if !next.Equal(want) {
		t.Fatalf("next = %v, want %v", next, want)
	}
}

func TestParseEvery5Minutes(t *testing.T) {
	s, _ := Parse("*/5 * * * *")
	now := time.Date(2025, 8, 1, 12, 7, 0, 0, time.UTC)
	next := s.Next(now)
	want := time.Date(2025, 8, 1, 12, 10, 0, 0, time.UTC)
	if !next.Equal(want) {
		t.Fatalf("next = %v, want %v", next, want)
	}
}

func TestParseSpecificTime(t *testing.T) {
	s, _ := Parse("30 9 * * 1-5")
	now := time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC) // Friday
	next := s.Next(now)
	want := time.Date(2025, 8, 1, 9, 30, 0, 0, time.UTC)
	if !next.Equal(want) {
		t.Fatalf("next = %v, want %v", next, want)
	}
}

func TestParseWeekendSkipped(t *testing.T) {
	s, _ := Parse("0 12 * * 1-5") // weekdays only
	sat := time.Date(2025, 8, 2, 11, 0, 0, 0, time.UTC) // Saturday
	next := s.Next(sat)
	want := time.Date(2025, 8, 4, 12, 0, 0, 0, time.UTC) // Monday
	if !next.Equal(want) {
		t.Fatalf("next = %v, want %v", next, want)
	}
}

func TestParseRejectsBadFieldCount(t *testing.T) {
	if _, err := Parse("* * *"); err == nil {
		t.Fatal("expected error on 3 fields")
	}
}

func TestParseRejectsOutOfRange(t *testing.T) {
	if _, err := Parse("60 * * * *"); err == nil {
		t.Fatal("expected error on minute=60")
	}
	if _, err := Parse("* 24 * * *"); err == nil {
		t.Fatal("expected error on hour=24")
	}
}

func TestParseDomOrDow(t *testing.T) {
	// Run on the 1st of the month OR Sunday (whichever is sooner)
	s, _ := Parse("0 0 1 * 0")
	thurs := time.Date(2025, 7, 31, 0, 0, 0, 0, time.UTC) // Thursday before Aug 1
	next := s.Next(thurs)
	want := time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC)
	if !next.Equal(want) {
		t.Fatalf("next = %v, want %v", next, want)
	}
}
