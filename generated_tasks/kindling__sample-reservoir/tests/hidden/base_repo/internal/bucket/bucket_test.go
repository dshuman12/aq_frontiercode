package bucket_test

import (
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/bucket"
	"github.com/dleblanc/kindling/internal/record"
	"github.com/dleblanc/kindling/internal/util/timex"
)

func r(ts string) *record.Record {
	return &record.Record{Timestamp: timex.MustParseRFC3339(ts)}
}

func TestEmpty(t *testing.T) {
	if got := bucket.Aggregate(nil, time.Hour); len(got) != 0 {
		t.Errorf("got %v", got)
	}
}

func TestSingleBucket(t *testing.T) {
	recs := []*record.Record{
		r("2026-05-04T12:00:00Z"),
		r("2026-05-04T12:30:00Z"),
		r("2026-05-04T12:59:00Z"),
	}
	got := bucket.Aggregate(recs, time.Hour)
	if len(got) != 1 || got[0].Count != 3 {
		t.Errorf("got %v", got)
	}
}

func TestMultipleBucketsSorted(t *testing.T) {
	recs := []*record.Record{
		r("2026-05-04T14:00:00Z"),
		r("2026-05-04T12:00:00Z"),
		r("2026-05-04T13:00:00Z"),
	}
	got := bucket.Aggregate(recs, time.Hour)
	if len(got) != 3 {
		t.Fatalf("got %d", len(got))
	}
	if !got[0].BucketStart.Before(got[1].BucketStart) || !got[1].BucketStart.Before(got[2].BucketStart) {
		t.Errorf("not sorted: %v", got)
	}
}

func TestSparseFillsGaps(t *testing.T) {
	cells := []bucket.Cell{
		{BucketStart: timex.MustParseRFC3339("2026-05-04T12:00:00Z"), Count: 5},
		{BucketStart: timex.MustParseRFC3339("2026-05-04T15:00:00Z"), Count: 3},
	}
	out := bucket.Sparse(cells, time.Hour)
	if len(out) != 4 {
		t.Errorf("got %d", len(out))
	}
	if out[1].Count != 0 || out[2].Count != 0 {
		t.Errorf("middle cells should be 0: %v", out)
	}
}

func TestSparseShortCircuit(t *testing.T) {
	cells := []bucket.Cell{{BucketStart: time.Now(), Count: 1}}
	if got := bucket.Sparse(cells, time.Hour); len(got) != 1 {
		t.Errorf("got %d", len(got))
	}
}

func TestTotal(t *testing.T) {
	cells := []bucket.Cell{{Count: 5}, {Count: 3}, {Count: 7}}
	if got := bucket.Total(cells); got != 15 {
		t.Errorf("got %d", got)
	}
}
