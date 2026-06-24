package exporters

import (
	"bytes"
	"strings"
	"testing"
)

func TestJSON(t *testing.T) {
	e, err := New("json")
	if err != nil {
		t.Fatal(err)
	}
	var buf bytes.Buffer
	_ = e.Header(&buf)
	_ = e.Write(&buf, Record{Body: "hi"})
	_ = e.Write(&buf, Record{Body: "there"})
	_ = e.Footer(&buf)
	if !strings.Contains(buf.String(), "hi") {
		t.Fatalf("got %s", buf.String())
	}
}

func TestCSV(t *testing.T) {
	e, _ := New("csv")
	var buf bytes.Buffer
	_ = e.Header(&buf)
	_ = e.Write(&buf, Record{Body: "msg", Labels: map[string]string{"app": "a"}})
	_ = e.Footer(&buf)
	out := buf.String()
	if !strings.Contains(out, "app") {
		t.Fatalf("got %q", out)
	}
}

func TestConsole(t *testing.T) {
	e, _ := New("console")
	var buf bytes.Buffer
	_ = e.Write(&buf, Record{Body: "x"})
	if !strings.Contains(buf.String(), "[info]") {
		t.Fatalf("got %q", buf.String())
	}
}

func TestUnknown(t *testing.T) {
	if _, err := New("nope"); err == nil {
		t.Fatal("expected err")
	}
}
