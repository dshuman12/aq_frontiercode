package timefmt

import (
	"testing"
	"time"
)

func TestParse(t *testing.T) {
	cases := []string{
		"2025-04-02T15:04:05Z",
		"2025-04-02T15:04:05.123Z",
		"2025-04-02 15:04:05",
		"02/Apr/2025:15:04:05 +0000",
		"Apr 02 15:04:05",
		"[02/Apr/2025:15:04:05 +0000]",
	}
	for _, s := range cases {
		if _, err := Parse(s); err != nil {
			t.Fatalf("%q: %v", s, err)
		}
	}
}

func TestParseFailure(t *testing.T) {
	if _, err := Parse("not a date"); err == nil {
		t.Fatal("expected err")
	}
}

func TestDetect(t *testing.T) {
	got := Detect("2025-04-02T15:04:05Z")
	if got != time.RFC3339 && got != time.RFC3339Nano {
		t.Fatalf("layout %q", got)
	}
}

func TestRange(t *testing.T) {
	start := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	end := start.Add(3 * time.Hour)
	out := Range(start, end, time.Hour)
	if len(out) != 3 {
		t.Fatalf("len %d", len(out))
	}
}

func TestBucket(t *testing.T) {
	t0 := time.Date(2025, 4, 2, 15, 17, 23, 0, time.UTC)
	got := Bucket(t0, 5*time.Minute)
	if got.Minute() != 15 {
		t.Fatalf("minute %d", got.Minute())
	}
}
