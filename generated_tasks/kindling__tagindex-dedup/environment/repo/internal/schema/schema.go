// Package schema declaratively validates the kindling environment.
package schema

import (
	"fmt"
	"strings"
)

// Field describes one env var.
type Field struct {
	Name        string
	Required    bool
	Description string
	Default     string
	Allowed     []string
}

// Schema returns the canonical kindling field schema.
func Schema() []Field {
	return []Field{
		{Name: "KINDLING_DATA_DIR", Description: "Manifest archive root.", Default: "~/.local/share/kindling"},
		{Name: "KINDLING_CACHE_DIR", Description: "Idempotent cache directory.", Default: "~/.cache/kindling"},
		{Name: "KINDLING_LOG_FORMAT", Description: "text or json.", Default: "text", Allowed: []string{"text", "json"}},
		{Name: "KINDLING_LOG_LEVEL", Description: "debug, info, warn, error.", Default: "info", Allowed: []string{"debug", "info", "warn", "error"}},
		{Name: "KINDLING_HTTP_BIND", Description: "host:port for /metrics.", Default: "(unset)"},
		{Name: "KINDLING_METRICS_BIND", Description: "host:port for /metrics.", Default: "(unset)"},
		{Name: "TZ", Description: "Time zone.", Default: "UTC"},
	}
}

// Finding is one validation outcome.
type Finding struct {
	Var      string
	Severity string
	Message  string
}

// Validate checks env against Schema().
func Validate(env func(string) string) []Finding {
	var out []Finding
	for _, f := range Schema() {
		v := env(f.Name)
		if v == "" {
			if f.Required {
				out = append(out, Finding{Var: f.Name, Severity: "error", Message: "required field is unset"})
			}
			continue
		}
		if len(f.Allowed) > 0 {
			matched := false
			for _, a := range f.Allowed {
				if strings.EqualFold(a, v) {
					matched = true
					break
				}
			}
			if !matched {
				out = append(out, Finding{
					Var: f.Name, Severity: "warn",
					Message: fmt.Sprintf("value %q not in allowed set; falling back to %q", v, f.Default),
				})
			}
		}
	}
	return out
}
