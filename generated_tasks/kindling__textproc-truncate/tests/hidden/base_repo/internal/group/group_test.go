package group_test

import (
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/group"
	"github.com/dleblanc/kindling/internal/record"
)

func r(level, service string) *record.Record {
	return &record.Record{
		Timestamp: time.Now(),
		Level:     level,
		Service:   service,
	}
}

func TestEmpty(t *testing.T) {
	if got := group.By("level", nil); len(got) != 0 {
		t.Errorf("got %v", got)
	}
}

func TestSingleGroup(t *testing.T) {
	recs := []*record.Record{r("info", "x"), r("info", "x"), r("info", "x")}
	got := group.By("level", recs)
	if len(got) != 1 || got[0].Count != 3 {
		t.Errorf("got %v", got)
	}
}

func TestMultipleGroupsSortedDescending(t *testing.T) {
	recs := []*record.Record{
		r("info", "x"), r("info", "x"), r("info", "x"),
		r("warn", "x"), r("warn", "x"),
		r("error", "x"),
	}
	got := group.By("level", recs)
	if len(got) != 3 {
		t.Fatalf("got %d", len(got))
	}
	if got[0].Key != "info" || got[0].Count != 3 {
		t.Errorf("first: %v", got[0])
	}
	if got[1].Key != "warn" || got[1].Count != 2 {
		t.Errorf("second: %v", got[1])
	}
	if got[2].Key != "error" || got[2].Count != 1 {
		t.Errorf("third: %v", got[2])
	}
}

func TestGroupByService(t *testing.T) {
	recs := []*record.Record{
		r("info", "auth"),
		r("info", "users"),
		r("info", "auth"),
	}
	got := group.By("service", recs)
	if len(got) != 2 {
		t.Errorf("got %d", len(got))
	}
}

func TestGroupByCustomField(t *testing.T) {
	rec := func(region string) *record.Record {
		return &record.Record{
			Timestamp: time.Now(),
			Level:     "info",
			Fields:    map[string]string{"region": region},
		}
	}
	recs := []*record.Record{rec("us"), rec("eu"), rec("us"), rec("us")}
	got := group.By("region", recs)
	if got[0].Key != "us" || got[0].Count != 3 {
		t.Errorf("got %v", got)
	}
}

func TestTopN(t *testing.T) {
	buckets := []group.Bucket{{Key: "a", Count: 5}, {Key: "b", Count: 3}, {Key: "c", Count: 1}}
	if len(group.TopN(buckets, 2)) != 2 {
		t.Error("topN failed")
	}
	if len(group.TopN(buckets, 10)) != 3 {
		t.Error("clamp failed")
	}
	if len(group.TopN(buckets, 0)) != 3 {
		t.Error("zero")
	}
}

func TestStableTieBreaking(t *testing.T) {
	recs := []*record.Record{r("warn", "x"), r("info", "x"), r("error", "x")}
	got := group.By("level", recs)
	// All have count 1; tie-break by key (alphabetical).
	if got[0].Key != "error" || got[1].Key != "info" || got[2].Key != "warn" {
		t.Errorf("got %v", got)
	}
}
