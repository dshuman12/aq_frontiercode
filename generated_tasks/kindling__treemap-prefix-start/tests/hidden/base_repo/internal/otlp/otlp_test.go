package otlp

import (
	"bytes"
	"strings"
	"testing"
	"time"
)

func TestSeverityFromText(t *testing.T) {
	if SeverityFromText("info") != SeverityInfo {
		t.Fatal("info")
	}
	if SeverityFromText("???") != SeverityUnspecified {
		t.Fatal("unknown")
	}
}

func TestMarshal(t *testing.T) {
	b := Batch{
		Resource: Resource{ServiceName: "kindling", Hostname: "h1", Attrs: map[string]string{"region": "us"}},
		Records: []LogRecord{{
			Time:     time.Now(),
			Severity: SeverityInfo,
			Body:     "hello",
			Attrs:    map[string]string{"app": "x"},
			Trace:    "abc",
			Span:     "def",
		}},
	}
	var buf bytes.Buffer
	if err := WriteBatch(&buf, b); err != nil {
		t.Fatal(err)
	}
	s := buf.String()
	for _, want := range []string{"resourceLogs", "kindling", "hello", "app"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in %s", want, s)
		}
	}
}

func TestNilWriter(t *testing.T) {
	if err := WriteBatch(nil, Batch{}); err == nil {
		t.Fatal("expected err")
	}
}
