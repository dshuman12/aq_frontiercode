package timex_test

import (
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/util/timex"
)

func TestBucketRoundsDown(t *testing.T) {
	t0 := timex.MustParseRFC3339("2026-05-04T12:34:56Z")
	got := timex.Bucket(t0, time.Hour)
	want := timex.MustParseRFC3339("2026-05-04T12:00:00Z")
	if !got.Equal(want) {
		t.Errorf("got %v, want %v", got, want)
	}
}

func TestParseDurationDays(t *testing.T) {
	d, err := timex.ParseDuration("3d")
	if err != nil {
		t.Fatal(err)
	}
	if d != 3*24*time.Hour {
		t.Errorf("got %v", d)
	}
}

func TestParseDurationWeeks(t *testing.T) {
	d, err := timex.ParseDuration("2w")
	if err != nil {
		t.Fatal(err)
	}
	if d != 14*24*time.Hour {
		t.Errorf("got %v", d)
	}
}

func TestParseDurationFallback(t *testing.T) {
	d, err := timex.ParseDuration("90s")
	if err != nil {
		t.Fatal(err)
	}
	if d != 90*time.Second {
		t.Errorf("got %v", d)
	}
}

func TestParseDurationBadDays(t *testing.T) {
	if _, err := timex.ParseDuration("xd"); err == nil {
		t.Error("expected error")
	}
}

func TestFormatRFC3339Day(t *testing.T) {
	got := timex.FormatRFC3339Day(timex.MustParseRFC3339("2026-05-04T18:00:00Z"))
	if got != "2026-05-04" {
		t.Errorf("got %q", got)
	}
}
