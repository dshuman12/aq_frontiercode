package sourcecat

import (
	"strings"
	"testing"
	"time"
)

func TestMergeOrders(t *testing.T) {
	a := Open("a", strings.NewReader("2025-01-01T00:00:00Z hello\n2025-01-01T00:02:00Z mid\n"), ParseRFC3339Prefix)
	b := Open("b", strings.NewReader("2025-01-01T00:01:00Z second\n"), ParseRFC3339Prefix)
	lines, errs := Merge(a, b)
	out, err := Drain(lines, errs)
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 3 {
		t.Fatalf("got %d", len(out))
	}
	for i := 1; i < len(out); i++ {
		if out[i].Time.Before(out[i-1].Time) {
			t.Fatalf("not ordered: %v", out)
		}
	}
}

func TestSortStable(t *testing.T) {
	lines := []Line{
		{Time: time.Unix(2, 0)},
		{Time: time.Unix(1, 0)},
	}
	sorted := SortStable(lines)
	if !sorted[0].Time.Equal(time.Unix(1, 0)) {
		t.Fatal("not sorted")
	}
}

func TestParseRFC3339Prefix(t *testing.T) {
	tt, err := ParseRFC3339Prefix("2025-01-01T00:00:00Z hello")
	if err != nil {
		t.Fatal(err)
	}
	if tt.Year() != 2025 {
		t.Fatalf("year %d", tt.Year())
	}
}

func TestParseRejectsNoSpace(t *testing.T) {
	if _, err := ParseRFC3339Prefix("nospaces"); err == nil {
		t.Fatal("expected err")
	}
}

func TestMergeSkipsBadLines(t *testing.T) {
	a := Open("a", strings.NewReader("not a date\n2025-01-01T00:00:00Z ok\n"), ParseRFC3339Prefix)
	lines, errs := Merge(a)
	out, _ := Drain(lines, errs)
	if len(out) != 1 || !strings.Contains(out[0].Body, "ok") {
		t.Fatalf("got %v", out)
	}
}
