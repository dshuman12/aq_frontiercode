// Package config validates kindling environment variables.
package config

import (
	"fmt"
	"os"
	"strings"
)

// Config is the materialized configuration.
type Config struct {
	DataDir     string
	CacheDir    string
	LogLevel    string
	LogFormat   string
	HTTPBind    string
	MetricsBind string
	Timezone    string
}

// FromEnv reads kindling env vars and returns a Config.
func FromEnv(env func(string) string) (*Config, error) {
	if env == nil {
		env = os.Getenv
	}
	c := &Config{
		DataDir:     orDef(env("KINDLING_DATA_DIR"), defaultDataDir(env)),
		CacheDir:    orDef(env("KINDLING_CACHE_DIR"), defaultCacheDir(env)),
		LogLevel:    orDef(env("KINDLING_LOG_LEVEL"), "info"),
		LogFormat:   orDef(env("KINDLING_LOG_FORMAT"), "text"),
		HTTPBind:    env("KINDLING_HTTP_BIND"),
		MetricsBind: env("KINDLING_METRICS_BIND"),
		Timezone:    orDef(env("TZ"), "UTC"),
	}
	if c.HTTPBind != "" {
		if err := validateBind(c.HTTPBind, "KINDLING_HTTP_BIND"); err != nil {
			return nil, err
		}
	}
	if c.MetricsBind != "" {
		if err := validateBind(c.MetricsBind, "KINDLING_METRICS_BIND"); err != nil {
			return nil, err
		}
	}
	return c, nil
}

// Severity is the severity of one finding.
type Severity int

const (
	SevInfo Severity = iota
	SevWarn
	SevError
)

// String renders Severity as a tag.
func (s Severity) String() string {
	switch s {
	case SevError:
		return "ERROR"
	case SevWarn:
		return " WARN"
	default:
		return " INFO"
	}
}

// Finding is one validation outcome.
type Finding struct {
	Severity Severity
	Var      string
	Message  string
}

// Check returns the findings for a snapshot of env vars.
func Check(env func(string) string) []Finding {
	if env == nil {
		env = os.Getenv
	}
	var out []Finding
	if v := env("KINDLING_LOG_LEVEL"); v != "" && !validLevel(v) {
		out = append(out, Finding{Severity: SevWarn, Var: "KINDLING_LOG_LEVEL",
			Message: fmt.Sprintf("unknown level %q, falling back to 'info'", v)})
	}
	if v := env("KINDLING_LOG_FORMAT"); v != "" && !validFormat(v) {
		out = append(out, Finding{Severity: SevWarn, Var: "KINDLING_LOG_FORMAT",
			Message: fmt.Sprintf("unknown format %q, falling back to 'text'", v)})
	}
	if v := env("KINDLING_HTTP_BIND"); v != "" {
		if err := validateBind(v, "KINDLING_HTTP_BIND"); err != nil {
			out = append(out, Finding{Severity: SevError, Var: "KINDLING_HTTP_BIND", Message: err.Error()})
		}
	}
	if v := env("KINDLING_METRICS_BIND"); v != "" {
		if err := validateBind(v, "KINDLING_METRICS_BIND"); err != nil {
			out = append(out, Finding{Severity: SevError, Var: "KINDLING_METRICS_BIND", Message: err.Error()})
		}
	}
	return out
}

// Format renders findings in a human-readable form.
func Format(findings []Finding) string {
	if len(findings) == 0 {
		return "configuration: OK\n"
	}
	var sb strings.Builder
	any := false
	for _, f := range findings {
		if f.Severity == SevError {
			any = true
		}
		fmt.Fprintf(&sb, "%s %s: %s\n", f.Severity.String(), f.Var, f.Message)
	}
	if any {
		sb.WriteString("configuration: FAIL\n")
	} else {
		sb.WriteString("configuration: OK (with warnings)\n")
	}
	return sb.String()
}

func orDef(v, def string) string {
	if v == "" {
		return def
	}
	return v
}

func defaultDataDir(env func(string) string) string {
	if v := env("XDG_DATA_HOME"); v != "" {
		return v + "/kindling"
	}
	if v := env("HOME"); v != "" {
		return v + "/.local/share/kindling"
	}
	return "/var/lib/kindling"
}

func defaultCacheDir(env func(string) string) string {
	if v := env("XDG_CACHE_HOME"); v != "" {
		return v + "/kindling"
	}
	if v := env("HOME"); v != "" {
		return v + "/.cache/kindling"
	}
	return "/var/cache/kindling"
}

func validLevel(s string) bool {
	switch strings.ToLower(s) {
	case "debug", "info", "warn", "error":
		return true
	}
	return false
}

func validFormat(s string) bool {
	switch strings.ToLower(s) {
	case "text", "json":
		return true
	}
	return false
}

func validateBind(v, name string) error {
	idx := strings.LastIndex(v, ":")
	if idx <= 0 {
		return fmt.Errorf("%s: expected host:port, got %q", name, v)
	}
	port := v[idx+1:]
	var n int
	if _, err := fmt.Sscanf(port, "%d", &n); err != nil {
		return fmt.Errorf("%s: invalid port %q", name, port)
	}
	if n < 1 || n > 65535 {
		return fmt.Errorf("%s: port %d out of range", name, n)
	}
	return nil
}
