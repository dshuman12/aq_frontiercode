package schema_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/schema"
)

func envOf(m map[string]string) func(string) string {
	return func(k string) string { return m[k] }
}

func TestSchemaIncludesKnownFields(t *testing.T) {
	names := map[string]bool{}
	for _, f := range schema.Schema() {
		names[f.Name] = true
	}
	for _, n := range []string{"KINDLING_DATA_DIR", "KINDLING_LOG_FORMAT"} {
		if !names[n] {
			t.Errorf("missing %s", n)
		}
	}
}

func TestEmptyEnvNoFindings(t *testing.T) {
	if got := schema.Validate(envOf(nil)); len(got) != 0 {
		t.Errorf("got %v", got)
	}
}

func TestUnknownLogFormat(t *testing.T) {
	got := schema.Validate(envOf(map[string]string{"KINDLING_LOG_FORMAT": "logfmt"}))
	if len(got) != 1 || got[0].Severity != "warn" {
		t.Errorf("got %v", got)
	}
}

func TestUnknownLogLevel(t *testing.T) {
	got := schema.Validate(envOf(map[string]string{"KINDLING_LOG_LEVEL": "trace"}))
	if len(got) != 1 || got[0].Severity != "warn" {
		t.Errorf("got %v", got)
	}
}

func TestKnownFormatPasses(t *testing.T) {
	got := schema.Validate(envOf(map[string]string{"KINDLING_LOG_FORMAT": "JSON"}))
	if len(got) != 0 {
		t.Errorf("got %v", got)
	}
}

func TestUnchangedFieldsLeftAlone(t *testing.T) {
	got := schema.Validate(envOf(map[string]string{"KINDLING_DATA_DIR": "/srv/kindling"}))
	if len(got) != 0 {
		t.Errorf("got %v", got)
	}
}
