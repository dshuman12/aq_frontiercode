package traceview

import (
	"strings"
	"testing"
	"time"
)

func makeTrace() *Trace {
	t0 := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	return &Trace{Spans: []Span{
		{ID: "1", Name: "root", Start: t0, End: t0.Add(100 * time.Millisecond)},
		{ID: "2", ParentID: "1", Name: "child-a", Start: t0.Add(10 * time.Millisecond), End: t0.Add(40 * time.Millisecond)},
		{ID: "3", ParentID: "1", Name: "child-b", Start: t0.Add(50 * time.Millisecond), End: t0.Add(90 * time.Millisecond)},
		{ID: "4", ParentID: "2", Name: "grand", Start: t0.Add(20 * time.Millisecond), End: t0.Add(35 * time.Millisecond)},
	}}
}

func TestRender(t *testing.T) {
	out := makeTrace().Render()
	if !strings.Contains(out, "root") || !strings.Contains(out, "grand") {
		t.Fatalf("got %s", out)
	}
}

func TestDuration(t *testing.T) {
	d := makeTrace().Duration()
	if d != 100*time.Millisecond {
		t.Fatalf("got %v", d)
	}
}

func TestCritical(t *testing.T) {
	path := makeTrace().Critical()
	if len(path) < 2 || path[0] != "root" {
		t.Fatalf("path %v", path)
	}
}

func TestEmptyTrace(t *testing.T) {
	tr := &Trace{}
	if tr.Duration() != 0 {
		t.Fatal("expected zero duration")
	}
	if tr.Render() != "" {
		t.Fatal("expected empty render")
	}
}
