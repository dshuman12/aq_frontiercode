package html_test

import (
	"strings"
	"testing"
	"time"

	"github.com/dleblanc/kindling/internal/group"
	"github.com/dleblanc/kindling/internal/record"
	"github.com/dleblanc/kindling/internal/render/html"
)

func TestEscape(t *testing.T) {
	cases := map[string]string{
		"<a>":  "&lt;a&gt;",
		"&amp": "&amp;amp",
		`"x"`:  "&quot;x&quot;",
	}
	for in, want := range cases {
		if got := html.EscapeText(in); got != want {
			t.Errorf("got %q want %q", got, want)
		}
	}
}

func TestDocument(t *testing.T) {
	out := html.Document("kindling", "<h1>hi</h1>")
	if !strings.HasPrefix(out, "<!doctype html>") {
		t.Error("missing doctype")
	}
	if !strings.Contains(out, "<title>kindling</title>") {
		t.Error("missing title")
	}
}

func TestRecordsTable(t *testing.T) {
	recs := []*record.Record{
		{Timestamp: time.Now(), Level: "info", Service: "auth", Message: "ok"},
	}
	got := html.Records(recs)
	if !strings.Contains(got, "<table>") {
		t.Error("no table")
	}
	if !strings.Contains(got, "<td>info</td>") {
		t.Error("no level")
	}
}

func TestGroupsTable(t *testing.T) {
	got := html.Groups([]group.Bucket{{Key: "auth", Count: 5}})
	if !strings.Contains(got, "auth") {
		t.Error("missing key")
	}
	if !strings.Contains(got, "5") {
		t.Error("missing count")
	}
}
