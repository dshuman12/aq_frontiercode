package dedup_test

import (
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/dedup"
	"github.com/dleblanc/kindling/internal/record"
)

func r(level, service string) *record.Record {
	return &record.Record{
		Timestamp: time.Now(),
		Level:     level,
		Service:   service,
		Message:   "x",
	}
}

func TestDedupRemovesDuplicates(t *testing.T) {
	recs := []*record.Record{
		r("info", "auth"),
		r("info", "auth"),
		r("warn", "auth"),
	}
	got := dedup.Dedup(recs)
	if len(got) != 2 {
		t.Errorf("got %d", len(got))
	}
}

func TestDedupAllUnique(t *testing.T) {
	recs := []*record.Record{r("a", "x"), r("b", "y"), r("c", "z")}
	got := dedup.Dedup(recs)
	if len(got) != 3 {
		t.Errorf("got %d", len(got))
	}
}

func TestDedupEmpty(t *testing.T) {
	if got := dedup.Dedup(nil); len(got) != 0 {
		t.Errorf("got %v", got)
	}
}

func TestDedupWithStats(t *testing.T) {
	recs := []*record.Record{r("info", "x"), r("info", "x")}
	out, stats := dedup.DedupWithStats(recs)
	if stats.Input != 2 || stats.Kept != 1 || stats.Dropped != 1 {
		t.Errorf("got %+v", stats)
	}
	if len(out) != 1 {
		t.Errorf("got %d", len(out))
	}
}

func TestFingerprintAll(t *testing.T) {
	recs := []*record.Record{r("info", "x"), r("warn", "x")}
	prints := dedup.FingerprintAll(recs)
	if len(prints) != 2 {
		t.Errorf("got %d", len(prints))
	}
	if prints[0] == prints[1] {
		t.Error("expected distinct prints")
	}
}
