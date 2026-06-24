package integration_test

import (
	"strings"
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/bucket"
	"github.com/dleblanc/kindling/internal/format"
	"github.com/dleblanc/kindling/internal/group"
	"github.com/dleblanc/kindling/internal/index"
	"github.com/dleblanc/kindling/internal/loader"
	"github.com/dleblanc/kindling/internal/parse"
	"github.com/dleblanc/kindling/internal/query"
	"github.com/dleblanc/kindling/internal/record"
	"github.com/dleblanc/kindling/internal/store"
)

func sample() []*record.Record {
	t := time.Date(2026, 5, 4, 12, 0, 0, 0, time.UTC)
	return []*record.Record{
		{Timestamp: t, Level: "info", Service: "auth", Message: "login ok",
			Fields: map[string]string{"user": "alice", "ms": "10"}},
		{Timestamp: t.Add(time.Minute), Level: "warn", Service: "auth", Message: "slow login",
			Fields: map[string]string{"user": "bob", "ms": "412"}},
		{Timestamp: t.Add(2 * time.Minute), Level: "error", Service: "users", Message: "db error",
			Fields: map[string]string{"err": "timeout"}},
		{Timestamp: t.Add(3 * time.Minute), Level: "info", Service: "users", Message: "fetch ok",
			Fields: map[string]string{"user": "alice", "ms": "8"}},
	}
}

func TestEndToEndQueryFilter(t *testing.T) {
	q, err := parse.Parse("level=warn OR level=error")
	if err != nil {
		t.Fatal(err)
	}
	got := query.Filter(q, sample())
	if len(got) != 2 {
		t.Errorf("got %d", len(got))
	}
}

func TestEndToEndIndexLookup(t *testing.T) {
	recs := sample()
	idx := index.New()
	for i, r := range recs {
		idx.Add(uint64(i), r)
	}
	got := idx.Lookup("user", "alice")
	if len(got) != 2 {
		t.Errorf("got %d", len(got))
	}
}

func TestEndToEndGroupByLevel(t *testing.T) {
	buckets := group.By("level", sample())
	if len(buckets) != 3 {
		t.Errorf("got %d", len(buckets))
	}
}

func TestEndToEndTimeBuckets(t *testing.T) {
	cells := bucket.Aggregate(sample(), time.Hour)
	if len(cells) != 1 {
		t.Errorf("got %d", len(cells))
	}
	if cells[0].Count != 4 {
		t.Errorf("count: %d", cells[0].Count)
	}
}

func TestEndToEndStoreRoundTrip(t *testing.T) {
	s := store.New()
	for _, r := range sample() {
		s.Append(r)
	}
	if s.Len() != 4 {
		t.Errorf("got %d", s.Len())
	}
	all := s.All()
	if len(all) != 4 {
		t.Errorf("all returned %d", len(all))
	}
}

func TestEndToEndJSONRender(t *testing.T) {
	out, err := format.JSONRecords(sample())
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, `"level":"info"`) {
		t.Errorf("missing level")
	}
}

func TestEndToEndCSVRender(t *testing.T) {
	out := format.CSVRecords(sample())
	if !strings.HasPrefix(out, "ts,level,service,message") {
		t.Errorf("bad header: %q", out)
	}
	if strings.Count(out, "\n") != 5 {
		t.Errorf("rows: %q", out)
	}
}

func TestEndToEndTextRender(t *testing.T) {
	out := format.TextRecords(sample())
	if !strings.Contains(out, "info") {
		t.Errorf("got %q", out)
	}
}

func TestEndToEndLoaderFromString(t *testing.T) {
	lines := strings.NewReader(`{"level":"info","msg":"x","service":"auth"}
{"level":"warn","msg":"y","service":"users"}`)
	recs, err := loader.Load(lines, loader.FormatJSONL)
	if err != nil {
		t.Fatal(err)
	}
	if len(recs) != 2 {
		t.Errorf("got %d", len(recs))
	}
}

func TestEndToEndQueryThenGroup(t *testing.T) {
	q, _ := parse.Parse("service=auth")
	authRecs := query.Filter(q, sample())
	buckets := group.By("level", authRecs)
	if len(buckets) != 2 {
		t.Errorf("got %d", len(buckets))
	}
}

func TestEndToEndContainsQuery(t *testing.T) {
	q, _ := parse.Parse("msg:slow")
	got := query.Filter(q, sample())
	if len(got) != 1 {
		t.Errorf("got %d", len(got))
	}
}

func TestEndToEndNumericQuery(t *testing.T) {
	q, _ := parse.Parse("ms>100")
	got := query.Filter(q, sample())
	if len(got) != 1 {
		t.Errorf("got %d", len(got))
	}
}

func TestEndToEndCombinedConjunction(t *testing.T) {
	q, _ := parse.Parse("level=info AND service=users")
	got := query.Filter(q, sample())
	if len(got) != 1 {
		t.Errorf("got %d", len(got))
	}
}

func TestEndToEndIndexIntersect(t *testing.T) {
	recs := sample()
	idx := index.New()
	for i, r := range recs {
		idx.Add(uint64(i), r)
	}
	got := idx.Intersect(map[string]string{"level": "info", "user": "alice"})
	if len(got) != 2 {
		t.Errorf("got %v", got)
	}
}
