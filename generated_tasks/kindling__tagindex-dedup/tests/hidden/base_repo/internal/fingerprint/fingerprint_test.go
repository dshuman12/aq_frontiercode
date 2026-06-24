package fingerprint_test

import (
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/fingerprint"
	"github.com/dleblanc/kindling/internal/record"
)

func r(level, service, msg string, fields map[string]string) *record.Record {
	return &record.Record{
		Timestamp: time.Now(),
		Level:     level,
		Service:   service,
		Message:   msg,
		Fields:    fields,
	}
}

func TestDeterministic(t *testing.T) {
	a := fingerprint.Fields(r("info", "auth", "ok", map[string]string{"a": "1", "b": "2"}))
	b := fingerprint.Fields(r("info", "auth", "ok", map[string]string{"b": "2", "a": "1"}))
	if a != b {
		t.Errorf("not deterministic: %s vs %s", a, b)
	}
}

func TestLength(t *testing.T) {
	if got := fingerprint.Fields(r("info", "x", "y", nil)); len(got) != 12 {
		t.Errorf("got %d: %q", len(got), got)
	}
}

func TestDistinctInputs(t *testing.T) {
	a := fingerprint.Fields(r("info", "x", "y", nil))
	b := fingerprint.Fields(r("warn", "x", "y", nil))
	if a == b {
		t.Error("expected distinct")
	}
}

func TestCluster(t *testing.T) {
	recs := []*record.Record{
		r("info", "x", "y", nil),
		r("info", "x", "y", nil),
		r("warn", "x", "y", nil),
	}
	cls := fingerprint.Cluster(recs)
	if len(cls) != 2 {
		t.Errorf("got %d clusters", len(cls))
	}
}

func TestLargestCluster(t *testing.T) {
	recs := []*record.Record{
		r("info", "x", "y", nil),
		r("info", "x", "y", nil),
		r("info", "x", "y", nil),
		r("warn", "x", "y", nil),
	}
	if got := fingerprint.LargestCluster(recs); got != 3 {
		t.Errorf("got %d", got)
	}
}
