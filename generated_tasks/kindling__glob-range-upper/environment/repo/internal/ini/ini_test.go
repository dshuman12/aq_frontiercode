package ini_test

import (
	"reflect"
	"strings"
	"testing"

	"github.com/dleblanc/kindling/internal/ini"
)

func TestEmpty(t *testing.T) {
	doc, err := ini.Parse("")
	if err != nil {
		t.Fatal(err)
	}
	if len(doc[""]) != 0 {
		t.Errorf("got %v", doc)
	}
}

func TestTopLevelKeys(t *testing.T) {
	doc, _ := ini.Parse("a = 1\nb = 2\n")
	if doc[""]["a"] != "1" || doc[""]["b"] != "2" {
		t.Errorf("got %v", doc)
	}
}

func TestSection(t *testing.T) {
	doc, _ := ini.Parse("[server]\nbind = 0.0.0.0\n")
	if doc["server"]["bind"] != "0.0.0.0" {
		t.Errorf("got %v", doc)
	}
}

func TestComments(t *testing.T) {
	doc, _ := ini.Parse("# top\n; also\na = 1\n")
	if doc[""]["a"] != "1" {
		t.Errorf("got %v", doc)
	}
}

func TestMalformedRejected(t *testing.T) {
	if _, err := ini.Parse("not an assignment\n"); err == nil {
		t.Error("expected error")
	}
}

func TestRender(t *testing.T) {
	doc := ini.Doc{"": {"a": "1"}, "server": {"bind": "127.0.0.1"}}
	out := ini.Render(doc)
	if !strings.Contains(out, "a = 1") {
		t.Errorf("missing top: %q", out)
	}
	if !strings.Contains(out, "[server]") {
		t.Errorf("missing section: %q", out)
	}
}

func TestRoundTrip(t *testing.T) {
	src := "a = 1\nb = 2\n\n[s]\nx = y\n"
	doc, _ := ini.Parse(src)
	rendered := ini.Render(doc)
	doc2, _ := ini.Parse(rendered)
	if !reflect.DeepEqual(doc, doc2) {
		t.Errorf("round-trip differs: %v != %v", doc, doc2)
	}
}
