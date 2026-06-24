package format_test

import (
	"strings"
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/bucket"
	"github.com/dleblanc/kindling/internal/format"
	"github.com/dleblanc/kindling/internal/group"
	"github.com/dleblanc/kindling/internal/record"
	"github.com/dleblanc/kindling/internal/util/timex"
)

func sample() []*record.Record {
	return []*record.Record{
		{
			Timestamp: timex.MustParseRFC3339("2026-05-04T12:00:00Z"),
			Level:     "info",
			Service:   "auth",
			Message:   "hello",
		},
		{
			Timestamp: timex.MustParseRFC3339("2026-05-04T13:00:00Z"),
			Level:     "warn",
			Service:   "users",
			Message:   "slow",
			Fields:    map[string]string{"latency_ms": "412"},
		},
	}
}

func TestTextRecords(t *testing.T) {
	out := format.TextRecords(sample())
	if !strings.Contains(out, "info") {
		t.Errorf("missing info: %q", out)
	}
	if !strings.Contains(out, "latency_ms=412") {
		t.Errorf("missing field: %q", out)
	}
	if c := strings.Count(out, "\n"); c != 2 {
		t.Errorf("expected 2 lines, got %d", c)
	}
}

func TestJSONRecords(t *testing.T) {
	out, err := format.JSONRecords(sample())
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, `"level":"info"`) {
		t.Errorf("missing level: %q", out)
	}
	if !strings.Contains(out, `"latency_ms":"412"`) {
		t.Errorf("missing field: %q", out)
	}
}

func TestCSVRecords(t *testing.T) {
	out := format.CSVRecords(sample())
	if !strings.HasPrefix(out, "ts,level,service,message") {
		t.Errorf("bad header: %q", out)
	}
	if !strings.Contains(out, "auth") {
		t.Errorf("missing data: %q", out)
	}
}

func TestCSVEscape(t *testing.T) {
	rec := &record.Record{
		Timestamp: time.Now(),
		Message:   "hello, world",
	}
	out := format.CSVRecords([]*record.Record{rec})
	if !strings.Contains(out, `"hello, world"`) {
		t.Errorf("not escaped: %q", out)
	}
}

func TestTextGroups(t *testing.T) {
	out := format.TextGroups([]group.Bucket{
		{Key: "auth", Count: 5},
		{Key: "users", Count: 2},
	})
	if !strings.Contains(out, "auth") {
		t.Errorf("missing key: %q", out)
	}
}

func TestJSONGroups(t *testing.T) {
	out, _ := format.JSONGroups([]group.Bucket{
		{Key: "x", Count: 1},
	})
	if !strings.Contains(out, `"key":"x"`) {
		t.Errorf("got %q", out)
	}
}

func TestTextBuckets(t *testing.T) {
	cells := []bucket.Cell{
		{BucketStart: timex.MustParseRFC3339("2026-05-04T12:00:00Z"), Count: 100},
	}
	out := format.TextBuckets(cells)
	if !strings.Contains(out, "100") {
		t.Errorf("missing count: %q", out)
	}
}
