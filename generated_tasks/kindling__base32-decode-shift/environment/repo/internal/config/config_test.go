package config_test

import (
	"strings"
	"testing"

	"github.com/dleblanc/kindling/internal/config"
)

func envOf(m map[string]string) func(string) string {
	return func(k string) string { return m[k] }
}

func TestFromEnvDefaults(t *testing.T) {
	c, err := config.FromEnv(envOf(map[string]string{}))
	if err != nil {
		t.Fatal(err)
	}
	if c.LogLevel != "info" || c.LogFormat != "text" || c.Timezone != "UTC" {
		t.Errorf("got %+v", c)
	}
}

func TestFromEnvOverrides(t *testing.T) {
	c, err := config.FromEnv(envOf(map[string]string{
		"KINDLING_LOG_LEVEL":  "debug",
		"KINDLING_LOG_FORMAT": "json",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if c.LogLevel != "debug" || c.LogFormat != "json" {
		t.Errorf("got %+v", c)
	}
}

func TestFromEnvBadBind(t *testing.T) {
	_, err := config.FromEnv(envOf(map[string]string{
		"KINDLING_HTTP_BIND": "no-port",
	}))
	if err == nil {
		t.Error("expected error")
	}
}

func TestCheckEmpty(t *testing.T) {
	f := config.Check(envOf(map[string]string{}))
	if len(f) != 0 {
		t.Errorf("got %v", f)
	}
}

func TestCheckUnknownLevel(t *testing.T) {
	f := config.Check(envOf(map[string]string{"KINDLING_LOG_LEVEL": "trace"}))
	if len(f) != 1 || f[0].Severity != config.SevWarn {
		t.Errorf("got %v", f)
	}
}

func TestCheckUnknownFormat(t *testing.T) {
	f := config.Check(envOf(map[string]string{"KINDLING_LOG_FORMAT": "logfmt"}))
	if len(f) != 1 || f[0].Severity != config.SevWarn {
		t.Errorf("got %v", f)
	}
}

func TestCheckBadBind(t *testing.T) {
	f := config.Check(envOf(map[string]string{"KINDLING_HTTP_BIND": "host"}))
	if len(f) != 1 || f[0].Severity != config.SevError {
		t.Errorf("got %v", f)
	}
}

func TestFormatClean(t *testing.T) {
	out := config.Format(nil)
	if !strings.Contains(out, "OK") {
		t.Errorf("got %q", out)
	}
}

func TestFormatFail(t *testing.T) {
	out := config.Format([]config.Finding{
		{Severity: config.SevError, Var: "X", Message: "bad"},
	})
	if !strings.Contains(out, "FAIL") {
		t.Errorf("got %q", out)
	}
	if !strings.Contains(out, "ERROR X") {
		t.Errorf("got %q", out)
	}
}

func TestFormatWarnOnly(t *testing.T) {
	out := config.Format([]config.Finding{
		{Severity: config.SevWarn, Var: "X", Message: "iffy"},
	})
	if !strings.Contains(out, "OK (with warnings)") {
		t.Errorf("got %q", out)
	}
}

func TestSeverityStrings(t *testing.T) {
	if config.SevError.String() != "ERROR" {
		t.Errorf("got %q", config.SevError.String())
	}
}

func TestXdgDataHome(t *testing.T) {
	c, _ := config.FromEnv(envOf(map[string]string{"XDG_DATA_HOME": "/tmp/xdg"}))
	if c.DataDir != "/tmp/xdg/kindling" {
		t.Errorf("got %q", c.DataDir)
	}
}
