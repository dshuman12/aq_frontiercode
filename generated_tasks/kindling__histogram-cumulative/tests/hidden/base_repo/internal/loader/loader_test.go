package loader_test

import (
	"strings"
	"testing"

	"github.com/dleblanc/kindling/internal/loader"
)

func TestParseFormat(t *testing.T) {
	cases := map[string]loader.Format{
		"jsonl":  loader.FormatJSONL,
		"json":   loader.FormatJSONL,
		"text":   loader.FormatText,
		"plain":  loader.FormatText,
		"":       loader.FormatAuto,
		"random": loader.FormatAuto,
	}
	for s, want := range cases {
		if got := loader.ParseFormat(s); got != want {
			t.Errorf("%q: got %v want %v", s, got, want)
		}
	}
}

func TestLoadJSONL(t *testing.T) {
	in := strings.NewReader(`{"ts":"2026-05-04T12:00:00Z","level":"info","msg":"hello","service":"auth"}
{"ts":"2026-05-04T12:01:00Z","level":"warn","msg":"slow","service":"users","latency_ms":412}`)
	recs, err := loader.Load(in, loader.FormatJSONL)
	if err != nil {
		t.Fatal(err)
	}
	if len(recs) != 2 {
		t.Fatalf("got %d", len(recs))
	}
	if recs[0].Level != "info" {
		t.Errorf("got %q", recs[0].Level)
	}
	if recs[1].Field("latency_ms") != "412" {
		t.Errorf("got %q", recs[1].Field("latency_ms"))
	}
}

func TestLoadText(t *testing.T) {
	in := strings.NewReader("server starting up\nERROR: disk full\nINFO: handler ready")
	recs, err := loader.Load(in, loader.FormatText)
	if err != nil {
		t.Fatal(err)
	}
	if len(recs) != 3 {
		t.Fatalf("got %d", len(recs))
	}
	if recs[1].Level != "error" {
		t.Errorf("got %q", recs[1].Level)
	}
}

func TestLoadAuto(t *testing.T) {
	in := strings.NewReader(`{"level":"info","msg":"x"}
plain text line`)
	recs, _ := loader.Load(in, loader.FormatAuto)
	if len(recs) != 2 {
		t.Errorf("got %d", len(recs))
	}
	if recs[0].Level != "info" || recs[1].Message != "plain text line" {
		t.Errorf("got %v", recs)
	}
}

func TestSkipsEmptyLines(t *testing.T) {
	in := strings.NewReader("\n\n\n")
	recs, err := loader.Load(in, loader.FormatAuto)
	if err != nil {
		t.Fatal(err)
	}
	if len(recs) != 0 {
		t.Errorf("got %d", len(recs))
	}
}

func TestErrorOnBadJSON(t *testing.T) {
	in := strings.NewReader(`{"broken: true`)
	if _, err := loader.Load(in, loader.FormatJSONL); err == nil {
		t.Error("expected error")
	}
}

func TestParseJSONLEvents(t *testing.T) {
	in := strings.NewReader(`{"timestamp":"2026-05-04T12:00:00Z","severity":"warn","component":"db","message":"slow"}`)
	recs, _ := loader.Load(in, loader.FormatJSONL)
	if recs[0].Level != "warn" || recs[0].Service != "db" {
		t.Errorf("got %v", recs[0])
	}
}
