package yaml_test

import (
	"strings"
	"testing"

	"github.com/dleblanc/kindling/internal/group"
	"github.com/dleblanc/kindling/internal/render/yaml"
)

func TestMapSorted(t *testing.T) {
	got := yaml.Map(map[string]string{"b": "2", "a": "1"})
	want := "a: 1\nb: 2\n"
	if got != want {
		t.Errorf("got %q want %q", got, want)
	}
}

func TestQuotesSpaces(t *testing.T) {
	got := yaml.Map(map[string]string{"x": "a b"})
	if !strings.Contains(got, "'a b'") {
		t.Errorf("got %q", got)
	}
}

func TestQuotesEmpty(t *testing.T) {
	got := yaml.Map(map[string]string{"x": ""})
	if !strings.Contains(got, "''") {
		t.Errorf("got %q", got)
	}
}

func TestRecords(t *testing.T) {
	items := []map[string]string{{"a": "1"}, {"a": "2"}}
	out := yaml.Records(items)
	if strings.Count(out, "- ") < 2 {
		t.Errorf("got %q", out)
	}
}

func TestGroups(t *testing.T) {
	out := yaml.Groups([]group.Bucket{{Key: "auth", Count: 5}})
	if !strings.Contains(out, "key: auth") {
		t.Error("missing key")
	}
}
